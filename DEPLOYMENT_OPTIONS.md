# SSL证书管理系统 - 部署选项说明

> **🎉 技术栈迁移完成**: 本系统已从Node.js完全迁移到Go语言，现在是纯Go语言的高性能SSL证书管理系统。

## 📋 部署配置选项

本系统提供了多种部署配置，以适应不同的环境需求：

### 🔧 配置文件说明

| 配置文件 | 用途 | 数据库 | 适用场景 |
|---------|------|--------|----------|
| `docker-compose.yml` | 本地开发 | 本地MySQL容器 | 开发、测试 |
| `docker-compose.remote-db.yml` | 生产部署 | 远程MySQL服务器 | 生产环境 |
| `docker-compose.fast.yml` | 快速部署 | 远程MySQL服务器 | 网络受限环境 |

## 🚀 部署方式

### 方式1: 本地开发环境 (包含MySQL)

适用于：开发、测试、演示

```bash
# 1. 克隆项目
git clone https://github.com/lijh1983/ssl_cert_system.git
cd ssl_cert_system

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置基本配置

# 3. 启动服务 (包含MySQL)
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost
# API: http://localhost/api
# 后端直接访问: http://localhost:3001
```

**特点**：
- ✅ 包含完整的MySQL数据库
- ✅ 包含前端Nginx服务器
- ✅ 一键启动，无需外部依赖
- ✅ 适合开发和测试

### 方式2: 生产环境 (使用远程数据库)

适用于：生产部署、已有数据库服务器

```bash
# 1. 克隆项目
git clone https://github.com/lijh1983/ssl_cert_system.git
cd ssl_cert_system

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置远程数据库
# 设置 DB_HOST=your_remote_db_host

# 3. 使用远程数据库配置启动
docker-compose -f docker-compose.remote-db.yml up -d

# 4. 访问应用
# 前端: http://localhost
# API: http://localhost/api
```

**特点**：
- ✅ 使用远程MySQL数据库
- ✅ 更适合生产环境
- ✅ 数据库独立管理
- ✅ 更好的可扩展性

### 方式3: 快速部署 (使用预构建镜像)

适用于：网络受限环境、快速部署

```bash
# 1. 克隆项目
git clone https://github.com/lijh1983/ssl_cert_system.git
cd ssl_cert_system

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置远程数据库

# 3. 使用预构建镜像快速启动
docker-compose -f docker-compose.fast.yml up -d

# 4. 访问应用
# 前端: http://localhost
# API: http://localhost/api
```

**特点**：
- ✅ 使用预构建的GitHub镜像
- ✅ 避免网络问题和长时间构建
- ✅ 快速启动，适合网络受限环境
- ✅ 自动更新，跟随代码仓库

### 方式4: 仅后端服务

适用于：微服务架构、API服务

```bash
# 直接运行Go后端
./ssl-cert-system

# 或使用预构建镜像
docker run -d \
  -p 3001:3001 \
  -e DB_HOST=your_db_host \
  -e DB_PASSWORD=your_password \
  ghcr.io/lijh1983/ssl-cert-system-base:latest
```

## 🔧 环境变量配置

### 数据库配置

#### 本地开发
```bash
DB_HOST=mysql          # Docker服务名
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=your_secure_password_here
```

#### 远程数据库
```bash
DB_HOST=8.134.130.92   # 远程数据库地址
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=ssl_manager_password_123
```

### 其他重要配置
```bash
# JWT密钥 (生产环境必须修改)
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# ACME配置
ACME_SERVER=https://acme-v02.api.letsencrypt.org/directory  # 生产
# ACME_SERVER=https://acme-staging-v02.api.letsencrypt.org/directory  # 测试
ACME_EMAIL=your_email@domain.com

# 端口配置
HTTP_PORT=80
HTTPS_PORT=443
MYSQL_PORT=3306
```

## 🌐 访问地址

### 完整部署 (前端+后端)
- **前端界面**: http://localhost
- **API接口**: http://localhost/api
- **健康检查**: http://localhost/health

### 仅后端部署
- **API接口**: http://localhost:3001/api
- **健康检查**: http://localhost:3001/health

## 📊 系统架构

### 完整部署架构
```
Internet
    ↓
Nginx (端口80/443)
    ↓
Go Backend (端口3001)
    ↓
MySQL Database
```

### 组件说明
- **Nginx**: 前端静态文件服务 + API反向代理
- **Go Backend**: SSL证书管理核心服务
- **MySQL**: 数据存储
- **Redis**: 缓存服务 (可选)

## 🔐 安全配置

### 生产环境必须修改的配置
1. **JWT_SECRET**: 使用强密码
2. **DB_PASSWORD**: 使用强数据库密码
3. **ACME_EMAIL**: 使用真实邮箱地址
4. **REDIS_PASSWORD**: Redis访问密码

### 网络安全
- 使用HTTPS (配置SSL证书)
- 限制数据库访问IP
- 配置防火墙规则
- 定期更新密码

## 🚨 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查数据库配置
docker-compose logs ssl-cert-system

# 测试数据库连接
mysql -h DB_HOST -u DB_USER -p
```

#### 2. 前端无法访问
```bash
# 检查Nginx状态
docker-compose logs nginx

# 检查端口占用
netstat -tlnp | grep :80
```

#### 3. 证书申请失败
```bash
# 检查ACME配置
curl http://localhost/api/monitors/health

# 查看详细日志
docker-compose logs ssl-cert-system | grep -i acme
```

## 📈 性能优化

### 生产环境建议
1. **资源限制**: 在docker-compose中设置内存和CPU限制
2. **日志管理**: 配置日志轮转
3. **监控**: 设置健康检查和告警
4. **备份**: 定期备份数据库和证书文件

### 扩展性
- 使用负载均衡器
- 数据库读写分离
- Redis集群
- 容器编排 (Kubernetes)

## 📞 技术支持

如果遇到部署问题：
1. 查看相关日志文件
2. 检查环境变量配置
3. 参考DEPLOYMENT.md详细文档
4. 提交Issue到GitHub仓库
