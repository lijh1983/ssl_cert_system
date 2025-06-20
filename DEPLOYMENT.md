# SSL证书管理系统部署指南

> **🎉 技术栈迁移完成**: 本系统已从Node.js完全迁移到Go语言，提供更高的性能和更好的稳定性。

## 📋 部署选项

本系统提供多种部署方式以适应不同环境需求：

| 部署方式 | 适用场景 | 数据库 | 特点 |
|---------|---------|--------|------|
| **Docker Compose** | 开发、测试 | 本地MySQL容器 | 一键启动，包含完整环境 |
| **Docker + 远程DB** | 生产环境 | 远程MySQL | 数据库独立管理 |
| **Docker 快速部署** | 网络受限 | 远程MySQL | 使用预构建镜像 |
| **原生部署** | 传统服务器 | 本地/远程MySQL | 无Docker环境 |

## 🚀 快速部署

### 方式1: Docker Compose (推荐)

#### 1. 环境准备
```bash
# 确保已安装Docker和Docker Compose
docker --version
docker-compose --version

# 克隆项目
git clone https://github.com/lijh1983/ssl_cert_system.git
cd ssl_cert_system
```

#### 2. 配置环境变量
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

**重要配置项**:
```bash
# 数据库配置
DB_HOST=mysql                    # Docker服务名 (本地部署)
# DB_HOST=8.134.130.92           # 远程数据库地址 (生产环境)
DB_PASSWORD=your_secure_database_password

# JWT密钥 (生产环境必须修改)
JWT_SECRET=your_jwt_secret_key_change_in_production

# ACME配置 (Let's Encrypt)
ACME_EMAIL=your_email@domain.com
ACME_SERVER=https://acme-v02.api.letsencrypt.org/directory  # 生产环境
# ACME_SERVER=https://acme-staging-v02.api.letsencrypt.org/directory  # 测试环境

# MySQL配置 (本地部署时需要)
MYSQL_ROOT_PASSWORD=your_mysql_root_password

# 注意: 当前版本(v1.0.2)未实现Redis功能，系统使用MySQL存储所有数据
```

#### 3. 选择部署方式并启动服务

> **🔧 构建优化**: 系统已优化Docker构建流程，支持无Git环境构建，解决了构建参数传递问题。

**方式1: 快速构建脚本 (推荐)**
```bash
# 一键构建和启动 (本地开发)
./scripts/quick-build.sh

# 使用快速部署配置
./scripts/quick-build.sh -f

# 后台运行
./scripts/quick-build.sh -d

# 指定版本号
./scripts/quick-build.sh -v 1.0.3
```

**方式2: 智能构建脚本**
```bash
# 自动处理环境变量和版本信息
./scripts/docker-compose-build.sh

# 使用快速部署配置
./scripts/docker-compose-build.sh -f docker-compose.fast.yml

# 强制重新构建并后台运行
./scripts/docker-compose-build.sh -b -d
```

**方式3: 传统Docker Compose**
```bash
# 本地开发环境 (包含MySQL)
docker-compose up -d

# 生产环境 (使用远程数据库)
docker-compose -f docker-compose.remote-db.yml up -d

# 快速部署 (使用预构建镜像)
docker-compose -f docker-compose.fast.yml up -d
```

**方式4: 自定义版本信息**
```bash
# 设置版本信息
export VERSION=1.0.3
export GIT_COMMIT=release-build
export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# 构建
./scripts/quick-build.sh
# 或
docker-compose up --build
```

### 方式2: 原生部署 (传统服务器)

适用于已有Nginx和MySQL环境的服务器：

```bash
# 1. 环境安装 (Ubuntu/Debian)
sudo ./scripts/install-native.sh

# 2. 应用部署
./scripts/deploy-native.sh

# 3. 健康检查
./scripts/health-check.sh

# 详细文档: DEPLOYMENT_NATIVE.md
```

#### 4. 验证部署
```bash
# 检查应用版本信息
docker run --rm ssl-cert-system:latest ./ssl-cert-system -version

# 检查前端访问
curl http://localhost/

# 检查API健康状态
curl http://localhost/health

# 检查后端直接访问
curl http://localhost:3001/health

# 检查API接口
curl http://localhost/api

# 查看服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f ssl-cert-system
```

## 🔧 生产环境部署

### 1. 系统要求

#### 最低要求
- **操作系统**: Ubuntu 22.04 LTS (推荐) / CentOS 8+ / Debian 11+
- **CPU**: 1核心 (推荐2核心+)
- **内存**: 最少1GB，推荐2GB+ (Go版本内存使用更少)
- **存储**: 最少5GB可用空间，推荐10GB+
- **网络**: 需要访问Let's Encrypt服务器 (端口80/443)

#### 软件依赖
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 用于克隆项目
- **Curl**: 用于健康检查

### 2. 安全配置

#### 防火墙设置
```bash
# 启用防火墙
sudo ufw enable

# 允许SSH
sudo ufw allow ssh

# 允许HTTP和HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 允许应用端口 (如果需要外部访问)
sudo ufw allow 3001
```

#### SSL/TLS配置

**内置Nginx配置 (推荐)**
系统已包含Nginx容器，无需额外配置：
```bash
# 系统自带完整的Nginx配置
# 前端: http://localhost
# API: http://localhost/api
```

**外部Nginx配置 (可选)**
如需使用外部Nginx：
```bash
# 安装Nginx
sudo apt install nginx

# 配置反向代理
sudo nano /etc/nginx/sites-available/ssl-cert-system
```

**外部Nginx配置示例**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API接口
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 数据备份

#### 数据库备份
```bash
# 创建备份脚本
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD ssl_cert_system > backup_$DATE.sql
gzip backup_$DATE.sql
echo "Database backup created: backup_$DATE.sql.gz"
EOF

chmod +x backup-db.sh
```

#### 证书文件备份
```bash
# 备份证书文件
tar -czf ssl-certs-backup-$(date +%Y%m%d).tar.gz \
    $(docker volume inspect ssl-cert-system-go_ssl_certs | jq -r '.[0].Mountpoint')
```

### 4. 监控和日志

#### 日志管理
```bash
# 查看应用日志
docker-compose logs ssl-cert-system

# 查看数据库日志
docker-compose logs mysql

# 设置日志轮转
sudo nano /etc/logrotate.d/ssl-cert-system
```

#### 系统监控
```bash
# 监控容器状态
docker-compose ps

# 监控资源使用
docker stats

# 监控磁盘使用
df -h
```

## 🔄 更新和维护

### 应用更新

#### 方式1: 使用构建脚本 (推荐)
```bash
# 拉取最新代码
git pull origin main

# 停止现有服务
docker-compose down

# 使用快速构建脚本重新构建
./scripts/quick-build.sh -d

# 或使用智能构建脚本
./scripts/docker-compose-build.sh -b -d
```

#### 方式2: 传统方式
```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 方式3: 指定版本更新
```bash
# 设置新版本
export VERSION=1.0.4
export GIT_COMMIT=update-$(date +%Y%m%d)

# 构建新版本
./scripts/quick-build.sh -v $VERSION
```

### 数据库维护
```bash
# 进入数据库容器
docker-compose exec mysql mysql -u root -p

# 查看数据库状态
SHOW DATABASES;
USE ssl_cert_system;
SHOW TABLES;
```

### 证书清理
```bash
# 手动触发清理任务
curl -X POST http://localhost:3001/api/admin/cleanup
```

## 🚨 故障排除

### 常见问题

#### 1. Docker构建失败
```bash
# 问题: Git提交哈希获取失败
# 解决: 使用简化构建脚本
./scripts/quick-build.sh

# 或手动设置版本信息
export VERSION=1.0.2
export GIT_COMMIT=manual-build
docker-compose up --build

# 查看构建日志
docker-compose build ssl-cert-system
```

#### 2. 容器启动失败
```bash
# 查看详细错误信息
docker-compose logs ssl-cert-system

# 检查端口占用
sudo netstat -tlnp | grep :3001

# 检查Docker服务状态
sudo systemctl status docker
```

#### 3. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose ps mysql

# 测试数据库连接
docker-compose exec mysql mysql -u ssl_manager -p ssl_cert_system
```

#### 4. 证书申请失败
```bash
# 检查ACME配置
curl -X GET http://localhost:3001/api/monitors/health

# 查看证书申请日志
docker-compose logs ssl-cert-system | grep -i acme
```

#### 5. 内存不足
```bash
# 检查内存使用
free -h
docker stats

# 优化Docker内存限制
# 在docker-compose.yml中添加:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### 性能优化

#### 1. 数据库优化
```sql
-- 在MySQL中执行
OPTIMIZE TABLE certificates;
OPTIMIZE TABLE servers;
OPTIMIZE TABLE users;
```

#### 2. 应用优化
```bash
# 设置Go运行时参数
export GOGC=100
export GOMAXPROCS=2
```

## 📊 监控指标

### 关键指标
- **应用响应时间**: < 200ms
- **数据库连接数**: < 100
- **内存使用率**: < 80%
- **磁盘使用率**: < 85%
- **证书过期告警**: 30天内

### 告警设置
```bash
# 设置证书过期告警
curl -X GET http://localhost:3001/api/monitors/alerts

# 设置系统健康检查
curl -X GET http://localhost:3001/api/monitors/health
```

## 🔐 安全建议

1. **定期更新密码**: 每3个月更换数据库和应用密码
2. **启用HTTPS**: 在生产环境中必须使用HTTPS
3. **限制网络访问**: 只开放必要的端口
4. **定期备份**: 每日备份数据库和证书文件
5. **监控日志**: 定期检查异常访问和错误日志
6. **更新依赖**: 定期更新Docker镜像和依赖包

## 🛠️ 构建脚本说明

### 可用的构建脚本

| 脚本名称 | 用途 | 特点 |
|---------|------|------|
| `scripts/quick-build.sh` | 快速构建 | 简单易用，适合开发阶段 |
| `scripts/docker-compose-build.sh` | 智能构建 | 自动处理环境变量，功能完整 |
| `scripts/build-images.sh` | 镜像构建 | 专门用于构建Docker镜像 |
| `scripts/build-production.sh` | 生产构建 | 生产环境专用，包含完整打包 |

### 构建脚本使用示例

#### 快速构建脚本
```bash
# 查看帮助
./scripts/quick-build.sh -h

# 基本构建
./scripts/quick-build.sh

# 快速部署配置
./scripts/quick-build.sh -f

# 后台运行
./scripts/quick-build.sh -d

# 指定版本
./scripts/quick-build.sh -v 1.0.3
```

#### 智能构建脚本
```bash
# 查看帮助
./scripts/docker-compose-build.sh -h

# 基本构建
./scripts/docker-compose-build.sh

# 使用特定配置文件
./scripts/docker-compose-build.sh -f docker-compose.fast.yml

# 强制重新构建
./scripts/docker-compose-build.sh -b

# 后台运行
./scripts/docker-compose-build.sh -d

# 停止服务
./scripts/docker-compose-build.sh -s
```

### 环境变量说明

构建过程中支持以下环境变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VERSION` | 1.0.2 | 应用版本号 |
| `BUILD_TIME` | 当前时间 | 构建时间戳 |
| `GIT_COMMIT` | unknown | Git提交哈希 |

#### 设置环境变量示例
```bash
# 方式1: 导出环境变量
export VERSION=1.0.3
export GIT_COMMIT=release-build
./scripts/quick-build.sh

# 方式2: 临时设置
VERSION=1.0.3 GIT_COMMIT=release-build ./scripts/quick-build.sh

# 方式3: 使用脚本参数
./scripts/quick-build.sh -v 1.0.3
```

### 构建问题解决

#### 常见构建错误及解决方案

**错误1: Git提交哈希获取失败**
```bash
# 错误信息: echo "Git Commit: $(git rev-parse --short HEAD)"
# 解决方案: 使用简化构建脚本
./scripts/quick-build.sh
```

**错误2: Docker Compose构建参数传递失败**
```bash
# 错误信息: 构建参数为字面字符串
# 解决方案: 使用构建脚本设置环境变量
./scripts/docker-compose-build.sh
```

**错误3: 无Git环境构建失败**
```bash
# 解决方案: 手动设置版本信息
export VERSION=1.0.2
export GIT_COMMIT=manual-build
docker-compose up --build
```

## 📞 技术支持

如果遇到问题，请：
1. 查看应用日志: `docker-compose logs ssl-cert-system`
2. 检查系统资源: `docker stats`
3. 参考故障排除指南
4. 查看构建脚本帮助: `./scripts/quick-build.sh -h`
5. 提交Issue到GitHub仓库

### 相关文档
- `DOCKER_BUILD_SIMPLE.md` - Docker构建问题详细解决方案
- `DEPLOYMENT_NATIVE.md` - 原生部署指南
- `QUICK_START.md` - 快速开始指南
