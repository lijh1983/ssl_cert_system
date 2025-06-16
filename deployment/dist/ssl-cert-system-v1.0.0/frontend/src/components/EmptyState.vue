<template>
  <div class="empty-state">
    <a-empty :image="getEmptyImage()" :description="false">
      <template #description>
        <div class="empty-content">
          <h3 class="empty-title">{{ title }}</h3>
          <p class="empty-description">{{ description }}</p>
          <div v-if="actionButton" class="empty-actions">
            <a-button 
              :type="actionButton.type || 'primary'" 
              :icon="actionButton.icon"
              @click="handleAction"
            >
              {{ actionButton.text }}
            </a-button>
          </div>
        </div>
      </template>
    </a-empty>
  </div>
</template>

<script lang="ts" setup>
import { h } from 'vue'
import {
  FileTextOutlined,
  CloudServerOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SettingOutlined,
  DatabaseOutlined
} from '@ant-design/icons-vue'

interface ActionButton {
  text: string
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  icon?: any
  handler: () => void
}

interface Props {
  type?: 'default' | 'certificates' | 'servers' | 'users' | 'logs' | 'settings' | 'data'
  title?: string
  description?: string
  actionButton?: ActionButton
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  title: '暂无数据',
  description: '当前没有任何数据，请稍后再试或添加新的内容'
})

const emit = defineEmits<{
  action: []
}>()

const getEmptyImage = () => {
  const images = {
    certificates: '/images/empty-certificates.svg',
    servers: '/images/empty-servers.svg',
    users: '/images/empty-users.svg',
    logs: '/images/empty-logs.svg',
    settings: '/images/empty-settings.svg',
    data: '/images/empty-data.svg',
    default: undefined
  }
  return images[props.type]
}

const getDefaultContent = () => {
  const contents = {
    certificates: {
      title: '暂无证书',
      description: '您还没有申请任何SSL证书，点击下方按钮开始申请您的第一个证书'
    },
    servers: {
      title: '暂无服务器',
      description: '您还没有添加任何服务器，添加服务器后可以自动部署和管理SSL证书'
    },
    users: {
      title: '暂无用户',
      description: '系统中还没有其他用户，您可以邀请团队成员加入'
    },
    logs: {
      title: '暂无日志',
      description: '当前没有任何操作日志记录'
    },
    settings: {
      title: '暂无配置',
      description: '请配置系统参数以开始使用'
    },
    data: {
      title: '暂无数据',
      description: '当前没有可显示的数据'
    },
    default: {
      title: props.title,
      description: props.description
    }
  }
  return contents[props.type] || contents.default
}

const content = getDefaultContent()
const finalTitle = props.title || content.title
const finalDescription = props.description || content.description

const handleAction = () => {
  if (props.actionButton?.handler) {
    props.actionButton.handler()
  }
  emit('action')
}
</script>

<style scoped>
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 8px;
}

.empty-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 24px;
}

.empty-actions {
  margin-top: 24px;
}
</style>
