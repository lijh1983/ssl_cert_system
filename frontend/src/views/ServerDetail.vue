<template>
  <div class="server-detail-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <a-row justify="space-between" align="middle">
        <a-col>
          <a-space>
            <a-button @click="goBack" type="text">
              <template #icon>
                <arrow-left-outlined />
              </template>
              返回
            </a-button>
            <a-divider type="vertical" />
            <h2 style="margin: 0">{{ server?.hostname || '服务器详情' }}</h2>
            <a-badge 
              v-if="server" 
              :status="getStatusBadge(server.status)" 
              :text="getStatusText(server.status)"
            />
          </a-space>
        </a-col>
        <a-col>
          <a-space>
            <a-button @click="refreshData">
              <template #icon>
                <reload-outlined />
              </template>
              刷新
            </a-button>
            <a-button type="primary" @click="testConnection" :loading="testLoading">
              <template #icon>
                <api-outlined />
              </template>
              测试连接
            </a-button>
            <a-dropdown>
              <a-button>
                更多操作
                <down-outlined />
              </a-button>
              <template #overlay>
                <a-menu @click="handleMenuClick">
                  <a-menu-item key="edit">
                    <edit-outlined />
                    编辑配置
                  </a-menu-item>
                  <a-menu-item key="deploy">
                    <cloud-upload-outlined />
                    部署证书
                  </a-menu-item>
                  <a-menu-item key="logs">
                    <file-text-outlined />
                    查看日志
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger>
                    <delete-outlined />
                    删除服务器
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large">
        <template #tip>加载服务器详情中...</template>
      </a-spin>
    </div>

    <!-- 服务器详情内容 -->
    <div v-else-if="server" class="server-content">
      <!-- 基本信息卡片 -->
      <a-card title="基本信息" class="info-card">
        <a-row :gutter="[24, 16]">
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>主机名</label>
              <div class="value">{{ server.hostname }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>IP地址</label>
              <div class="value">
                <a-tag color="blue">{{ server.ip_address }}</a-tag>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>服务器状态</label>
              <div class="value">
                <a-badge 
                  :status="getStatusBadge(server.status)" 
                  :text="getStatusText(server.status)"
                />
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>操作系统</label>
              <div class="value">{{ server.os_type }} {{ server.os_version }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>Web服务器</label>
              <div class="value">{{ server.web_server }} {{ server.web_server_version }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>自动部署</label>
              <div class="value">
                <a-switch 
                  :checked="server.auto_deploy" 
                  @change="toggleAutoDeploy"
                  :loading="autoDeployLoading"
                />
              </div>
            </div>
          </a-col>
        </a-row>
      </a-card>

      <!-- 连接信息卡片 -->
      <a-card title="连接信息" class="info-card">
        <a-row :gutter="[24, 16]">
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>最后心跳</label>
              <div class="value">
                <span v-if="server.last_heartbeat">
                  {{ formatDate(server.last_heartbeat) }}
                </span>
                <span v-else class="text-muted">从未</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>连接延迟</label>
              <div class="value">
                <span v-if="server.ping_latency" :class="getLatencyClass(server.ping_latency)">
                  {{ server.ping_latency }}ms
                </span>
                <span v-else class="text-muted">未知</span>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>创建时间</label>
              <div class="value">{{ formatDate(server.created_at) }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>更新时间</label>
              <div class="value">{{ formatDate(server.updated_at) }}</div>
            </div>
          </a-col>
        </a-row>

        <!-- 连接状态图表 -->
        <div class="connection-status">
          <h4>连接状态历史</h4>
          <div class="status-chart">
            <a-empty description="连接状态图表功能开发中" />
          </div>
        </div>
      </a-card>

      <!-- 证书信息卡片 -->
      <a-card title="部署的证书" class="info-card">
        <template #extra>
          <a-button type="link" @click="deployNewCertificate">
            <template #icon>
              <plus-outlined />
            </template>
            部署新证书
          </a-button>
        </template>

        <a-table
          :columns="certificateColumns"
          :data-source="serverCertificates"
          :pagination="false"
          :loading="certificatesLoading"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'domain'">
              <router-link :to="`/certificates/${record.id}`" class="domain-link">
                {{ record.domain }}
              </router-link>
            </template>
            
            <template v-if="column.key === 'status'">
              <a-tag :color="getCertStatusColor(record.status)">
                {{ getCertStatusText(record.status) }}
              </a-tag>
            </template>
            
            <template v-if="column.key === 'days_remaining'">
              <span :class="getDaysRemainingClass(record.days_remaining)">
                {{ record.days_remaining }}天
              </span>
            </template>
            
            <template v-if="column.key === 'actions'">
              <a-space>
                <a-button type="link" size="small" @click="redeployCertificate(record)">
                  重新部署
                </a-button>
                <a-button type="link" size="small" @click="removeCertificate(record)" danger>
                  移除
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- 系统信息卡片 -->
      <a-card title="系统信息" class="info-card">
        <a-row :gutter="[24, 16]">
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>CPU使用率</label>
              <div class="value">
                <a-progress 
                  :percent="server.cpu_usage || 0" 
                  size="small"
                  :status="getUsageStatus(server.cpu_usage)"
                />
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>内存使用率</label>
              <div class="value">
                <a-progress 
                  :percent="server.memory_usage || 0" 
                  size="small"
                  :status="getUsageStatus(server.memory_usage)"
                />
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>磁盘使用率</label>
              <div class="value">
                <a-progress 
                  :percent="server.disk_usage || 0" 
                  size="small"
                  :status="getUsageStatus(server.disk_usage)"
                />
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>系统负载</label>
              <div class="value">{{ server.load_average || '未知' }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>运行时间</label>
              <div class="value">{{ server.uptime || '未知' }}</div>
            </div>
          </a-col>
        </a-row>
      </a-card>

      <!-- 备注信息卡片 -->
      <a-card v-if="server.note" title="备注信息" class="info-card">
        <div class="note-content">{{ server.note }}</div>
      </a-card>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <a-result
        status="error"
        title="加载失败"
        :sub-title="error"
      >
        <template #extra>
          <a-button type="primary" @click="loadServer">重试</a-button>
        </template>
      </a-result>
    </div>

    <!-- 未找到服务器 -->
    <div v-else class="not-found-container">
      <a-result
        status="404"
        title="服务器不存在"
        sub-title="请检查服务器ID是否正确"
      >
        <template #extra>
          <a-button type="primary" @click="goBack">返回列表</a-button>
        </template>
      </a-result>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ApiOutlined,
  DownOutlined,
  EditOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import { ApiService } from '@/services/api'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const testLoading = ref(false)
const autoDeployLoading = ref(false)
const certificatesLoading = ref(false)
const server = ref<any>(null)
const serverCertificates = ref([])
const error = ref('')

// 获取服务器ID
const serverId = computed(() => route.params.id as string)

// 证书表格列定义
const certificateColumns = [
  {
    title: '域名',
    dataIndex: 'domain',
    key: 'domain'
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
    title: '部署时间',
    dataIndex: 'deployed_at',
    key: 'deployed_at'
  },
  {
    title: '操作',
    key: 'actions',
    width: 150
  }
]

// 工具函数
const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    'online': 'success',
    'offline': 'default',
    'error': 'error',
    'maintenance': 'warning'
  }
  return badges[status] || 'default'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'online': '在线',
    'offline': '离线',
    'error': '错误',
    'maintenance': '维护中'
  }
  return texts[status] || status
}

const getCertStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'deployed': 'green',
    'pending': 'blue',
    'failed': 'red',
    'expired': 'orange'
  }
  return colors[status] || 'default'
}

const getCertStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'deployed': '已部署',
    'pending': '部署中',
    'failed': '部署失败',
    'expired': '已过期'
  }
  return texts[status] || status
}

const getDaysRemainingClass = (days: number) => {
  if (days <= 0) return 'text-danger'
  if (days <= 7) return 'text-warning'
  if (days <= 30) return 'text-info'
  return 'text-success'
}

const getLatencyClass = (latency: number) => {
  if (latency > 1000) return 'text-danger'
  if (latency > 500) return 'text-warning'
  if (latency > 100) return 'text-info'
  return 'text-success'
}

const getUsageStatus = (usage: number) => {
  if (usage >= 90) return 'exception'
  if (usage >= 70) return 'active'
  return 'normal'
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 数据加载
const loadServer = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await ApiService.get(`/servers/${serverId.value}`)
    if (response.success) {
      server.value = response.data.server || response.data
    } else {
      error.value = response.message || '加载服务器详情失败'
    }
  } catch (err: any) {
    error.value = err.message || '网络错误'
    console.error('加载服务器详情失败:', err)
  } finally {
    loading.value = false
  }
}

const loadServerCertificates = async () => {
  certificatesLoading.value = true
  try {
    const response = await ApiService.get(`/servers/${serverId.value}/certificates`)
    if (response.success) {
      serverCertificates.value = response.data.certificates || response.data.items || []
    }
  } catch (error: any) {
    console.error('加载服务器证书失败:', error)
  } finally {
    certificatesLoading.value = false
  }
}

// 事件处理
const goBack = () => {
  router.back()
}

const refreshData = () => {
  loadServer()
  loadServerCertificates()
  message.success('数据已刷新')
}

const testConnection = async () => {
  testLoading.value = true
  try {
    await ApiService.post(`/servers/${serverId.value}/test`)
    message.success('服务器连接测试成功')
    loadServer() // 重新加载数据
  } catch (error: any) {
    message.error('服务器连接测试失败')
  } finally {
    testLoading.value = false
  }
}

const toggleAutoDeploy = async (checked: boolean) => {
  autoDeployLoading.value = true
  try {
    await ApiService.put(`/servers/${serverId.value}`, { auto_deploy: checked })
    server.value.auto_deploy = checked
    message.success(`自动部署已${checked ? '开启' : '关闭'}`)
  } catch (error: any) {
    message.error('更新自动部署设置失败')
  } finally {
    autoDeployLoading.value = false
  }
}

const deployNewCertificate = () => {
  message.info('部署新证书功能开发中')
}

const redeployCertificate = (certificate: any) => {
  message.info(`重新部署证书: ${certificate.domain}`)
}

const removeCertificate = (certificate: any) => {
  message.info(`移除证书: ${certificate.domain}`)
}

const handleMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case 'edit':
      message.info('编辑配置功能开发中')
      break
    case 'deploy':
      deployNewCertificate()
      break
    case 'logs':
      message.info('查看日志功能开发中')
      break
    case 'delete':
      message.info('删除服务器功能开发中')
      break
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadServer()
  loadServerCertificates()
})
</script>

<style scoped>
.server-detail-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 16px 24px;
  border-radius: 6px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.server-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-item {
  margin-bottom: 16px;
}

.info-item label {
  display: block;
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
  font-weight: 500;
}

.info-item .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.connection-status {
  margin-top: 24px;
}

.connection-status h4 {
  margin-bottom: 12px;
  color: #333;
}

.status-chart {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 4px;
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

.note-content {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #1890ff;
  white-space: pre-wrap;
}

.error-container,
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
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

.text-muted {
  color: #999;
}
</style>
