<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    :width="width"
    :centered="centered"
    :mask-closable="false"
    :confirm-loading="loading"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <template #footer>
      <a-space>
        <a-button @click="handleCancel" :disabled="loading">
          {{ cancelText }}
        </a-button>
        <a-button 
          :type="confirmType" 
          :loading="loading" 
          @click="handleConfirm"
        >
          {{ confirmText }}
        </a-button>
      </a-space>
    </template>

    <div class="confirm-content">
      <div class="confirm-icon">
        <component :is="getIcon()" :style="{ color: getIconColor(), fontSize: '24px' }" />
      </div>
      <div class="confirm-message">
        <div class="confirm-title">{{ message }}</div>
        <div v-if="description" class="confirm-description">{{ description }}</div>
        
        <!-- 输入确认 -->
        <div v-if="requireInput" class="confirm-input">
          <a-input
            v-model:value="inputValue"
            :placeholder="inputPlaceholder"
            @press-enter="handleConfirm"
          />
          <div v-if="inputError" class="input-error">{{ inputError }}</div>
        </div>

        <!-- 详细信息 -->
        <div v-if="details && details.length > 0" class="confirm-details">
          <a-collapse ghost>
            <a-collapse-panel key="details" header="查看详细信息">
              <ul class="details-list">
                <li v-for="(detail, index) in details" :key="index">
                  {{ detail }}
                </li>
              </ul>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import {
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons-vue'

interface Props {
  open: boolean
  type?: 'warning' | 'info' | 'success' | 'error' | 'confirm'
  title?: string
  message: string
  description?: string
  details?: string[]
  confirmText?: string
  cancelText?: string
  width?: number
  centered?: boolean
  requireInput?: boolean
  inputPlaceholder?: string
  inputValidator?: (value: string) => string | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  title: '确认操作',
  confirmText: '确定',
  cancelText: '取消',
  width: 480,
  centered: true,
  requireInput: false,
  inputPlaceholder: '请输入确认信息',
  loading: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [inputValue?: string]
  cancel: []
}>()

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const inputValue = ref('')
const inputError = ref('')

const confirmType = computed(() => {
  const types = {
    warning: 'primary',
    info: 'primary',
    success: 'primary',
    error: 'danger',
    confirm: 'primary'
  }
  return types[props.type] as any
})

const getIcon = () => {
  const icons = {
    warning: ExclamationCircleOutlined,
    info: InfoCircleOutlined,
    success: CheckCircleOutlined,
    error: CloseCircleOutlined,
    confirm: QuestionCircleOutlined
  }
  return icons[props.type]
}

const getIconColor = () => {
  const colors = {
    warning: '#faad14',
    info: '#1890ff',
    success: '#52c41a',
    error: '#ff4d4f',
    confirm: '#1890ff'
  }
  return colors[props.type]
}

const validateInput = () => {
  if (!props.requireInput) return true
  
  if (!inputValue.value.trim()) {
    inputError.value = '请输入确认信息'
    return false
  }
  
  if (props.inputValidator) {
    const error = props.inputValidator(inputValue.value)
    if (error) {
      inputError.value = error
      return false
    }
  }
  
  inputError.value = ''
  return true
}

const handleConfirm = () => {
  if (!validateInput()) return
  
  emit('confirm', props.requireInput ? inputValue.value : undefined)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:open', false)
}

// 重置输入状态
watch(() => props.open, (newValue) => {
  if (newValue) {
    inputValue.value = ''
    inputError.value = ''
  }
})
</script>

<style scoped>
.confirm-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.confirm-icon {
  flex-shrink: 0;
  margin-top: 4px;
}

.confirm-message {
  flex: 1;
}

.confirm-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.confirm-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 16px;
}

.confirm-input {
  margin: 16px 0;
}

.input-error {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}

.confirm-details {
  margin-top: 16px;
}

.details-list {
  margin: 0;
  padding-left: 20px;
}

.details-list li {
  margin-bottom: 4px;
  font-size: 14px;
  color: #666;
}
</style>
