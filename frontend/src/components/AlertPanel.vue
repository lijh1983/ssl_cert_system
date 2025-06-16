<template>
  <div class="alert-panel">
    <div class="panel-header">
      <h4>系统告警</h4>
      <div class="panel-controls">
        <a-space>
          <a-select v-model:value="alertLevel" size="small" @change="filterAlerts">
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="critical">严重</a-select-option>
            <a-select-option value="warning">警告</a-select-option>
            <a-select-option value="info">信息</a-select-option>
          </a-select>
          <a-button size="small" @click="markAllAsRead" :disabled="unreadCount === 0">
            全部已读
          </a-button>
          <a-button size="small" @click="refreshAlerts">
            <template #icon>
              <reload-outlined />
            </template>
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="alert-stats">
      <a-row :gutter="16">
        <a-col :span="6">
          <div class="stat-item critical">
            <div class="stat-value">{{ stats.critical }}</div>
            <div class="stat-label">严重</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-item warning">
            <div class="stat-value">{{ stats.warning }}</div>
            <div class="stat-label">警告</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-item info">
            <div class="stat-value">{{ stats.info }}</div>
            <div class="stat-label">信息</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-item unread">
            <div class="stat-value">{{ unreadCount }}</div>
            <div class="stat-label">未读</div>
          </div>
        </a-col>
      </a-row>
    </div>

    <div class="alert-list">
      <div v-if="loading" class="alert-loading">
        <a-spin size="large" />
      </div>
      
      <div v-else-if="filteredAlerts.length === 0" class="alert-empty">
        <a-empty description="暂无告警信息" />
      </div>
      
      <div v-else class="alert-items">
        <div
          v-for="alert in filteredAlerts"
          :key="alert.id"
          class="alert-item"
          :class="[
            `alert-${alert.level}`,
            { 'alert-unread': !alert.read }
          ]"
          @click="handleAlertClick(alert)"
        >
          <div class="alert-icon">
            <component :is="getAlertIcon(alert.level)" />
          </div>
          
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-description">{{ alert.description }}</div>
            <div class="alert-meta">
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
              <span class="alert-source">{{ alert.source }}</span>
            </div>
          </div>
          
          <div class="alert-actions">
            <a-dropdown>
              <a-button type="text" size="small">
                <template #icon>
                  <more-outlined />
                </template>
              </a-button>
              <template #overlay>
                <a-menu @click="handleActionClick($event, alert)">
                  <a-menu-item key="read" v-if="!alert.read">
                    <check-outlined />
                    标记已读
                  </a-menu-item>
                  <a-menu-item key="unread" v-else>
                    <exclamation-outlined />
                    标记未读
                  </a-menu-item>
                  <a-menu-item key="resolve">
                    <check-circle-outlined />
                    解决
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger>
                    <delete-outlined />
                    删除
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 告警详情对话框 -->
    <a-modal
      v-model:open="showDetailModal"
      :title="selectedAlert?.title"
      width="600px"
      :footer="null"
    >
      <div v-if="selectedAlert" class="alert-detail">
        <div class="detail-header">
          <a-tag :color="getAlertColor(selectedAlert.level)">
            {{ getAlertLevelText(selectedAlert.level) }}
          </a-tag>
          <span class="detail-time">{{ formatTime(selectedAlert.timestamp) }}</span>
        </div>
        
        <div class="detail-content">
          <h4>告警描述</h4>
          <p>{{ selectedAlert.description }}</p>
          
          <h4>详细信息</h4>
          <div class="detail-info">
            <div class="info-item">
              <label>来源：</label>
              <span>{{ selectedAlert.source }}</span>
            </div>
            <div class="info-item">
              <label>类型：</label>
              <span>{{ selectedAlert.type }}</span>
            </div>
            <div class="info-item" v-if="selectedAlert.target">
              <label>目标：</label>
              <span>{{ selectedAlert.target }}</span>
            </div>
          </div>
          
          <h4 v-if="selectedAlert.suggestions">建议操作</h4>
          <ul v-if="selectedAlert.suggestions" class="suggestions">
            <li v-for="suggestion in selectedAlert.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
        
        <div class="detail-actions">
          <a-space>
            <a-button @click="markAsRead(selectedAlert)" v-if="!selectedAlert.read">
              标记已读
            </a-button>
            <a-button type="primary" @click="resolveAlert(selectedAlert)">
              解决告警
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import {
  ReloadOutlined,
  MoreOutlined,
  CheckOutlined,
  ExclamationOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons-vue'
import { notify } from '@/utils/notification'

interface Alert {
  id: string
  title: string
  description: string
  level: 'critical' | 'warning' | 'info'
  type: string
  source: string
  target?: string
  timestamp: string
  read: boolean
  resolved: boolean
  suggestions?: string[]
}

// 响应式数据
const loading = ref(false)
const alertLevel = ref('')
const alerts = ref<Alert[]>([])
const selectedAlert = ref<Alert | null>(null)
const showDetailModal = ref(false)

// 计算属性
const stats = computed(() => {
  return {
    critical: alerts.value.filter(a => a.level === 'critical' && !a.resolved).length,
    warning: alerts.value.filter(a => a.level === 'warning' && !a.resolved).length,
    info: alerts.value.filter(a => a.level === 'info' && !a.resolved).length
  }
})

const unreadCount = computed(() => {
  return alerts.value.filter(a => !a.read && !a.resolved).length
})

const filteredAlerts = computed(() => {
  let filtered = alerts.value.filter(a => !a.resolved)
  
  if (alertLevel.value) {
    filtered = filtered.filter(a => a.level === alertLevel.value)
  }
  
  return filtered.sort((a, b) => {
    // 未读的排在前面
    if (a.read !== b.read) {
      return a.read ? 1 : -1
    }
    // 按严重程度排序
    const levelOrder = { critical: 0, warning: 1, info: 2 }
    if (a.level !== b.level) {
      return levelOrder[a.level] - levelOrder[b.level]
    }
    // 按时间排序
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
})

// 工具函数
const getAlertIcon = (level: string) => {
  const icons = {
    critical: CloseCircleOutlined,
    warning: WarningOutlined,
    info: InfoCircleOutlined
  }
  return icons[level as keyof typeof icons]
}

const getAlertColor = (level: string) => {
  const colors = {
    critical: 'red',
    warning: 'orange',
    info: 'blue'
  }
  return colors[level as keyof typeof colors]
}

const getAlertLevelText = (level: string) => {
  const texts = {
    critical: '严重',
    warning: '警告',
    info: '信息'
  }
  return texts[level as keyof typeof texts]
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 生成模拟告警数据
const generateMockAlerts = (): Alert[] => {
  const now = new Date()
  return [
    {
      id: '1',
      title: '证书即将过期',
      description: '域名 example.com 的SSL证书将在3天后过期',
      level: 'warning',
      type: 'certificate_expiring',
      source: 'certificate_monitor',
      target: 'example.com',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      read: false,
      resolved: false,
      suggestions: [
        '立即续期证书',
        '检查自动续期配置',
        '通知相关人员'
      ]
    },
    {
      id: '2',
      title: '服务器离线',
      description: '服务器 web-server-01 已离线超过5分钟',
      level: 'critical',
      type: 'server_offline',
      source: 'server_monitor',
      target: 'web-server-01',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      read: false,
      resolved: false,
      suggestions: [
        '检查服务器网络连接',
        '重启服务器服务',
        '联系运维人员'
      ]
    },
    {
      id: '3',
      title: '磁盘空间不足',
      description: '服务器 db-server-01 磁盘使用率已达到85%',
      level: 'warning',
      type: 'disk_usage_high',
      source: 'system_monitor',
      target: 'db-server-01',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      read: true,
      resolved: false,
      suggestions: [
        '清理临时文件',
        '扩展磁盘容量',
        '归档旧数据'
      ]
    },
    {
      id: '4',
      title: '证书续期成功',
      description: '域名 api.example.com 的SSL证书已成功续期',
      level: 'info',
      type: 'certificate_renewed',
      source: 'certificate_manager',
      target: 'api.example.com',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
      resolved: false
    }
  ]
}

// 事件处理
const loadAlerts = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    alerts.value = generateMockAlerts()
  } catch (error) {
    notify.error({
      title: '加载失败',
      description: '无法加载告警信息'
    })
  } finally {
    loading.value = false
  }
}

const refreshAlerts = () => {
  loadAlerts()
  notify.success({
    title: '刷新成功',
    description: '告警信息已更新'
  })
}

const filterAlerts = () => {
  // 过滤逻辑已在计算属性中实现
}

const handleAlertClick = (alert: Alert) => {
  selectedAlert.value = alert
  showDetailModal.value = true
  
  // 点击时自动标记为已读
  if (!alert.read) {
    markAsRead(alert)
  }
}

const handleActionClick = ({ key }: { key: string }, alert: Alert) => {
  switch (key) {
    case 'read':
      markAsRead(alert)
      break
    case 'unread':
      markAsUnread(alert)
      break
    case 'resolve':
      resolveAlert(alert)
      break
    case 'delete':
      deleteAlert(alert)
      break
  }
}

const markAsRead = (alert: Alert) => {
  alert.read = true
  notify.success({
    title: '操作成功',
    description: '告警已标记为已读'
  })
}

const markAsUnread = (alert: Alert) => {
  alert.read = false
  notify.success({
    title: '操作成功',
    description: '告警已标记为未读'
  })
}

const markAllAsRead = () => {
  alerts.value.forEach(alert => {
    if (!alert.resolved) {
      alert.read = true
    }
  })
  notify.success({
    title: '操作成功',
    description: '所有告警已标记为已读'
  })
}

const resolveAlert = (alert: Alert) => {
  alert.resolved = true
  alert.read = true
  showDetailModal.value = false
  notify.success({
    title: '操作成功',
    description: '告警已解决'
  })
}

const deleteAlert = (alert: Alert) => {
  const index = alerts.value.findIndex(a => a.id === alert.id)
  if (index > -1) {
    alerts.value.splice(index, 1)
    notify.success({
      title: '操作成功',
      description: '告警已删除'
    })
  }
}

// 组件挂载
onMounted(() => {
  loadAlerts()
})
</script>

<style scoped>
.alert-panel {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h4 {
  margin: 0;
  color: #333;
  font-weight: 600;
}

.alert-stats {
  padding: 16px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  text-align: center;
  padding: 12px;
  border-radius: 4px;
  background: white;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-item.critical .stat-value {
  color: #ff4d4f;
}

.stat-item.warning .stat-value {
  color: #faad14;
}

.stat-item.info .stat-value {
  color: #1890ff;
}

.stat-item.unread .stat-value {
  color: #722ed1;
}

.alert-list {
  max-height: 400px;
  overflow-y: auto;
}

.alert-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.alert-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.alert-item:hover {
  background: #fafafa;
}

.alert-item.alert-unread {
  background: #f6ffed;
  border-left: 4px solid #52c41a;
}

.alert-item.alert-critical .alert-icon {
  color: #ff4d4f;
}

.alert-item.alert-warning .alert-icon {
  color: #faad14;
}

.alert-item.alert-info .alert-icon {
  color: #1890ff;
}

.alert-icon {
  margin-right: 12px;
  margin-top: 2px;
  font-size: 16px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.alert-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.alert-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.alert-actions {
  margin-left: 12px;
}

.alert-detail {
  padding: 8px 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-time {
  color: #666;
  font-size: 14px;
}

.detail-content h4 {
  margin: 16px 0 8px;
  color: #333;
}

.detail-info {
  background: #fafafa;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item label {
  width: 80px;
  color: #666;
  font-weight: 500;
}

.suggestions {
  margin: 0;
  padding-left: 20px;
}

.suggestions li {
  margin-bottom: 4px;
  color: #666;
}

.detail-actions {
  margin-top: 24px;
  text-align: right;
}
</style>
