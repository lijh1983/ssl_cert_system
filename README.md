# SSL证书管理系统

一个基于Go语言开发的高性能SSL证书管理系统，提供自动化的SSL证书申请、续期、监控和管理功能。

> **🎉 技术栈迁移完成**：本项目已从Node.js完全迁移到Go语言，提供更高的性能和更好的稳定性。

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

### 方式1: Docker Compose (推荐)
```bash
# 1. 克隆项目
git clone https://github.com/lijh1983/ssl_cert_system.git
cd ssl_cert_system

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f ssl-cert-system
```

### 方式2: 本地开发
```bash
# 1. 安装依赖
go mod tidy

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等

# 3. 运行应用
go run cmd/server/main.go

# 或构建后运行
go build -o ssl-cert-system cmd/server/main.go
./ssl-cert-system
```

### 方式3: 快速部署 (预构建镜像)
```bash
# 适用于网络受限环境
docker-compose -f docker-compose.fast.yml up -d
```

### 方式4: 原生部署 (传统服务器)
```bash
# 适用于已有Nginx和MySQL环境的服务器

# 1. 环境安装 (Ubuntu/Debian)
sudo ./scripts/install-native.sh

# 2. 应用部署
./scripts/deploy-native.sh

# 3. 健康检查
./scripts/health-check.sh

# 详细文档: DEPLOYMENT_NATIVE.md
```

### 方式5: Docker构建
```bash
# 构建镜像
docker build -t ssl-cert-system .

# 运行容器
docker run -p 3001:3001 ssl-cert-system
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
├── frontend/            # Vue.js前端
├── scripts/             # 部署和管理脚本
│   ├── install-native.sh    # 环境安装脚本
│   ├── deploy-native.sh     # 原生部署脚本
│   ├── health-check.sh      # 健康检查脚本
│   └── backup.sh            # 备份脚本
├── nginx.conf           # Nginx配置文件
├── docker-compose*.yml  # Docker部署配置
└── DEPLOYMENT_NATIVE.md # 原生部署文档
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
- `GET /api/monitors/health` - 获取系统健康状态
- `GET /api/monitors/alerts` - 获取系统告警信息

### 文件管理
- `GET /api/certificates/:id/download` - 下载证书文件
- `GET /api/certificates/:id/download?format=zip` - 下载证书ZIP包

## 🏗️ 开发状态

### ✅ 已完成
- [x] 项目基础架构
- [x] 配置管理系统
- [x] 数据库连接和模型
- [x] JWT认证系统
- [x] 完整API框架
- [x] 用户管理功能
- [x] 服务器管理功能
- [x] 证书管理功能
- [x] ACME客户端集成
- [x] 定时任务系统
- [x] 监控和统计功能
- [x] 文件管理和下载
- [x] 健康检查接口
- [x] Docker容器化部署

### 🚧 可选功能
- [ ] 邮件通知系统
- [ ] 高级日志管理
- [ ] 性能监控面板
- [ ] 单元测试覆盖
- [ ] API文档生成

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进项目。

## 📄 许可证

MIT License
