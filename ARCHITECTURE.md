# SSL证书管理系统 - 系统架构文档

> **🎉 技术栈迁移完成**: 本系统已从Node.js完全迁移到Go语言，现在是纯Go语言的高性能SSL证书管理系统。

## 🏗️ 系统架构概览

### 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户浏览器     │    │   移动设备       │    │   API客户端     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Nginx (端口80/443)   │
                    │    前端服务器 + 反向代理    │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   Go Backend (端口3001)   │
                    │     SSL证书管理核心       │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│   MySQL数据库     │  │   文件存储        │  │  Let's Encrypt   │
│   (端口3306)      │  │   (证书文件)      │  │   ACME服务器     │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

## 🔧 技术栈

### 后端技术栈
- **语言**: Go 1.21+
- **Web框架**: Gin (高性能HTTP框架)
- **数据库ORM**: GORM (Go语言ORM)
- **ACME客户端**: go-acme/lego (Let's Encrypt集成)
- **定时任务**: robfig/cron (定时任务调度)
- **日志**: logrus (结构化日志)
- **JWT**: golang-jwt (身份认证)

### 前端技术栈
- **框架**: Vue.js 3.x
- **构建工具**: Vite
- **UI组件**: Element Plus
- **状态管理**: Pinia
- **HTTP客户端**: Axios

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **数据库**: MySQL 8.0+
- **文件存储**: 本地文件系统
- **CI/CD**: GitHub Actions

## 📁 项目结构

```
ssl_cert_system/
├── cmd/server/                 # 应用入口
│   └── main.go                # 主程序文件
├── internal/                   # 内部包 (不对外暴露)
│   ├── config/                # 配置管理
│   │   └── config.go
│   ├── database/              # 数据库连接
│   │   └── database.go
│   ├── handlers/              # HTTP处理器
│   │   ├── auth.go           # 认证处理器
│   │   ├── certificates.go   # 证书处理器
│   │   ├── servers.go        # 服务器处理器
│   │   ├── users.go          # 用户处理器
│   │   ├── monitors.go       # 监控处理器
│   │   └── health.go         # 健康检查
│   ├── middleware/            # 中间件
│   │   ├── auth.go           # 认证中间件
│   │   ├── cors.go           # CORS中间件
│   │   └── security.go       # 安全中间件
│   ├── models/                # 数据模型
│   │   ├── user.go           # 用户模型
│   │   ├── server.go         # 服务器模型
│   │   └── certificate.go    # 证书模型
│   ├── repositories/          # 数据访问层
│   │   ├── user.go           # 用户数据访问
│   │   ├── server.go         # 服务器数据访问
│   │   └── certificate.go    # 证书数据访问
│   ├── services/              # 业务逻辑层
│   │   ├── auth.go           # 认证服务
│   │   ├── certificate.go    # 证书服务
│   │   ├── server.go         # 服务器服务
│   │   ├── acme.go           # ACME服务
│   │   ├── scheduler.go      # 定时任务服务
│   │   ├── monitor.go        # 监控服务
│   │   └── file.go           # 文件服务
│   ├── router/                # 路由配置
│   │   └── router.go
│   └── utils/                 # 工具函数
│       ├── jwt/              # JWT工具
│       ├── logger/           # 日志工具
│       ├── response/         # 响应工具
│       └── validator/        # 验证工具
├── frontend/dist/             # 前端构建文件
├── scripts/                   # 构建和部署脚本
├── go.mod                     # Go模块文件
├── go.sum                     # Go依赖校验
├── Dockerfile*                # Docker配置
├── docker-compose*.yml        # 部署配置
├── nginx.conf                 # Nginx配置
└── 文档和配置文件
```

## 🔄 数据流

### 1. 用户认证流程
```
用户登录 → 验证凭据 → 生成JWT Token → 返回Token → 后续请求携带Token
```

### 2. 证书申请流程
```
用户请求 → 验证域名 → 调用ACME服务 → Let's Encrypt验证 → 获取证书 → 存储证书 → 返回结果
```

### 3. 证书续期流程
```
定时任务 → 检查过期证书 → 自动续期 → 更新证书文件 → 通知用户 → 记录日志
```

## 🔐 安全架构

### 认证和授权
- **JWT Token**: 无状态身份认证
- **角色权限**: 基于角色的访问控制 (RBAC)
- **密码加密**: bcrypt哈希加密
- **会话管理**: Token过期和刷新机制

### 数据安全
- **数据库加密**: 敏感数据加密存储
- **传输加密**: HTTPS/TLS传输
- **输入验证**: 严格的输入验证和过滤
- **SQL注入防护**: 参数化查询

### 网络安全
- **CORS配置**: 跨域请求控制
- **安全头**: 完整的HTTP安全头设置
- **防火墙**: 端口和IP访问控制
- **反向代理**: Nginx安全配置

## 📊 性能架构

### 并发模型
- **Goroutine**: Go语言原生并发
- **连接池**: 数据库连接池管理
- **内存缓存**: Go内置map缓存 (未来可扩展Redis)
- **异步处理**: 证书申请异步处理

### 性能优化
- **编译优化**: Go编译时优化
- **内存管理**: 自动垃圾回收
- **静态文件**: Nginx静态文件服务
- **压缩**: Gzip响应压缩

## 🔄 部署架构

### 容器化部署
```
Docker Host
├── ssl-cert-system (Go应用容器)
├── nginx (前端服务器容器)
└── mysql (数据库容器)
```

### 网络配置
```
外部网络 (Internet)
    ↓
Docker Bridge Network (172.21.0.0/16)
    ├── nginx:80,443
    ├── ssl-cert-system:3001
    └── mysql:3306
```

### 数据持久化
```
Docker Volumes
├── mysql_data (数据库数据)
├── ssl_certs (证书文件)
└── ssl_logs (应用日志)
```

## 🔍 监控架构

### 健康检查
- **应用健康**: HTTP健康检查端点
- **数据库健康**: 数据库连接状态
- **服务健康**: 各微服务状态检查
- **系统健康**: 系统资源监控

### 日志管理
- **结构化日志**: JSON格式日志
- **日志级别**: Debug/Info/Warn/Error
- **日志轮转**: 自动日志文件轮转
- **集中日志**: 容器日志统一管理

### 指标监控
- **性能指标**: 响应时间、吞吐量
- **业务指标**: 证书数量、成功率
- **系统指标**: CPU、内存、磁盘
- **告警机制**: 异常情况自动告警

## 🚀 扩展架构

### 水平扩展
- **负载均衡**: 多实例负载均衡
- **数据库分离**: 读写分离
- **缓存扩展**: 可集成Redis集群 (未来版本)
- **微服务**: 服务拆分和独立部署

### 高可用
- **容器编排**: Kubernetes部署
- **数据备份**: 自动数据备份
- **故障转移**: 自动故障恢复
- **监控告警**: 7x24小时监控

这个架构设计确保了系统的高性能、高可用性和可扩展性，同时保持了代码的清晰性和可维护性。
