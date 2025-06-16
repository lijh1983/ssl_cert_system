<template>
  <div class="data-statistics">
    <div class="stats-header">
      <h4>数据统计</h4>
      <div class="stats-controls">
        <a-space>
          <a-range-picker
            v-model:value="dateRange"
            size="small"
            @change="handleDateRangeChange"
          />
          <a-select v-model:value="statsType" size="small" @change="handleStatsTypeChange">
            <a-select-option value="overview">概览</a-select-option>
            <a-select-option value="certificates">证书</a-select-option>
            <a-select-option value="servers">服务器</a-select-option>
            <a-select-option value="operations">操作</a-select-option>
          </a-select>
          <a-button size="small" @click="exportData">
            <template #icon>
              <download-outlined />
            </template>
            导出
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="stats-content">
      <a-row :gutter="[16, 16]">
        <!-- 总览统计 -->
        <a-col :xs="24" :sm="12" :md="6" v-for="stat in currentStats" :key="stat.key">
          <div class="stat-card" :class="stat.trend">
            <div class="stat-icon">
              <component :is="stat.icon" :style="{ color: stat.color }" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-change" v-if="stat.change">
                <component :is="stat.change > 0 ? ArrowUpOutlined : ArrowDownOutlined" />
                <span>{{ Math.abs(stat.change) }}%</span>
                <span class="change-period">{{ stat.changePeriod }}</span>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 趋势图表 -->
      <div class="trend-charts" v-if="showTrendCharts">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="12">
            <div class="chart-container">
              <h5>证书申请趋势</h5>
              <div class="mini-chart">
                <svg width="100%" height="120" viewBox="0 0 400 120">
                  <defs>
                    <linearGradient id="certificateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#1890ff;stop-opacity:0.3" />
                      <stop offset="100%" style="stop-color:#1890ff;stop-opacity:0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    :points="generateTrendPoints(certificateTrend)"
                    fill="url(#certificateGradient)"
                    stroke="#1890ff"
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>
          </a-col>
          
          <a-col :xs="24" :md="12">
            <div class="chart-container">
              <h5>服务器状态分布</h5>
              <div class="pie-chart">
                <div class="pie-item" v-for="item in serverStatusData" :key="item.name">
                  <div class="pie-color" :style="{ backgroundColor: item.color }"></div>
                  <span class="pie-label">{{ item.name }}</span>
                  <span class="pie-value">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 详细数据表格 -->
      <div class="detailed-data" v-if="showDetailedData">
        <a-table
          :columns="detailColumns"
          :data-source="detailData"
          :pagination="{ pageSize: 10 }"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ record.status }}
              </a-tag>
            </template>
            <template v-if="column.key === 'trend'">
              <span :class="record.trend > 0 ? 'trend-up' : 'trend-down'">
                <component :is="record.trend > 0 ? ArrowUpOutlined : ArrowDownOutlined" />
                {{ Math.abs(record.trend) }}%
              </span>
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import type { Dayjs } from 'dayjs'
import {
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import { notify } from '@/utils/notification'

interface StatItem {
  key: string
  label: string
  value: string | number
  icon: any
  color: string
  change?: number
  changePeriod?: string
  trend: 'up' | 'down' | 'stable'
}

// 响应式数据
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const statsType = ref('overview')
const loading = ref(false)

// 模拟统计数据
const overviewStats: StatItem[] = [
  {
    key: 'total_certificates',
    label: '证书总数',
    value: 156,
    icon: SafetyCertificateOutlined,
    color: '#1890ff',
    change: 12,
    changePeriod: '较上月',
    trend: 'up'
  },
  {
    key: 'active_servers',
    label: '活跃服务器',
    value: 24,
    icon: CloudServerOutlined,
    color: '#52c41a',
    change: 5,
    changePeriod: '较上月',
    trend: 'up'
  },
  {
    key: 'success_rate',
    label: '成功率',
    value: '98.5%',
    icon: CheckCircleOutlined,
    color: '#52c41a',
    change: 2.1,
    changePeriod: '较上月',
    trend: 'up'
  },
  {
    key: 'pending_tasks',
    label: '待处理任务',
    value: 3,
    icon: ExclamationCircleOutlined,
    color: '#faad14',
    change: -15,
    changePeriod: '较上月',
    trend: 'down'
  }
]

const certificateStats: StatItem[] = [
  {
    key: 'new_certificates',
    label: '新申请证书',
    value: 23,
    icon: SafetyCertificateOutlined,
    color: '#1890ff',
    change: 18,
    changePeriod: '较上周',
    trend: 'up'
  },
  {
    key: 'renewed_certificates',
    label: '续期证书',
    value: 45,
    icon: SafetyCertificateOutlined,
    color: '#52c41a',
    change: 8,
    changePeriod: '较上周',
    trend: 'up'
  },
  {
    key: 'expiring_soon',
    label: '即将过期',
    value: 7,
    icon: ExclamationCircleOutlined,
    color: '#faad14',
    change: -12,
    changePeriod: '较上周',
    trend: 'down'
  },
  {
    key: 'failed_operations',
    label: '操作失败',
    value: 2,
    icon: ExclamationCircleOutlined,
    color: '#ff4d4f',
    change: -50,
    changePeriod: '较上周',
    trend: 'down'
  }
]

// 计算属性
const currentStats = computed(() => {
  switch (statsType.value) {
    case 'certificates':
      return certificateStats
    case 'servers':
      return overviewStats.filter(s => s.key.includes('server'))
    case 'operations':
      return overviewStats.filter(s => s.key.includes('rate') || s.key.includes('tasks'))
    default:
      return overviewStats
  }
})

const showTrendCharts = computed(() => {
  return statsType.value === 'overview' || statsType.value === 'certificates'
})

const showDetailedData = computed(() => {
  return statsType.value !== 'overview'
})

const certificateTrend = ref([20, 25, 18, 32, 28, 35, 23, 29, 31, 27])

const serverStatusData = ref([
  { name: '在线', value: 18, color: '#52c41a' },
  { name: '离线', value: 3, color: '#ff4d4f' },
  { name: '维护中', value: 3, color: '#faad14' }
])

const detailColumns = [
  { title: '项目', dataIndex: 'name', key: 'name' },
  { title: '数量', dataIndex: 'count', key: 'count' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '趋势', dataIndex: 'trend', key: 'trend' }
]

const detailData = ref([
  { name: 'Let\'s Encrypt 证书', count: 120, status: '正常', trend: 15 },
  { name: '自签名证书', count: 36, status: '正常', trend: -5 },
  { name: 'Ubuntu 服务器', count: 15, status: '正常', trend: 8 },
  { name: 'CentOS 服务器', count: 9, status: '正常', trend: 12 }
])

// 工具函数
const generateTrendPoints = (data: number[]) => {
  const width = 400
  const height = 120
  const padding = 20
  
  return data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding)
    const y = height - padding - ((value - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * (height - 2 * padding)
    return `${x},${y}`
  }).join(' ')
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    '正常': 'green',
    '警告': 'orange',
    '错误': 'red'
  }
  return colors[status] || 'default'
}

// 事件处理
const handleDateRangeChange = () => {
  loadStatistics()
}

const handleStatsTypeChange = () => {
  loadStatistics()
}

const loadStatistics = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 这里可以根据日期范围和统计类型加载不同的数据
    notify.success({
      title: '数据已更新',
      description: '统计数据已刷新到最新状态'
    })
  } catch (error) {
    notify.error({
      title: '加载失败',
      description: '无法加载统计数据'
    })
  } finally {
    loading.value = false
  }
}

const exportData = () => {
  // 模拟数据导出
  const data = {
    type: statsType.value,
    dateRange: dateRange.value,
    stats: currentStats.value,
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `statistics-${statsType.value}-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  
  notify.success({
    title: '导出成功',
    description: '统计数据已导出到本地文件'
  })
}

// 组件挂载
onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.data-statistics {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.stats-header h4 {
  margin: 0;
  color: #333;
  font-weight: 600;
}

.stats-content {
  padding: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  transition: all 0.3s;
}

.stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card.up {
  border-left: 4px solid #52c41a;
}

.stat-card.down {
  border-left: 4px solid #ff4d4f;
}

.stat-card.stable {
  border-left: 4px solid #1890ff;
}

.stat-icon {
  font-size: 24px;
  margin-right: 16px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-change.up {
  color: #52c41a;
}

.stat-change.down {
  color: #ff4d4f;
}

.change-period {
  color: #999;
}

.trend-charts {
  margin-top: 24px;
}

.chart-container {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
}

.chart-container h5 {
  margin: 0 0 16px;
  color: #333;
  font-weight: 600;
}

.mini-chart {
  height: 120px;
}

.pie-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pie-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pie-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.pie-label {
  flex: 1;
  font-size: 14px;
  color: #666;
}

.pie-value {
  font-weight: 600;
  color: #333;
}

.detailed-data {
  margin-top: 24px;
}

.trend-up {
  color: #52c41a;
}

.trend-down {
  color: #ff4d4f;
}
</style>
