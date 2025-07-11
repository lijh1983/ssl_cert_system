import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/App.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue')
      },
      {
        path: '/certificates',
        name: 'Certificates',
        component: () => import('@/views/Certificates.vue')
      },
      {
        path: '/certificates/:id',
        name: 'CertificateDetail',
        component: () => import('@/views/CertificateDetail.vue')
      },
      {
        path: '/servers',
        name: 'Servers',
        component: () => import('@/views/Servers.vue')
      },
      {
        path: '/servers/:id',
        name: 'ServerDetail',
        component: () => import('@/views/ServerDetail.vue')
      },
      {
        path: '/monitors',
        name: 'Monitors',
        component: () => import('@/views/Monitors.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 初始化认证状态
  if (!authStore.user && localStorage.getItem('token')) {
    try {
      await authStore.initAuth()
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      // 清除无效的token
      authStore.clearAuth()
    }
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 保存目标路由，登录后跳转
    const redirect = to.fullPath
    next({
      path: '/login',
      query: redirect !== '/' ? { redirect } : {}
    })
    return
  }

  // 检查是否需要游客状态（如登录页面）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/')
    return
  }

  // 检查管理员权限
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/')
    return
  }

  next()
})

export default router
