<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>SSL证书管理系统</h1>
        <p>请登录您的账户</p>
      </div>
      
      <a-form
        :model="loginForm"
        :rules="rules"
        @finish="handleLogin"
        @finishFailed="handleLoginFailed"
        layout="vertical"
        class="login-form"
      >
        <a-form-item label="用户名/邮箱" name="emailOrUsername">
          <a-input
            v-model:value="loginForm.emailOrUsername"
            size="large"
            placeholder="请输入用户名或邮箱"
          >
            <template #prefix>
              <user-outlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password
            v-model:value="loginForm.password"
            size="large"
            placeholder="请输入密码"
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="loginForm.remember">
            记住我
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            :loading="loading"
            block
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>

      <div class="login-footer">
        <a-divider>其他选项</a-divider>
        <div class="login-links">
          <a href="#" @click.prevent="showRegister = true">注册账户</a>
          <a href="#" @click.prevent="showForgotPassword = true">忘记密码</a>
        </div>
      </div>
    </div>

    <!-- 注册对话框 -->
    <a-modal
      v-model:open="showRegister"
      title="注册新账户"
      @ok="handleRegister"
      @cancel="showRegister = false"
      :confirm-loading="registerLoading"
    >
      <a-form
        :model="registerForm"
        :rules="registerRules"
        layout="vertical"
        ref="registerFormRef"
      >
        <a-form-item label="用户名" name="username">
          <a-input
            v-model:value="registerForm.username"
            placeholder="请输入用户名"
          />
        </a-form-item>

        <a-form-item label="邮箱" name="email">
          <a-input
            v-model:value="registerForm.email"
            placeholder="请输入邮箱地址"
          />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password
            v-model:value="registerForm.password"
            placeholder="请输入密码"
          />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password
            v-model:value="registerForm.confirmPassword"
            placeholder="请再次输入密码"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 忘记密码对话框 -->
    <a-modal
      v-model:open="showForgotPassword"
      title="忘记密码"
      @ok="handleForgotPassword"
      @cancel="showForgotPassword = false"
      :confirm-loading="forgotPasswordLoading"
    >
      <a-form
        :model="forgotPasswordForm"
        :rules="forgotPasswordRules"
        layout="vertical"
        ref="forgotPasswordFormRef"
      >
        <a-form-item label="邮箱地址" name="email">
          <a-input
            v-model:value="forgotPasswordForm.email"
            placeholder="请输入注册时使用的邮箱地址"
          />
        </a-form-item>
        <a-alert
          message="密码重置链接将发送到您的邮箱"
          type="info"
          show-icon
          style="margin-top: 16px"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { notify } from '@/utils/notification'
import { api } from '@/services/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 登录表单
const loginForm = reactive({
  emailOrUsername: '',
  password: '',
  remember: false
})

// 注册表单
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 忘记密码表单
const forgotPasswordForm = reactive({
  email: ''
})

const loading = ref(false)
const registerLoading = ref(false)
const forgotPasswordLoading = ref(false)
const showRegister = ref(false)
const showForgotPassword = ref(false)
const registerFormRef = ref()
const forgotPasswordFormRef = ref()

// 登录表单验证规则
const rules = {
  emailOrUsername: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

// 注册表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20位', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string) => {
        if (value !== registerForm.password) {
          return Promise.reject('两次输入的密码不一致')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 忘记密码表单验证规则
const forgotPasswordRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = async (values: any) => {
  loading.value = true
  try {
    await authStore.login(values)

    // 显示欢迎消息
    const welcomeMessage = `欢迎回来，${authStore.user?.username || '用户'}！`
    notify.success({
      title: '登录成功',
      description: welcomeMessage,
      duration: 3
    })

    // 跳转到目标页面或首页
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch (error: any) {
    notify.error({
      title: '登录失败',
      description: error.message || '登录失败，请重试',
      duration: 5
    })
  } finally {
    loading.value = false
  }
}

// 处理登录失败
const handleLoginFailed = (errorInfo: any) => {
  console.log('登录表单验证失败:', errorInfo)
}

// 处理注册
const handleRegister = async () => {
  try {
    await registerFormRef.value.validate()
    registerLoading.value = true
    
    await authStore.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    
    message.success('注册成功，请登录')
    showRegister.value = false
    
    // 清空注册表单
    Object.assign(registerForm, {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
  } catch (error: any) {
    message.error(error.message || '注册失败')
  } finally {
    registerLoading.value = false
  }
}

// 处理忘记密码
const handleForgotPassword = async () => {
  try {
    await forgotPasswordFormRef.value.validate()
    forgotPasswordLoading.value = true

    const response = await api.post('/auth/forgot-password', {
      email: forgotPasswordForm.email
    })

    if (response.data.success) {
      message.success('密码重置链接已发送到您的邮箱，请查收')
      showForgotPassword.value = false
      forgotPasswordForm.email = ''
    } else {
      message.error(response.data.message || '发送失败')
    }
  } catch (error: any) {
    message.error(error.response?.data?.message || error.message || '发送失败')
  } finally {
    forgotPasswordLoading.value = false
  }
}

// 自动填充记住的登录信息
onMounted(() => {
  const rememberedUsername = localStorage.getItem('rememberedUsername')
  const rememberLogin = localStorage.getItem('rememberLogin')

  if (rememberedUsername && rememberLogin === 'true') {
    loginForm.emailOrUsername = rememberedUsername
    loginForm.remember = true
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  color: #1890ff;
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
}

.login-header p {
  color: #666;
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.login-footer {
  text-align: center;
}

.login-links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
}

.login-links a {
  color: #1890ff;
  text-decoration: none;
}

.login-links a:hover {
  text-decoration: underline;
}
</style>
