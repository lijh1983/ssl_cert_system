<template>
  <div class="loading-spinner" :class="{ 'full-screen': fullScreen }">
    <div class="spinner-container">
      <a-spin :size="size" :spinning="true">
        <template #indicator>
          <div class="custom-spinner">
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
          </div>
        </template>
      </a-spin>
      <div v-if="text" class="loading-text">{{ text }}</div>
      <div v-if="description" class="loading-description">{{ description }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
interface Props {
  size?: 'small' | 'default' | 'large'
  text?: string
  description?: string
  fullScreen?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'large',
  text: '加载中...',
  description: '',
  fullScreen: false
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-spinner.full-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
  min-height: 100vh;
}

.spinner-container {
  text-align: center;
}

.custom-spinner {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.spinner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1890ff;
  animation: spinner-bounce 1.4s ease-in-out infinite both;
}

.spinner-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.spinner-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes spinner-bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.loading-description {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}
</style>
