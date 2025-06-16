<template>
  <div class="certificates-container">
    <a-card title="证书管理" :bordered="false">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="showCreateModal = true">
            <template #icon>
              <plus-outlined />
            </template>
            申请证书
          </a-button>
          <a-button @click="refreshData">
            <template #icon>
              <reload-outlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </template>

      <!-- 搜索和筛选 -->
      <div class="search-section">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="8">
            <a-input
              v-model:value="searchForm.keyword"
              placeholder="搜索域名或颁发者"
              @press-enter="handleSearch"
            >
              <template #prefix>
                <search-outlined />
              </template>
            </a-input>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-select
              v-model:value="searchForm.status"
              placeholder="选择状态"
              allow-clear
              @change="handleSearch"
            >
              <a-select-option value="issued">已签发</a-select-option>
              <a-select-option value="pending">待处理</a-select-option>
              <a-select-option value="expired">已过期</a-select-option>
              <a-select-option value="error">错误</a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-button type="primary" @click="handleSearch">搜索</a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 证书列表 -->
      <a-table
        :columns="columns"
        :data-source="certificates"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
        row-key="id"
        :locale="{ emptyText: '' }"
      >
        <template #emptyText>
          <EmptyState
            type="certificates"
            :action-button="{
              text: '申请证书',
              type: 'primary',
              handler: () => showCreateModal = true
            }"
          />
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'domain'">
            <router-link :to="`/certificates/${record.id}`" class="domain-link">
              {{ record.domain }}
            </router-link>
            <div v-if="record.alt_domains" class="alt-domains">
              <a-tag v-for="domain in record.alt_domains.split(',')" :key="domain" size="small">
                {{ domain.trim() }}
              </a-tag>
            </div>
          </template>
          
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'days_remaining'">
            <span :class="getDaysRemainingClass(record.days_remaining)">
              {{ record.days_remaining }}天
            </span>
          </template>
          
          <template v-if="column.key === 'actions'">
            <a-space>
              <router-link :to="`/certificates/${record.id}`">
                <a-button type="link" size="small">
                  查看详情
                </a-button>
              </router-link>
              <a-button type="link" size="small" @click="renewCertificate(record)">
                续期
              </a-button>
              <a-button type="link" size="small" @click="downloadCertificate(record)">
                下载
              </a-button>
              <a-popconfirm
                title="确定要删除这个证书吗？"
                @confirm="deleteCertificate(record)"
              >
                <a-button type="link" size="small" danger>
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 申请证书对话框 -->
    <a-modal
      v-model:open="showCreateModal"
      title="申请新证书"
      @ok="handleCreateCertificate"
      @cancel="showCreateModal = false"
      :confirm-loading="createLoading"
      width="600px"
    >
      <a-form
        :model="createForm"
        :rules="createRules"
        layout="vertical"
        ref="createFormRef"
      >
        <a-form-item label="主域名" name="domain">
          <a-input
            v-model:value="createForm.domain"
            placeholder="例如：example.com"
          />
        </a-form-item>

        <a-form-item label="备用域名" name="alt_domains">
          <a-select
            v-model:value="createForm.alt_domains"
            mode="tags"
            placeholder="例如：www.example.com, api.example.com"
            :token-separators="[',', ' ']"
          />
        </a-form-item>

        <a-form-item label="加密类型" name="encryption_type">
          <a-radio-group v-model:value="createForm.encryption_type">
            <a-radio value="ECC">ECC (推荐)</a-radio>
            <a-radio value="RSA">RSA</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="自动续期" name="auto_renew">
          <a-switch v-model:checked="createForm.auto_renew" />
          <div class="form-help">
            开启后，证书将在到期前30天自动续期
          </div>
        </a-form-item>

        <a-form-item label="备注" name="note">
          <a-textarea
            v-model:value="createForm.note"
            placeholder="可选的备注信息"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { ApiService } from '@/services/api'
import { notify } from '@/utils/notification'
import EmptyState from '@/components/EmptyState.vue'

// 响应式数据
const loading = ref(false)
const createLoading = ref(false)
const showCreateModal = ref(false)
const certificates = ref([])
const createFormRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: undefined
})

// 创建表单
const createForm = reactive({
  domain: '',
  alt_domains: [],
  encryption_type: 'ECC',
  auto_renew: true,
  note: ''
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`
})

// 表格列定义
const columns = [
  {
    title: '域名',
    dataIndex: 'domain',
    key: 'domain'
  },
  {
    title: '颁发者',
    dataIndex: 'issuer',
    key: 'issuer'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: '剩余天数',
    dataIndex: 'days_remaining',
    key: 'days_remaining',
    sorter: true
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    sorter: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 200
  }
]

// 创建表单验证规则
const createRules = {
  domain: [
    { required: true, message: '请输入主域名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, message: '请输入有效的域名', trigger: 'blur' }
  ],
  encryption_type: [
    { required: true, message: '请选择加密类型', trigger: 'change' }
  ]
}

// 工具函数
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'issued': 'green',
    'pending': 'blue',
    'expired': 'red',
    'error': 'red',
    'revoked': 'orange'
  }
  return colors[status] || 'default'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'issued': '已签发',
    'pending': '待处理',
    'expired': '已过期',
    'error': '错误',
    'revoked': '已撤销'
  }
  return texts[status] || status
}

const getDaysRemainingClass = (days: number) => {
  if (days <= 0) return 'text-danger'
  if (days <= 7) return 'text-warning'
  if (days <= 30) return 'text-info'
  return 'text-success'
}

// 数据加载
const loadCertificates = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchForm.keyword || undefined,
      status: searchForm.status || undefined
    }

    const response = await ApiService.get('/certificates', { params })
    
    if (response.success) {
      certificates.value = response.data.items || []
      pagination.total = response.data.total || 0
    }
  } catch (error: any) {
    message.error('加载证书列表失败')
  } finally {
    loading.value = false
  }
}

// 事件处理
const handleSearch = () => {
  pagination.current = 1
  loadCertificates()
}

const handleTableChange = (pag: any, filters: any, sorter: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadCertificates()
}

const refreshData = () => {
  loadCertificates()
  message.success('数据已刷新')
}

// viewCertificate 函数已移除，现在使用 router-link 直接跳转

const renewCertificate = async (certificate: any) => {
  try {
    await ApiService.post(`/certificates/${certificate.id}/renew`)
    message.success('证书续期请求已提交')
    loadCertificates()
  } catch (error: any) {
    message.error('证书续期失败')
  }
}

const downloadCertificate = async (certificate: any) => {
  try {
    await ApiService.download(`/certificates/${certificate.id}/download`, `${certificate.domain}.zip`)
    message.success('证书下载成功')
  } catch (error: any) {
    message.error('证书下载失败')
  }
}

const deleteCertificate = async (certificate: any) => {
  try {
    await ApiService.delete(`/certificates/${certificate.id}`)
    message.success('证书删除成功')
    loadCertificates()
  } catch (error: any) {
    message.error('证书删除失败')
  }
}

const handleCreateCertificate = async () => {
  try {
    await createFormRef.value.validate()
    createLoading.value = true
    
    await ApiService.post('/certificates', createForm)
    message.success('证书申请已提交')
    showCreateModal.value = false
    
    // 重置表单
    Object.assign(createForm, {
      domain: '',
      alt_domains: [],
      encryption_type: 'ECC',
      auto_renew: true,
      note: ''
    })
    
    loadCertificates()
  } catch (error: any) {
    message.error('证书申请失败')
  } finally {
    createLoading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadCertificates()
})
</script>

<style scoped>
.certificates-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.search-section {
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 6px;
}

.alt-domains {
  margin-top: 4px;
}

.domain-link {
  color: #1890ff;
  text-decoration: none;
  font-weight: 500;
}

.domain-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.form-help {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}

.text-danger {
  color: #ff4d4f;
  font-weight: bold;
}

.text-warning {
  color: #faad14;
  font-weight: bold;
}

.text-info {
  color: #1890ff;
}

.text-success {
  color: #52c41a;
}
</style>
