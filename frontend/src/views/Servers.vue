<template>
  <div class="servers-container">
    <a-card title="服务器管理" :bordered="false">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="showCreateModal = true">
            <template #icon>
              <plus-outlined />
            </template>
            添加服务器
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
              placeholder="搜索主机名或IP地址"
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
              <a-select-option value="online">在线</a-select-option>
              <a-select-option value="offline">离线</a-select-option>
              <a-select-option value="error">错误</a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-button type="primary" @click="handleSearch">搜索</a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 服务器列表 -->
      <a-table
        :columns="columns"
        :data-source="servers"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'hostname'">
            <router-link :to="`/servers/${record.id}`" class="hostname-link">
              {{ record.hostname }}
            </router-link>
            <div class="server-info">
              <a-tag size="small">{{ record.ip_address }}</a-tag>
            </div>
          </template>
          
          <template v-if="column.key === 'status'">
            <a-badge
              :status="getStatusBadge(record.status)"
              :text="getStatusText(record.status)"
            />
          </template>
          
          <template v-if="column.key === 'system_info'">
            <div>
              <div>{{ record.os_type }} {{ record.os_version }}</div>
              <div class="text-muted">{{ record.web_server }} {{ record.web_server_version }}</div>
            </div>
          </template>
          
          <template v-if="column.key === 'auto_deploy'">
            <a-switch
              :checked="record.auto_deploy"
              @change="(checked) => toggleAutoDeploy(record, checked)"
              size="small"
            />
          </template>
          
          <template v-if="column.key === 'last_heartbeat'">
            <div v-if="record.last_heartbeat">
              {{ formatTime(record.last_heartbeat) }}
            </div>
            <span v-else class="text-muted">从未</span>
          </template>
          
          <template v-if="column.key === 'actions'">
            <a-space>
              <router-link :to="`/servers/${record.id}`">
                <a-button type="link" size="small">
                  查看详情
                </a-button>
              </router-link>
              <a-button type="link" size="small" @click="editServer(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个服务器吗？"
                @confirm="deleteServer(record)"
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

    <!-- 添加服务器对话框 -->
    <a-modal
      v-model:open="showCreateModal"
      title="添加服务器"
      @ok="handleCreateServer"
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
        <a-form-item label="主机名" name="hostname">
          <a-input
            v-model:value="createForm.hostname"
            placeholder="例如：web-server-01"
          />
        </a-form-item>

        <a-form-item label="IP地址" name="ip_address">
          <a-input
            v-model:value="createForm.ip_address"
            placeholder="例如：192.168.1.100"
          />
        </a-form-item>

        <a-form-item label="操作系统" name="os_type">
          <a-select v-model:value="createForm.os_type" placeholder="选择操作系统">
            <a-select-option value="Ubuntu">Ubuntu</a-select-option>
            <a-select-option value="CentOS">CentOS</a-select-option>
            <a-select-option value="Debian">Debian</a-select-option>
            <a-select-option value="RHEL">RHEL</a-select-option>
            <a-select-option value="Windows">Windows</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="系统版本" name="os_version">
          <a-input
            v-model:value="createForm.os_version"
            placeholder="例如：20.04 LTS"
          />
        </a-form-item>

        <a-form-item label="Web服务器" name="web_server">
          <a-select v-model:value="createForm.web_server" placeholder="选择Web服务器">
            <a-select-option value="Nginx">Nginx</a-select-option>
            <a-select-option value="Apache">Apache</a-select-option>
            <a-select-option value="IIS">IIS</a-select-option>
            <a-select-option value="Caddy">Caddy</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="服务器版本" name="web_server_version">
          <a-input
            v-model:value="createForm.web_server_version"
            placeholder="例如：1.20.1"
          />
        </a-form-item>

        <a-form-item label="自动部署" name="auto_deploy">
          <a-switch v-model:checked="createForm.auto_deploy" />
          <div class="form-help">
            开启后，新证书将自动部署到此服务器
          </div>
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

// 响应式数据
const loading = ref(false)
const createLoading = ref(false)
const showCreateModal = ref(false)
const servers = ref([])
const createFormRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: undefined
})

// 创建表单
const createForm = reactive({
  hostname: '',
  ip_address: '',
  os_type: '',
  os_version: '',
  web_server: '',
  web_server_version: '',
  auto_deploy: false
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
    title: '主机名',
    dataIndex: 'hostname',
    key: 'hostname'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: '系统信息',
    key: 'system_info'
  },
  {
    title: '自动部署',
    dataIndex: 'auto_deploy',
    key: 'auto_deploy'
  },
  {
    title: '最后心跳',
    dataIndex: 'last_heartbeat',
    key: 'last_heartbeat',
    sorter: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 180
  }
]

// 创建表单验证规则
const createRules = {
  hostname: [
    { required: true, message: '请输入主机名', trigger: 'blur' }
  ],
  ip_address: [
    { required: true, message: '请输入IP地址', trigger: 'blur' },
    { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: '请输入有效的IP地址', trigger: 'blur' }
  ],
  os_type: [
    { required: true, message: '请选择操作系统', trigger: 'change' }
  ],
  web_server: [
    { required: true, message: '请选择Web服务器', trigger: 'change' }
  ]
}

// 工具函数
const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    'online': 'success',
    'offline': 'default',
    'error': 'error'
  }
  return badges[status] || 'default'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'online': '在线',
    'offline': '离线',
    'error': '错误'
  }
  return texts[status] || status
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 数据加载
const loadServers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchForm.keyword || undefined,
      status: searchForm.status || undefined
    }

    const response = await ApiService.get('/servers', { params })
    
    if (response.success) {
      servers.value = response.data.items || []
      pagination.total = response.data.total || 0
    }
  } catch (error: any) {
    message.error('加载服务器列表失败')
  } finally {
    loading.value = false
  }
}

// 事件处理
const handleSearch = () => {
  pagination.current = 1
  loadServers()
}

const handleTableChange = (pag: any, filters: any, sorter: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadServers()
}

const refreshData = () => {
  loadServers()
  message.success('数据已刷新')
}

// viewServer 函数已移除，现在使用 router-link 直接跳转

const editServer = (server: any) => {
  message.info(`编辑服务器: ${server.hostname}`)
}

const toggleAutoDeploy = async (server: any, checked: boolean) => {
  try {
    await ApiService.put(`/servers/${server.id}`, { auto_deploy: checked })
    server.auto_deploy = checked
    message.success(`自动部署已${checked ? '开启' : '关闭'}`)
  } catch (error: any) {
    message.error('更新自动部署设置失败')
  }
}

const deleteServer = async (server: any) => {
  try {
    await ApiService.delete(`/servers/${server.id}`)
    message.success('服务器删除成功')
    loadServers()
  } catch (error: any) {
    message.error('服务器删除失败')
  }
}

const handleCreateServer = async () => {
  try {
    await createFormRef.value.validate()
    createLoading.value = true
    
    await ApiService.post('/servers', createForm)
    message.success('服务器添加成功')
    showCreateModal.value = false
    
    // 重置表单
    Object.assign(createForm, {
      hostname: '',
      ip_address: '',
      os_type: '',
      os_version: '',
      web_server: '',
      web_server_version: '',
      auto_deploy: false
    })
    
    loadServers()
  } catch (error: any) {
    message.error('服务器添加失败')
  } finally {
    createLoading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadServers()
})
</script>

<style scoped>
.servers-container {
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

.server-info {
  margin-top: 4px;
}

.hostname-link {
  color: #1890ff;
  text-decoration: none;
  font-weight: 500;
}

.hostname-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.text-muted {
  color: #666;
  font-size: 12px;
}

.form-help {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}
</style>
