<template>
  <div class="monitors-container">
    <!-- 监控概览 -->
    <a-row :gutter="[16, 16]" class="overview-section">
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="总证书数"
            :value="overview.totalCertificates"
            :prefix="h(SafetyCertificateOutlined, { style: { color: '#1890ff' } })"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="即将过期"
            :value="overview.expiringSoon"
            :prefix="h(ExclamationCircleOutlined, { style: { color: '#faad14' } })"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="已过期"
            :value="overview.expired"
            :prefix="h(CloseCircleOutlined, { style: { color: '#ff4d4f' } })"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card>
          <a-statistic
            title="健康证书"
            :value="overview.healthy"
            :prefix="h(CheckCircleOutlined, { style: { color: '#52c41a' } })"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 即将过期的证书 -->
    <a-card title="即将过期的证书" class="expiring-section">
      <template #extra>
        <a-space>
          <a-button @click="refreshExpiring">
            <template #icon>
              <reload-outlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="expiringColumns"
        :data-source="expiringCertificates"
        :pagination="false"
        :loading="expiringLoading"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'domain'">
            <a @click="viewCertificate(record)">{{ record.domain }}</a>
          </template>
          
          <template v-if="column.key === 'days_remaining'">
            <a-tag :color="getDaysRemainingColor(record.days_remaining)">
              {{ record.days_remaining }}天
            </a-tag>
          </template>
          
          <template v-if="column.key === 'auto_renew'">
            <a-tag :color="record.auto_renew ? 'green' : 'orange'">
              {{ record.auto_renew ? '已启用' : '未启用' }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="renewCertificate(record)">
                立即续期
              </a-button>
              <a-button type="link" size="small" @click="viewCertificate(record)">
                查看详情
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 服务器状态监控 -->
    <a-card title="服务器状态监控" class="servers-section">
      <template #extra>
        <a-space>
          <a-button @click="refreshServers">
            <template #icon>
              <reload-outlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </template>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="8" v-for="server in serverStatus" :key="server.id">
          <a-card size="small" :class="getServerCardClass(server.status)">
            <template #title>
              <a-space>
                <a-badge :status="getServerBadgeStatus(server.status)" />
                {{ server.hostname }}
              </a-space>
            </template>
            
            <div class="server-details">
              <p><strong>IP:</strong> {{ server.ip_address }}</p>
              <p><strong>系统:</strong> {{ server.os_type }} {{ server.os_version }}</p>
              <p><strong>Web服务器:</strong> {{ server.web_server }}</p>
              <p><strong>最后心跳:</strong> 
                <span v-if="server.last_heartbeat">
                  {{ formatTime(server.last_heartbeat) }}
                </span>
                <span v-else class="text-muted">从未</span>
              </p>
              <p><strong>证书数量:</strong> {{ server.certificate_count || 0 }}</p>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <!-- 系统日志 -->
    <a-card title="系统日志" class="logs-section">
      <template #extra>
        <a-space>
          <a-select v-model:value="logLevel" @change="refreshLogs" style="width: 120px">
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="info">信息</a-select-option>
            <a-select-option value="warning">警告</a-select-option>
            <a-select-option value="error">错误</a-select-option>
          </a-select>
          <a-button @click="refreshLogs">
            <template #icon>
              <reload-outlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </template>

      <a-list
        :data-source="systemLogs"
        :loading="logsLoading"
        size="small"
        class="logs-list"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a-space>
                  <a-tag :color="getLogLevelColor(item.level)">{{ item.level }}</a-tag>
                  <span>{{ item.message }}</span>
                </a-space>
              </template>
              <template #description>
                {{ formatTime(item.timestamp) }} | {{ item.source }}
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import {
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { ApiService } from '@/services/api'

// 响应式数据
const expiringLoading = ref(false)
const serversLoading = ref(false)
const logsLoading = ref(false)
const logLevel = ref('')

const overview = reactive({
  totalCertificates: 0,
  expiringSoon: 0,
  expired: 0,
  healthy: 0
})

const expiringCertificates = ref([])
const serverStatus = ref([])
const systemLogs = ref([])

// 即将过期证书表格列
const expiringColumns = [
  {
    title: '域名',
    dataIndex: 'domain',
    key: 'domain'
  },
  {
    title: '剩余天数',
    dataIndex: 'days_remaining',
    key: 'days_remaining',
    sorter: (a: any, b: any) => a.days_remaining - b.days_remaining
  },
  {
    title: '过期时间',
    dataIndex: 'valid_to',
    key: 'valid_to'
  },
  {
    title: '自动续期',
    dataIndex: 'auto_renew',
    key: 'auto_renew'
  },
  {
    title: '操作',
    key: 'actions',
    width: 200
  }
]

// 工具函数
const getDaysRemainingColor = (days: number) => {
  if (days <= 0) return 'red'
  if (days <= 7) return 'orange'
  if (days <= 30) return 'yellow'
  return 'green'
}

const getServerBadgeStatus = (status: string) => {
  const badges: Record<string, string> = {
    'online': 'success',
    'offline': 'default',
    'error': 'error'
  }
  return badges[status] || 'default'
}

const getServerCardClass = (status: string) => {
  const classes: Record<string, string> = {
    'online': 'server-card-online',
    'offline': 'server-card-offline',
    'error': 'server-card-error'
  }
  return classes[status] || ''
}

const getLogLevelColor = (level: string) => {
  const colors: Record<string, string> = {
    'info': 'blue',
    'warning': 'orange',
    'error': 'red',
    'success': 'green'
  }
  return colors[level] || 'default'
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 数据加载函数
const loadOverview = async () => {
  try {
    const response = await ApiService.get('/monitors/overview')
    if (response.success) {
      Object.assign(overview, response.data)
    }
  } catch (error: any) {
    console.error('加载概览数据失败:', error)
  }
}

const loadExpiringCertificates = async () => {
  expiringLoading.value = true
  try {
    const response = await ApiService.get('/monitors/expiring')
    if (response.success) {
      expiringCertificates.value = response.data.items || []
    }
  } catch (error: any) {
    message.error('加载即将过期证书失败')
  } finally {
    expiringLoading.value = false
  }
}

const loadServerStatus = async () => {
  serversLoading.value = true
  try {
    const response = await ApiService.get('/monitors/servers')
    if (response.success) {
      serverStatus.value = response.data.items || []
    }
  } catch (error: any) {
    message.error('加载服务器状态失败')
  } finally {
    serversLoading.value = false
  }
}

const loadSystemLogs = async () => {
  logsLoading.value = true
  try {
    const params = logLevel.value ? { level: logLevel.value } : {}
    const response = await ApiService.get('/monitors/logs', { params })
    if (response.success) {
      systemLogs.value = response.data.items || []
    }
  } catch (error: any) {
    // 模拟日志数据
    systemLogs.value = [
      {
        level: 'info',
        message: '证书自动续期任务开始执行',
        timestamp: new Date().toISOString(),
        source: 'scheduler'
      },
      {
        level: 'success',
        message: '证书 example.com 续期成功',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        source: 'acme'
      },
      {
        level: 'warning',
        message: '服务器 web-01 心跳超时',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        source: 'monitor'
      }
    ]
  } finally {
    logsLoading.value = false
  }
}

// 事件处理
const refreshExpiring = () => {
  loadExpiringCertificates()
  message.success('即将过期证书列表已刷新')
}

const refreshServers = () => {
  loadServerStatus()
  message.success('服务器状态已刷新')
}

const refreshLogs = () => {
  loadSystemLogs()
  message.success('系统日志已刷新')
}

const viewCertificate = (certificate: any) => {
  message.info(`查看证书: ${certificate.domain}`)
}

const renewCertificate = async (certificate: any) => {
  try {
    await ApiService.post(`/certificates/${certificate.id}/renew`)
    message.success('证书续期请求已提交')
    loadExpiringCertificates()
    loadOverview()
  } catch (error: any) {
    message.error('证书续期失败')
  }
}

// 组件挂载时加载所有数据
onMounted(() => {
  loadOverview()
  loadExpiringCertificates()
  loadServerStatus()
  loadSystemLogs()
})
</script>

<style scoped>
.monitors-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.overview-section {
  margin-bottom: 24px;
}

.expiring-section {
  margin-bottom: 24px;
}

.servers-section {
  margin-bottom: 24px;
}

.logs-section {
  margin-bottom: 24px;
}

.server-details p {
  margin: 4px 0;
  font-size: 12px;
}

.server-card-online {
  border-left: 4px solid #52c41a;
}

.server-card-offline {
  border-left: 4px solid #d9d9d9;
}

.server-card-error {
  border-left: 4px solid #ff4d4f;
}

.logs-list {
  max-height: 400px;
  overflow-y: auto;
}

.text-muted {
  color: #666;
}
</style>
