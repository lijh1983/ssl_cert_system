import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

export interface User {
  id: number
  username: string
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  emailOrUsername: string
  password: string
  remember?: boolean
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    refreshToken: string
    user: User
  }
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.is_admin || false)

  // 设置认证信息
  const setAuth = (authData: { token: string; refreshToken: string; user: User }) => {
    token.value = authData.token
    refreshToken.value = authData.refreshToken
    user.value = authData.user

    // 保存到本地存储
    localStorage.setItem('token', authData.token)
    localStorage.setItem('refreshToken', authData.refreshToken)
    localStorage.setItem('user', JSON.stringify(authData.user))

    // 设置API默认请求头
    api.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`
  }

  // 清除认证信息
  const clearAuth = () => {
    token.value = null
    refreshToken.value = null
    user.value = null

    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')

    // 清除API默认请求头
    delete api.defaults.headers.common['Authorization']
  }

  // 登录
  const login = async (loginData: LoginRequest) => {
    loading.value = true
    try {
      const response = await api.post<LoginResponse>('/auth/login', loginData)

      if (response.data.success) {
        setAuth(response.data.data)

        // 记住登录状态
        if (loginData.remember) {
          localStorage.setItem('rememberLogin', 'true')
        }

        return response.data.data
      } else {
        throw new Error(response.data.message || '登录失败')
      }
    } catch (error: any) {
      clearAuth()

      // 处理不同类型的错误
      if (error.response?.status === 401) {
        throw new Error('用户名或密码错误')
      } else if (error.response?.status === 403) {
        throw new Error('账户已被禁用，请联系管理员')
      } else if (error.response?.status === 429) {
        throw new Error('登录尝试过于频繁，请稍后再试')
      } else {
        throw new Error(error.response?.data?.message || error.message || '登录失败，请检查网络连接')
      }
    } finally {
      loading.value = false
    }
  }

  // 注册
  const register = async (registerData: RegisterRequest) => {
    loading.value = true
    try {
      const response = await api.post('/auth/register', registerData)
      
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '注册失败')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || '注册失败')
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = async () => {
    loading.value = true
    try {
      if (token.value) {
        await api.post('/auth/logout')
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      clearAuth()
      loading.value = false
    }
  }

  // 获取当前用户信息
  const getCurrentUser = async () => {
    if (!token.value) {
      throw new Error('未登录')
    }

    loading.value = true
    try {
      const response = await api.get('/auth/me')
      
      if (response.data.success) {
        user.value = response.data.data.user
        return response.data.data.user
      } else {
        throw new Error(response.data.message || '获取用户信息失败')
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearAuth()
      }
      throw new Error(error.response?.data?.message || error.message || '获取用户信息失败')
    } finally {
      loading.value = false
    }
  }

  // 刷新令牌
  const refreshAuthToken = async () => {
    if (!refreshToken.value) {
      throw new Error('无刷新令牌')
    }

    try {
      const response = await api.post('/auth/refresh', {
        refreshToken: refreshToken.value
      })
      
      if (response.data.success) {
        const { token: newToken, refreshToken: newRefreshToken } = response.data.data
        token.value = newToken
        refreshToken.value = newRefreshToken
        
        localStorage.setItem('token', newToken)
        localStorage.setItem('refreshToken', newRefreshToken)
        
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        
        return newToken
      } else {
        throw new Error(response.data.message || '刷新令牌失败')
      }
    } catch (error: any) {
      clearAuth()
      throw new Error(error.response?.data?.message || error.message || '刷新令牌失败')
    }
  }

  // 初始化认证状态
  const initAuth = async () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      try {
        token.value = savedToken
        user.value = JSON.parse(savedUser)
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
        
        // 验证令牌是否有效
        await getCurrentUser()
      } catch (error) {
        console.error('初始化认证状态失败:', error)
        clearAuth()
      }
    }
  }

  // 更新用户信息
  const updateUser = async (userData: Partial<User>) => {
    loading.value = true
    try {
      const response = await api.put('/auth/me', userData)
      
      if (response.data.success) {
        user.value = response.data.data.user
        localStorage.setItem('user', JSON.stringify(user.value))
        return user.value
      } else {
        throw new Error(response.data.message || '更新用户信息失败')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || '更新用户信息失败')
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  const changePassword = async (currentPassword: string, newPassword: string) => {
    loading.value = true
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword
      })
      
      if (response.data.success) {
        return true
      } else {
        throw new Error(response.data.message || '修改密码失败')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || '修改密码失败')
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    token,
    refreshToken,
    user,
    loading,
    
    // 计算属性
    isAuthenticated,
    isAdmin,
    
    // 方法
    login,
    register,
    logout,
    getCurrentUser,
    refreshAuthToken,
    initAuth,
    updateUser,
    changePassword,
    setAuth,
    clearAuth
  }
})
