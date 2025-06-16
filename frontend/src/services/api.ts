import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'

// 创建axios实例
export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求时间戳（防止缓存）
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果响应包含新的token，更新本地存储
    const newToken = response.headers['x-new-token']
    if (newToken) {
      localStorage.setItem('token', newToken)
    }
    
    return response
  },
  async (error) => {
    const { response, config } = error
    
    // 处理网络错误
    if (!response) {
      message.error('网络连接失败，请检查网络设置')
      return Promise.reject(new Error('网络连接失败'))
    }
    
    // 处理HTTP状态码错误
    switch (response.status) {
      case 401:
        // 未授权，清除本地认证信息
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        // 如果不是登录页面，跳转到登录页面
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        
        message.error('登录已过期，请重新登录')
        break
        
      case 403:
        message.error('没有权限访问此资源')
        break
        
      case 404:
        message.error('请求的资源不存在')
        break
        
      case 422:
        // 表单验证错误
        const validationErrors = response.data?.errors
        if (validationErrors && typeof validationErrors === 'object') {
          const firstError = Object.values(validationErrors)[0]
          if (Array.isArray(firstError) && firstError.length > 0) {
            message.error(firstError[0])
          }
        } else {
          message.error(response.data?.message || '请求参数错误')
        }
        break
        
      case 429:
        message.error('请求过于频繁，请稍后再试')
        break
        
      case 500:
        message.error('服务器内部错误')
        break
        
      case 502:
      case 503:
      case 504:
        message.error('服务暂时不可用，请稍后再试')
        break
        
      default:
        message.error(response.data?.message || `请求失败 (${response.status})`)
    }
    
    return Promise.reject(error)
  }
)

// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  timestamp?: string
}

export interface PaginatedResponse<T = any> {
  success: boolean
  message: string
  data: {
    items: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// 通用API方法
export class ApiService {
  // GET请求
  static async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await api.get<ApiResponse<T>>(url, config)
    return response.data
  }
  
  // POST请求
  static async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await api.post<ApiResponse<T>>(url, data, config)
    return response.data
  }
  
  // PUT请求
  static async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await api.put<ApiResponse<T>>(url, data, config)
    return response.data
  }
  
  // DELETE请求
  static async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await api.delete<ApiResponse<T>>(url, config)
    return response.data
  }
  
  // PATCH请求
  static async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await api.patch<ApiResponse<T>>(url, data, config)
    return response.data
  }
  
  // 文件上传
  static async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    }
    
    const response = await api.post<ApiResponse<T>>(url, formData, config)
    return response.data
  }
  
  // 文件下载
  static async download(url: string, filename?: string): Promise<void> {
    const response = await api.get(url, {
      responseType: 'blob'
    })
    
    // 创建下载链接
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    
    // 设置文件名
    if (filename) {
      link.download = filename
    } else {
      // 尝试从响应头获取文件名
      const contentDisposition = response.headers['content-disposition']
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          link.download = filenameMatch[1]
        }
      }
    }
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }
}

// 导出默认实例
export default api
