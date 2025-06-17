# SSL证书管理系统 - 快速开始指南

> **🎉 技术栈迁移完成**: 本系统已从Node.js完全迁移到Go语言，现在是纯Go语言的高性能SSL证书管理系统。

## ⚡ 5分钟快速部署

### 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ 可用内存
- 5GB+ 可用磁盘空间

### 🚀 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/lijh1983/ssl_cert_system.git
cd ssl_cert_system

# 2. 快速配置
cp .env.example .env

# 3. 一键启动 (包含完整环境)
docker-compose up -d

# 4. 等待启动完成 (约30-60秒)
docker-compose logs -f ssl-cert-system
```

### 🌐 访问系统

启动完成后，可以通过以下地址访问：

- **前端界面**: http://localhost
- **API接口**: http://localhost/api
- **健康检查**: http://localhost/health
- **后端直接访问**: http://localhost:3001

### 👤 默认账户

首次访问需要注册管理员账户：

1. 访问 http://localhost
2. 点击"注册"按钮
3. 填写管理员信息
4. 登录系统开始使用

## 🔧 部署选项

### 选项1: 本地开发环境 (默认)

包含完整的MySQL数据库，适合开发和测试：

```bash
docker-compose up -d
```

**特点**:
- ✅ 包含MySQL数据库
- ✅ 包含Redis缓存
- ✅ 包含Nginx前端服务器
- ✅ 一键启动，无需外部依赖

### 选项2: 生产环境 (远程数据库)

使用外部MySQL数据库，适合生产部署：

```bash
# 1. 配置远程数据库
nano .env
# 设置 DB_HOST=your_remote_db_host
# 设置 DB_PASSWORD=your_db_password

# 2. 启动服务
docker-compose -f docker-compose.remote-db.yml up -d
```

**特点**:
- ✅ 使用远程MySQL数据库
- ✅ 更适合生产环境
- ✅ 数据库独立管理
- ✅ 更好的可扩展性

### 选项3: 快速部署 (预构建镜像)

使用预构建镜像，避免网络问题：

```bash
docker-compose -f docker-compose.fast.yml up -d
```

**特点**:
- ✅ 使用GitHub预构建镜像
- ✅ 避免网络下载问题
- ✅ 快速启动，适合网络受限环境
- ✅ 自动更新，跟随代码仓库

## 📊 系统监控

### 健康检查

```bash
# 检查系统状态
curl http://localhost/health

# 检查各服务状态
docker-compose ps

# 查看系统日志
docker-compose logs ssl-cert-system
```

### 性能监控

```bash
# 查看资源使用
docker stats

# 查看容器状态
docker-compose top
```

## 🔐 安全配置

### 生产环境必须修改的配置

```bash
# 编辑环境配置
nano .env

# 修改以下配置项:
JWT_SECRET=your_strong_jwt_secret_key_here
DB_PASSWORD=your_strong_database_password
ACME_EMAIL=your_real_email@domain.com
```

### 网络安全

```bash
# 配置防火墙 (Ubuntu)
sudo ufw enable
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh
```

## 🛠️ 常用操作

### 启动和停止

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps
```

### 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p ssl_cert_system > backup.sql

# 备份证书文件
docker cp $(docker-compose ps -q ssl-cert-system):/app/storage/certs ./certs-backup
```

### 更新系统

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🚨 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 检查端口占用
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3001

# 修改端口配置
nano .env
# 设置 HTTP_PORT=8080
```

#### 2. 数据库连接失败
```bash
# 检查数据库容器
docker-compose logs mysql

# 重启数据库
docker-compose restart mysql
```

#### 3. 前端无法访问
```bash
# 检查Nginx容器
docker-compose logs nginx

# 检查前端文件
docker-compose exec ssl-cert-system ls -la frontend/dist/
```

### 获取帮助

如果遇到问题：

1. 查看详细日志: `docker-compose logs`
2. 检查系统状态: `docker-compose ps`
3. 参考完整文档: `DEPLOYMENT.md`
4. 提交Issue: GitHub仓库

## 🎉 开始使用

部署完成后，您可以：

1. **管理SSL证书**: 自动申请、续期Let's Encrypt证书
2. **监控服务器**: 添加服务器并监控SSL证书状态
3. **查看统计**: 实时监控证书和服务器状态
4. **自动化运维**: 设置自动续期和告警通知

**🚀 享受高性能的Go语言SSL证书管理系统！**
