<template>
  <div class="home-container">
    <!-- 概览卡片 -->
    <a-row :gutter="[16, 16]" class="overview-cards">
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="证书总数"
            :value="stats.totalCertificates"
            :prefix="h(SafetyCertificateOutlined, { style: { color: '#1890ff' } })"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="即将过期"
            :value="stats.expiringSoon"
            :prefix="h(ExclamationCircleOutlined, { style: { color: '#faad14' } })"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="已过期"
            :value="stats.expired"
            :prefix="h(CloseCircleOutlined, { style: { color: '#ff4d4f' } })"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="在线服务器"
            :value="stats.onlineServers"
            :prefix="h(CloudServerOutlined, { style: { color: '#52c41a' } })"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 快速操作 -->
    <a-card title="快速操作" class="quick-actions">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="8">
          <a-button type="primary" size="large" block @click="$router.push('/certificates/new')">
            <template #icon>
              <plus-outlined />
            </template>
            申请新证书
          </a-button>
        </a-col>
        
        <a-col :xs="24" :sm="12" :md="8">
          <a-button size="large" block @click="$router.push('/servers/new')">
            <template #icon>
              <cloud-server-outlined />
            </template>
            添加服务器
          </a-button>
        </a-col>
        
        <a-col :xs="24" :sm="12" :md="8">
          <a-button size="large" block @click="refreshData">
            <template #icon>
              <reload-outlined />
            </template>
            刷新数据
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- 最近证书 -->
    <a-card title="最近证书" class="recent-certificates">
      <a-table
        :columns="certificateColumns"
        :data-source="recentCertificates"
        :pagination="false"
        :loading="loading"
        size="small"
      >
        <template #bodyCell="{ column, record }">
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
              <a-button type="link" size="small" @click="viewCertificate(record)">
                查看
              </a-button>
              <a-button type="link" size="small" @click="renewCertificate(record)">
                续期
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      
      <div class="table-footer">
        <a-button type="link" @click="$router.push('/certificates')">
          查看所有证书 →
        </a-button>
      </div>
    </a-card>

    <!-- 数据统计 -->
    <DataStatistics class="statistics-section" />

    <!-- 系统状态 -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :md="12">
        <a-card title="证书状态分布" class="chart-card">
          <div class="chart-placeholder">
            <RealTimeChart
              title="证书健康度"
              type="certificates"
              :auto-refresh="true"
            />
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="12">
        <a-card title="服务器状态" class="server-status">
          <a-list
            :data-source="recentServers"
            :loading="loading"
            size="small"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <span>{{ item.hostname }}</span>
                    <a-tag :color="item.status === 'online' ? 'green' : 'red'" class="status-tag">
                      {{ item.status === 'online' ? '在线' : '离线' }}
                    </a-tag>
                  </template>
                  <template #description>
                    {{ item.ip_address }} | {{ item.os_type }}
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>

          <div class="table-footer">
            <a-button type="link" @click="$router.push('/servers')">
              查看所有服务器 →
            </a-button>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { ApiService } from '@/services/api'
import { notify } from '@/utils/notification'
import DataStatistics from '@/components/DataStatistics.vue'
import RealTimeChart from '@/components/RealTimeChart.vue'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const stats = reactive({
  totalCertificates: 0,
  expiringSoon: 0,
  expired: 0,
  onlineServers: 0
})

const recentCertificates = ref([])
const recentServers = ref([])

// 证书表格列定义
const certificateColumns = [
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
    key: 'days_remaining'
  },
  {
    title: '操作',
    key: 'actions'
  }
]

// 获取状态颜色
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

// 获取状态文本
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

// 获取剩余天数样式类
const getDaysRemainingClass = (days: number) => {
  if (days <= 0) return 'text-danger'
  if (days <= 7) return 'text-warning'
  if (days <= 30) return 'text-info'
  return 'text-success'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 并行加载所有数据
    const [statsRes, certificatesRes, serversRes] = await Promise.all([
      ApiService.get('/monitors/stats'),
      ApiService.get('/certificates?limit=5'),
      ApiService.get('/servers?limit=5')
    ])

    // 更新统计数据
    if (statsRes.success) {
      Object.assign(stats, statsRes.data)
    }

    // 更新最近证书
    if (certificatesRes.success) {
      recentCertificates.value = certificatesRes.data.certificates || certificatesRes.data.items || []
    }

    // 更新最近服务器
    if (serversRes.success) {
      recentServers.value = serversRes.data.servers || serversRes.data.items || []
    }
  } catch (error: any) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
  message.success('数据已刷新')
}

// 查看证书详情
const viewCertificate = (certificate: any) => {
  router.push(`/certificates/${certificate.id}`)
}

// 续期证书
const renewCertificate = async (certificate: any) => {
  try {
    await ApiService.post(`/certificates/${certificate.id}/renew`)
    message.success('证书续期请求已提交')
    loadData() // 重新加载数据
  } catch (error: any) {
    message.error('证书续期失败')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.overview-cards {
  margin-bottom: 24px;
}

.quick-actions {
  margin-bottom: 24px;
}

.recent-certificates {
  margin-bottom: 24px;
}

.statistics-section {
  margin-bottom: 24px;
}

.chart-card {
  height: 400px;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.server-status {
  height: 400px;
}

.status-tag {
  margin-left: 8px;
}

.table-footer {
  text-align: right;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
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
