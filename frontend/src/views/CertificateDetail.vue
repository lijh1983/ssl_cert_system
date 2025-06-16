<template>
  <div class="certificate-detail-container">
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
            <h2 style="margin: 0">{{ certificate?.domain || '证书详情' }}</h2>
            <a-tag v-if="certificate" :color="getStatusColor(certificate.status)">
              {{ getStatusText(certificate.status) }}
            </a-tag>
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
            <a-button type="primary" @click="renewCertificate" :loading="renewLoading">
              <template #icon>
                <sync-outlined />
              </template>
              续期证书
            </a-button>
            <a-dropdown>
              <a-button>
                更多操作
                <down-outlined />
              </a-button>
              <template #overlay>
                <a-menu @click="handleMenuClick">
                  <a-menu-item key="download">
                    <download-outlined />
                    下载证书
                  </a-menu-item>
                  <a-menu-item key="verify">
                    <check-circle-outlined />
                    验证域名
                  </a-menu-item>
                  <a-menu-item key="edit">
                    <edit-outlined />
                    编辑配置
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger>
                    <delete-outlined />
                    删除证书
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
        <template #tip>加载证书详情中...</template>
      </a-spin>
    </div>

    <!-- 证书详情内容 -->
    <div v-else-if="certificate" class="certificate-content">
      <!-- 基本信息卡片 -->
      <a-card title="基本信息" class="info-card">
        <a-row :gutter="[24, 16]">
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>主域名</label>
              <div class="value">{{ certificate.domain }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>证书状态</label>
              <div class="value">
                <a-tag :color="getStatusColor(certificate.status)">
                  {{ getStatusText(certificate.status) }}
                </a-tag>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>剩余天数</label>
              <div class="value">
                <span :class="getDaysRemainingClass(certificate.days_remaining)">
                  {{ certificate.days_remaining }}天
                </span>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>颁发者</label>
              <div class="value">{{ certificate.issuer || 'Let\'s Encrypt' }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>加密类型</label>
              <div class="value">{{ certificate.encryption_type || 'ECC' }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <div class="info-item">
              <label>自动续期</label>
              <div class="value">
                <a-switch 
                  :checked="certificate.auto_renew" 
                  @change="toggleAutoRenew"
                  :loading="autoRenewLoading"
                />
              </div>
            </div>
          </a-col>
        </a-row>
      </a-card>

      <!-- 域名信息卡片 -->
      <a-card title="域名信息" class="info-card">
        <div class="domain-section">
          <h4>主域名</h4>
          <a-tag color="blue" class="domain-tag">{{ certificate.domain }}</a-tag>
        </div>
        
        <div v-if="certificate.alt_domains" class="domain-section">
          <h4>备用域名</h4>
          <div class="alt-domains">
            <a-tag 
              v-for="domain in getAltDomains(certificate.alt_domains)" 
              :key="domain" 
              class="domain-tag"
            >
              {{ domain }}
            </a-tag>
          </div>
        </div>
      </a-card>

      <!-- 有效期信息卡片 -->
      <a-card title="有效期信息" class="info-card">
        <a-row :gutter="[24, 16]">
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>生效时间</label>
              <div class="value">{{ formatDate(certificate.valid_from) }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>过期时间</label>
              <div class="value">{{ formatDate(certificate.valid_to) }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>创建时间</label>
              <div class="value">{{ formatDate(certificate.created_at) }}</div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12">
            <div class="info-item">
              <label>更新时间</label>
              <div class="value">{{ formatDate(certificate.updated_at) }}</div>
            </div>
          </a-col>
        </a-row>

        <!-- 有效期进度条 -->
        <div class="validity-progress">
          <h4>有效期进度</h4>
          <a-progress 
            :percent="getValidityProgress()" 
            :status="getProgressStatus()"
            :stroke-color="getProgressColor()"
          />
          <div class="progress-info">
            <span>已使用 {{ getUsedDays() }} 天</span>
            <span>剩余 {{ certificate.days_remaining }} 天</span>
          </div>
        </div>
      </a-card>

      <!-- 文件信息卡片 -->
      <a-card title="证书文件" class="info-card">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :md="6">
            <a-button block @click="downloadFile('cert')">
              <template #icon>
                <file-text-outlined />
              </template>
              证书文件 (.crt)
            </a-button>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-button block @click="downloadFile('key')">
              <template #icon>
                <key-outlined />
              </template>
              私钥文件 (.key)
            </a-button>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-button block @click="downloadFile('ca')">
              <template #icon>
                <safety-certificate-outlined />
              </template>
              CA证书 (.ca)
            </a-button>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-button block @click="downloadFile('fullchain')">
              <template #icon>
                <link-outlined />
              </template>
              完整链 (.pem)
            </a-button>
          </a-col>
        </a-row>
        
        <a-divider />
        
        <a-button type="primary" block @click="downloadAll">
          <template #icon>
            <download-outlined />
          </template>
          下载所有文件 (ZIP)
        </a-button>
      </a-card>

      <!-- 备注信息卡片 -->
      <a-card v-if="certificate.note" title="备注信息" class="info-card">
        <div class="note-content">{{ certificate.note }}</div>
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
          <a-button type="primary" @click="loadCertificate">重试</a-button>
        </template>
      </a-result>
    </div>

    <!-- 未找到证书 -->
    <div v-else class="not-found-container">
      <a-result
        status="404"
        title="证书不存在"
        sub-title="请检查证书ID是否正确"
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
  SyncOutlined,
  DownOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  LinkOutlined
} from '@ant-design/icons-vue'
import { ApiService } from '@/services/api'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const renewLoading = ref(false)
const autoRenewLoading = ref(false)
const certificate = ref<any>(null)
const error = ref('')

// 获取证书ID
const certificateId = computed(() => route.params.id as string)

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

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getAltDomains = (altDomains: string) => {
  if (!altDomains) return []
  return altDomains.split(',').map(domain => domain.trim()).filter(Boolean)
}

const getValidityProgress = () => {
  if (!certificate.value) return 0
  const total = new Date(certificate.value.valid_to).getTime() - new Date(certificate.value.valid_from).getTime()
  const used = Date.now() - new Date(certificate.value.valid_from).getTime()
  return Math.min(100, Math.max(0, (used / total) * 100))
}

const getProgressStatus = () => {
  const progress = getValidityProgress()
  if (progress >= 90) return 'exception'
  if (progress >= 70) return 'active'
  return 'normal'
}

const getProgressColor = () => {
  const progress = getValidityProgress()
  if (progress >= 90) return '#ff4d4f'
  if (progress >= 70) return '#faad14'
  return '#52c41a'
}

const getUsedDays = () => {
  if (!certificate.value) return 0
  const total = Math.ceil((new Date(certificate.value.valid_to).getTime() - new Date(certificate.value.valid_from).getTime()) / (1000 * 60 * 60 * 24))
  return total - certificate.value.days_remaining
}

// 数据加载
const loadCertificate = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await ApiService.get(`/certificates/${certificateId.value}`)
    if (response.success) {
      certificate.value = response.data.certificate || response.data
    } else {
      error.value = response.message || '加载证书详情失败'
    }
  } catch (err: any) {
    error.value = err.message || '网络错误'
    console.error('加载证书详情失败:', err)
  } finally {
    loading.value = false
  }
}

// 事件处理
const goBack = () => {
  router.back()
}

const refreshData = () => {
  loadCertificate()
  message.success('数据已刷新')
}

const renewCertificate = async () => {
  renewLoading.value = true
  try {
    await ApiService.post(`/certificates/${certificateId.value}/renew`)
    message.success('证书续期请求已提交')
    loadCertificate() // 重新加载数据
  } catch (error: any) {
    message.error('证书续期失败')
  } finally {
    renewLoading.value = false
  }
}

const toggleAutoRenew = async (checked: boolean) => {
  autoRenewLoading.value = true
  try {
    await ApiService.put(`/certificates/${certificateId.value}`, { auto_renew: checked })
    certificate.value.auto_renew = checked
    message.success(`自动续期已${checked ? '开启' : '关闭'}`)
  } catch (error: any) {
    message.error('更新自动续期设置失败')
  } finally {
    autoRenewLoading.value = false
  }
}

const downloadFile = async (fileType: string) => {
  try {
    await ApiService.download(`/certificates/${certificateId.value}/download/${fileType}`)
    message.success('文件下载成功')
  } catch (error: any) {
    message.error('文件下载失败')
  }
}

const downloadAll = async () => {
  try {
    await ApiService.download(`/certificates/${certificateId.value}/download`, `${certificate.value.domain}.zip`)
    message.success('证书文件下载成功')
  } catch (error: any) {
    message.error('证书文件下载失败')
  }
}

const handleMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case 'download':
      downloadAll()
      break
    case 'verify':
      message.info('域名验证功能开发中')
      break
    case 'edit':
      message.info('编辑配置功能开发中')
      break
    case 'delete':
      message.info('删除证书功能开发中')
      break
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadCertificate()
})
</script>

<style scoped>
.certificate-detail-container {
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

.certificate-content {
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

.domain-section {
  margin-bottom: 16px;
}

.domain-section h4 {
  margin-bottom: 8px;
  color: #333;
}

.domain-tag {
  margin: 4px 8px 4px 0;
}

.alt-domains {
  display: flex;
  flex-wrap: wrap;
}

.validity-progress {
  margin-top: 24px;
}

.validity-progress h4 {
  margin-bottom: 12px;
  color: #333;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
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
</style>
