import { notification } from 'ant-design-vue'
import type { NotificationArgsProps } from 'ant-design-vue'

interface NotificationOptions {
  title: string
  description?: string
  duration?: number
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  onClick?: () => void
  onClose?: () => void
}

class NotificationService {
  private defaultDuration = 4.5
  private defaultPlacement: NotificationArgsProps['placement'] = 'topRight'

  // 成功通知
  success(options: NotificationOptions) {
    notification.success({
      message: options.title,
      description: options.description,
      duration: options.duration || this.defaultDuration,
      placement: options.placement || this.defaultPlacement,
      onClick: options.onClick,
      onClose: options.onClose,
    })
  }

  // 错误通知
  error(options: NotificationOptions) {
    notification.error({
      message: options.title,
      description: options.description,
      duration: options.duration || this.defaultDuration,
      placement: options.placement || this.defaultPlacement,
      onClick: options.onClick,
      onClose: options.onClose,
    })
  }

  // 警告通知
  warning(options: NotificationOptions) {
    notification.warning({
      message: options.title,
      description: options.description,
      duration: options.duration || this.defaultDuration,
      placement: options.placement || this.defaultPlacement,
      onClick: options.onClick,
      onClose: options.onClose,
    })
  }

  // 信息通知
  info(options: NotificationOptions) {
    notification.info({
      message: options.title,
      description: options.description,
      duration: options.duration || this.defaultDuration,
      placement: options.placement || this.defaultPlacement,
      onClick: options.onClick,
      onClose: options.onClose,
    })
  }

  // 操作成功通知
  operationSuccess(operation: string, target?: string) {
    this.success({
      title: '操作成功',
      description: `${operation}${target ? ` ${target}` : ''} 成功`,
      duration: 3
    })
  }

  // 操作失败通知
  operationError(operation: string, target?: string, error?: string) {
    this.error({
      title: '操作失败',
      description: `${operation}${target ? ` ${target}` : ''} 失败${error ? `：${error}` : ''}`,
      duration: 6
    })
  }

  // 网络错误通知
  networkError(message?: string) {
    this.error({
      title: '网络错误',
      description: message || '网络连接失败，请检查网络设置后重试',
      duration: 6
    })
  }

  // 权限错误通知
  permissionError(message?: string) {
    this.error({
      title: '权限不足',
      description: message || '您没有权限执行此操作',
      duration: 5
    })
  }

  // 验证错误通知
  validationError(message: string) {
    this.warning({
      title: '输入验证失败',
      description: message,
      duration: 4
    })
  }

  // 系统通知
  systemNotification(title: string, description: string, type: 'info' | 'warning' = 'info') {
    this[type]({
      title,
      description,
      duration: 8,
      placement: 'topLeft'
    })
  }

  // 证书相关通知
  certificateExpiring(domain: string, days: number) {
    this.warning({
      title: '证书即将过期',
      description: `域名 ${domain} 的SSL证书将在 ${days} 天后过期，请及时续期`,
      duration: 10,
      onClick: () => {
        // 可以跳转到证书详情页
        console.log('跳转到证书详情页')
      }
    })
  }

  certificateRenewed(domain: string) {
    this.success({
      title: '证书续期成功',
      description: `域名 ${domain} 的SSL证书已成功续期`,
      duration: 5
    })
  }

  certificateDeployed(domain: string, server: string) {
    this.success({
      title: '证书部署成功',
      description: `域名 ${domain} 的证书已成功部署到服务器 ${server}`,
      duration: 5
    })
  }

  // 服务器相关通知
  serverOffline(hostname: string) {
    this.error({
      title: '服务器离线',
      description: `服务器 ${hostname} 已离线，请检查服务器状态`,
      duration: 8
    })
  }

  serverOnline(hostname: string) {
    this.success({
      title: '服务器上线',
      description: `服务器 ${hostname} 已恢复在线状态`,
      duration: 4
    })
  }

  // 清除所有通知
  clear() {
    notification.destroy()
  }

  // 清除指定key的通知
  close(key: string) {
    notification.close(key)
  }
}

// 创建单例实例
export const notify = new NotificationService()

// 导出类型
export type { NotificationOptions }
export default NotificationService
