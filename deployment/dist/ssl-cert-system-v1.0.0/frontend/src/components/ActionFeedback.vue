<template>
  <div class="action-feedback">
    <!-- 成功反馈 -->
    <a-result
      v-if="type === 'success'"
      status="success"
      :title="title"
      :sub-title="description"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- 错误反馈 -->
    <a-result
      v-else-if="type === 'error'"
      status="error"
      :title="title"
      :sub-title="description"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- 警告反馈 -->
    <a-result
      v-else-if="type === 'warning'"
      status="warning"
      :title="title"
      :sub-title="description"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- 信息反馈 -->
    <a-result
      v-else-if="type === 'info'"
      status="info"
      :title="title"
      :sub-title="description"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- 404反馈 -->
    <a-result
      v-else-if="type === '404'"
      status="404"
      :title="title || '页面不存在'"
      :sub-title="description || '抱歉，您访问的页面不存在'"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- 403反馈 -->
    <a-result
      v-else-if="type === '403'"
      status="403"
      :title="title || '访问被拒绝'"
      :sub-title="description || '抱歉，您没有权限访问此页面'"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>

    <!-- 500反馈 -->
    <a-result
      v-else
      status="500"
      :title="title || '服务器错误'"
      :sub-title="description || '抱歉，服务器出现了一些问题'"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handlePrimary" v-if="primaryAction">
            {{ primaryAction.text }}
          </a-button>
          <a-button @click="handleSecondary" v-if="secondaryAction">
            {{ secondaryAction.text }}
          </a-button>
        </a-space>
      </template>
    </a-result>
  </div>
</template>

<script lang="ts" setup>
interface ActionButton {
  text: string
  handler: () => void
}

interface Props {
  type: 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500'
  title?: string
  description?: string
  primaryAction?: ActionButton
  secondaryAction?: ActionButton
}

const props = defineProps<Props>()

const handlePrimary = () => {
  if (props.primaryAction?.handler) {
    props.primaryAction.handler()
  }
}

const handleSecondary = () => {
  if (props.secondaryAction?.handler) {
    props.secondaryAction.handler()
  }
}
</script>

<style scoped>
.action-feedback {
  padding: 40px 20px;
  text-align: center;
}
</style>
