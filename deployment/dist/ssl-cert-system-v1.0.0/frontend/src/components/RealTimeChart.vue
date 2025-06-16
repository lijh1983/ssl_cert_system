<template>
  <div class="real-time-chart">
    <div class="chart-header">
      <h4>{{ title }}</h4>
      <div class="chart-controls">
        <a-space>
          <a-select v-model:value="timeRange" size="small" @change="handleTimeRangeChange">
            <a-select-option value="1h">最近1小时</a-select-option>
            <a-select-option value="6h">最近6小时</a-select-option>
            <a-select-option value="24h">最近24小时</a-select-option>
            <a-select-option value="7d">最近7天</a-select-option>
          </a-select>
          <a-button size="small" @click="refreshData">
            <template #icon>
              <reload-outlined />
            </template>
          </a-button>
        </a-space>
      </div>
    </div>
    
    <div class="chart-container" ref="chartContainer">
      <div v-if="loading" class="chart-loading">
        <a-spin size="large" />
      </div>
      <div v-else-if="error" class="chart-error">
        <a-result
          status="error"
          title="数据加载失败"
          :sub-title="error"
        >
          <template #extra>
            <a-button type="primary" @click="refreshData">重试</a-button>
          </template>
        </a-result>
      </div>
      <div v-else-if="!data || data.length === 0" class="chart-empty">
        <a-empty description="暂无监控数据" />
      </div>
      <div v-else class="chart-content">
        <!-- 这里可以集成图表库，如 ECharts 或 Chart.js -->
        <div class="mock-chart">
          <div class="chart-legend">
            <div v-for="series in chartSeries" :key="series.name" class="legend-item">
              <span class="legend-color" :style="{ backgroundColor: series.color }"></span>
              <span class="legend-name">{{ series.name }}</span>
              <span class="legend-value">{{ series.currentValue }}</span>
            </div>
          </div>
          
          <div class="chart-area">
            <svg width="100%" height="200" viewBox="0 0 800 200">
              <!-- 网格线 -->
              <defs>
                <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              <!-- 数据线 -->
              <g v-for="(series, index) in chartSeries" :key="series.name">
                <polyline
                  :points="generatePoints(series.data)"
                  fill="none"
                  :stroke="series.color"
                  stroke-width="2"
                />
                <!-- 数据点 -->
                <circle
                  v-for="(point, pointIndex) in series.data"
                  :key="pointIndex"
                  :cx="(pointIndex / (series.data.length - 1)) * 800"
                  :cy="200 - (point / 100) * 200"
                  r="3"
                  :fill="series.color"
                />
              </g>
              
              <!-- Y轴标签 -->
              <g class="y-axis">
                <text x="10" y="20" font-size="12" fill="#666">100%</text>
                <text x="10" y="70" font-size="12" fill="#666">75%</text>
                <text x="10" y="120" font-size="12" fill="#666">50%</text>
                <text x="10" y="170" font-size="12" fill="#666">25%</text>
                <text x="10" y="195" font-size="12" fill="#666">0%</text>
              </g>
            </svg>
          </div>
          
          <div class="chart-timeline">
            <div class="timeline-item" v-for="(time, index) in timeLabels" :key="index">
              {{ time }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'

interface ChartSeries {
  name: string
  color: string
  data: number[]
  currentValue: string
}

interface Props {
  title: string
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'certificates'
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 30000 // 30秒
})

const emit = defineEmits<{
  dataUpdate: [data: any[]]
}>()

// 响应式数据
const loading = ref(false)
const error = ref('')
const data = ref<any[]>([])
const timeRange = ref('1h')
const chartContainer = ref<HTMLElement>()
let refreshTimer: NodeJS.Timeout | null = null

// 模拟图表数据
const chartSeries = computed<ChartSeries[]>(() => {
  switch (props.type) {
    case 'cpu':
      return [
        {
          name: 'CPU使用率',
          color: '#1890ff',
          data: generateMockData(),
          currentValue: '35%'
        }
      ]
    case 'memory':
      return [
        {
          name: '内存使用率',
          color: '#52c41a',
          data: generateMockData(),
          currentValue: '68%'
        }
      ]
    case 'disk':
      return [
        {
          name: '磁盘使用率',
          color: '#faad14',
          data: generateMockData(),
          currentValue: '42%'
        }
      ]
    case 'network':
      return [
        {
          name: '入站流量',
          color: '#1890ff',
          data: generateMockData(),
          currentValue: '125 MB/s'
        },
        {
          name: '出站流量',
          color: '#52c41a',
          data: generateMockData(),
          currentValue: '89 MB/s'
        }
      ]
    case 'certificates':
      return [
        {
          name: '证书健康度',
          color: '#52c41a',
          data: generateMockData(),
          currentValue: '98%'
        }
      ]
    default:
      return []
  }
})

const timeLabels = computed(() => {
  const now = new Date()
  const labels = []
  const points = 20
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000) // 每5分钟一个点
    labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }
  
  return labels
})

// 生成模拟数据
const generateMockData = () => {
  const points = 20
  const data = []
  let value = Math.random() * 50 + 25 // 25-75之间的基础值
  
  for (let i = 0; i < points; i++) {
    // 添加一些随机波动
    value += (Math.random() - 0.5) * 10
    value = Math.max(0, Math.min(100, value)) // 限制在0-100之间
    data.push(Math.round(value))
  }
  
  return data
}

// 生成SVG路径点
const generatePoints = (data: number[]) => {
  return data.map((value, index) => {
    const x = (index / (data.length - 1)) * 800
    const y = 200 - (value / 100) * 200
    return `${x},${y}`
  }).join(' ')
}

// 加载数据
const loadData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 生成新的模拟数据
    data.value = generateMockData()
    emit('dataUpdate', data.value)
  } catch (err: any) {
    error.value = err.message || '数据加载失败'
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 处理时间范围变化
const handleTimeRangeChange = () => {
  loadData()
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (props.autoRefresh && !refreshTimer) {
    refreshTimer = setInterval(() => {
      loadData()
    }, props.refreshInterval)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 组件挂载
onMounted(() => {
  loadData()
  startAutoRefresh()
})

// 组件卸载
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.real-time-chart {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-header h4 {
  margin: 0;
  color: #333;
  font-weight: 600;
}

.chart-container {
  padding: 20px;
  min-height: 300px;
}

.chart-loading,
.chart-error,
.chart-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 260px;
}

.chart-content {
  height: 260px;
}

.mock-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-name {
  color: #666;
}

.legend-value {
  color: #333;
  font-weight: 600;
}

.chart-area {
  flex: 1;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.chart-timeline {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 10px;
}

.timeline-item {
  font-size: 11px;
  color: #999;
}
</style>
