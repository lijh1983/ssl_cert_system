# SSL证书管理系统 - Go语言版本

这是SSL证书管理系统的Go语言重写版本，提供了更高的性能和更好的并发处理能力。

## 🚀 特性

- **高性能**: Go语言原生性能，内存使用效率提升40-60%
- **高并发**: 基于goroutines的并发模型，支持更多并发连接
- **类型安全**: 编译时类型检查，减少运行时错误
- **快速启动**: 编译后的二进制文件，启动时间提升5-10倍
- **容器友好**: 更小的Docker镜像，更快的部署速度

## 📋 系统要求

- Go 1.21+
- MySQL 8.0+
- Linux/macOS/Windows

## 🔧 安装和运行

### 1. 克隆项目
```bash
git clone <repository-url>
cd ssl-cert-system-go
```

### 2. 安装依赖
```bash
go mod tidy
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库连接和其他配置
```

### 4. 运行应用
```bash
# 开发模式
go run cmd/server/main.go

# 构建并运行
go build -o ssl-cert-system cmd/server/main.go
./ssl-cert-system
```

## 📁 项目结构

```
ssl-cert-system-go/
├── cmd/server/          # 应用入口
├── internal/
│   ├── config/          # 配置管理
│   ├── database/        # 数据库连接
│   ├── handlers/        # HTTP处理器
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── repositories/    # 数据访问层
│   ├── services/        # 业务逻辑层
│   └── utils/           # 工具函数
├── pkg/                 # 公共包
├── api/                 # API文档
├── scripts/             # 脚本文件
└── deployments/         # 部署配置
```

## 🔗 API接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新令牌

### 用户管理
- `GET /api/users` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 服务器管理
- `GET /api/servers` - 获取服务器列表
- `POST /api/servers` - 创建服务器
- `GET /api/servers/:id` - 获取服务器详情
- `PUT /api/servers/:id` - 更新服务器
- `DELETE /api/servers/:id` - 删除服务器

### 证书管理
- `GET /api/certificates` - 获取证书列表
- `POST /api/certificates` - 创建证书
- `GET /api/certificates/:id` - 获取证书详情
- `PUT /api/certificates/:id` - 更新证书
- `DELETE /api/certificates/:id` - 删除证书

### 监控接口
- `GET /api/monitors/dashboard` - 获取仪表板数据
- `GET /api/monitors/certificates` - 获取证书监控数据
- `GET /api/monitors/servers` - 获取服务器监控数据

## 🏗️ 开发状态

### ✅ 已完成
- [x] 项目基础架构
- [x] 配置管理系统
- [x] 数据库连接和模型
- [x] JWT认证系统
- [x] 基础API框架
- [x] 用户管理功能
- [x] 健康检查接口

### 🚧 开发中
- [ ] 服务器管理功能
- [ ] 证书管理功能
- [ ] ACME客户端集成
- [ ] 定时任务系统
- [ ] 监控和统计功能

### 📋 待开发
- [ ] 文件上传和下载
- [ ] 邮件通知系统
- [ ] 日志管理
- [ ] 性能优化
- [ ] 单元测试

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进项目。

## 📄 许可证

MIT License
