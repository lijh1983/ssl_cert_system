<template>
  <a-config-provider>
    <a-layout class="layout">
      <!-- 侧边栏 -->
      <a-layout-sider v-model:collapsed="collapsed" collapsible>
        <div class="logo" />
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="dark"
          mode="inline"
        >
          <a-menu-item key="1">
            <dashboard-outlined />
            <span>首页概览</span>
          </a-menu-item>
          <a-menu-item key="2">
            <safety-certificate-outlined />
            <span>证书管理</span>
          </a-menu-item>
          <a-menu-item key="3">
            <cloud-server-outlined />
            <span>服务器管理</span>
          </a-menu-item>
          <a-menu-item key="4">
            <monitor-outlined />
            <span>证书监控</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout>
        <!-- 顶部栏 -->
        <a-layout-header style="background: #fff; padding: 0">
          <a-row justify="end" align="middle" style="height: 100%; padding-right: 24px">
            <a-space>
              <a-button type="link">帮助文档</a-button>
              <a-button type="link">联系客服</a-button>
              <a-dropdown>
                <a-button type="link">
                  管理员
                  <down-outlined />
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="1">个人信息</a-menu-item>
                    <a-menu-item key="2">退出登录</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </a-row>
        </a-layout-header>

        <!-- 主内容区 -->
        <a-layout-content style="margin: 24px 16px 0">
          <router-view></router-view>
        </a-layout-content>

        <!-- 底部状态栏 -->
        <a-layout-footer style="text-align: center">
          HttpsOK SSL证书管理系统 ©2023
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
  MonitorOutlined,
  DownOutlined
} from '@ant-design/icons-vue'

const collapsed = ref<boolean>(false)
const selectedKeys = ref<string[]>(['1'])
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
