<template>
  <a-config-provider>
    <!-- 如果是登录页面，直接显示路由内容 -->
    <router-view v-if="$route.path === '/login'" />

    <!-- 否则显示主布局 -->
    <a-layout v-else class="layout">
      <!-- 侧边栏 -->
      <a-layout-sider v-model:collapsed="collapsed" collapsible>
        <div class="logo">
          <h3 v-if="!collapsed" style="color: white; text-align: center; margin: 16px 0;">
            SSL管理
          </h3>
          <div v-else style="text-align: center; margin: 16px 0; color: white; font-size: 18px;">
            S
          </div>
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="dark"
          mode="inline"
          @click="handleMenuClick"
        >
          <a-menu-item key="/">
            <dashboard-outlined />
            <span>首页概览</span>
          </a-menu-item>
          <a-menu-item key="/certificates">
            <safety-certificate-outlined />
            <span>证书管理</span>
          </a-menu-item>
          <a-menu-item key="/servers">
            <cloud-server-outlined />
            <span>服务器管理</span>
          </a-menu-item>
          <a-menu-item key="/monitors">
            <monitor-outlined />
            <span>证书监控</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout>
        <!-- 顶部栏 -->
        <a-layout-header style="background: #fff; padding: 0; box-shadow: 0 1px 4px rgba(0,21,41,.08)">
          <a-row justify="space-between" align="middle" style="height: 100%; padding: 0 24px">
            <a-col>
              <h2 style="margin: 0; color: #1890ff">{{ getPageTitle() }}</h2>
            </a-col>
            <a-col>
              <a-space>
                <a-button type="link" href="https://github.com/lijh1983/ssl_cert_system" target="_blank">
                  <github-outlined />
                  帮助文档
                </a-button>
                <a-dropdown>
                  <a-button type="link">
                    <user-outlined />
                    {{ authStore.user?.username || '用户' }}
                    <down-outlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="handleUserMenuClick">
                      <a-menu-item key="profile">
                        <user-outlined />
                        个人信息
                      </a-menu-item>
                      <a-menu-item key="settings">
                        <setting-outlined />
                        系统设置
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="logout">
                        <logout-outlined />
                        退出登录
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </a-col>
          </a-row>
        </a-layout-header>

        <!-- 主内容区 -->
        <a-layout-content style="margin: 0; min-height: calc(100vh - 64px - 70px)">
          <router-view></router-view>
        </a-layout-content>

        <!-- 底部状态栏 -->
        <a-layout-footer style="text-align: center; background: #f0f2f5; border-top: 1px solid #e8e8e8">
          SSL证书自动化管理系统 ©2025 |
          <a href="https://github.com/lijh1983/ssl_cert_system" target="_blank">GitHub</a>
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  MonitorOutlined,
  DownOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  GithubOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const collapsed = ref<boolean>(false)
const selectedKeys = ref<string[]>([route.path])

// 监听路由变化，更新选中的菜单项
watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath]
})

// 获取页面标题
const getPageTitle = () => {
  const titles: Record<string, string> = {
    '/': '首页概览',
    '/certificates': '证书管理',
    '/servers': '服务器管理',
    '/monitors': '证书监控'
  }
  return titles[route.path] || 'SSL证书管理系统'
}

// 处理菜单点击
const handleMenuClick = ({ key }: { key: string }) => {
  router.push(key)
}

// 处理用户菜单点击
const handleUserMenuClick = async ({ key }: { key: string }) => {
  switch (key) {
    case 'profile':
      message.info('个人信息功能开发中')
      break
    case 'settings':
      message.info('系统设置功能开发中')
      break
    case 'logout':
      try {
        await authStore.logout()
        message.success('退出登录成功')
        router.push('/login')
      } catch (error) {
        message.error('退出登录失败')
      }
      break
  }
}
</script>

<style>
.layout {
  min-height: 100vh;
}

.logo {
  height: 32px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.3);
}
</style>
