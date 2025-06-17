# SSL证书管理系统部署文档

## 📋 系统要求

### 硬件要求
- **CPU**: 2核心或以上
- **内存**: 4GB RAM或以上
- **存储**: 20GB可用空间或以上
- **网络**: 稳定的互联网连接

### 软件要求
- **操作系统**: Ubuntu 22.04.5 LTS (推荐)
- **Docker**: 20.10.0或以上版本
- **Docker Compose**: 2.0.0或以上版本

### 网络要求
- **端口80**: HTTP访问
- **端口443**: HTTPS访问 (可选)
- **端口3001**: API服务 (内部)
- **端口3306**: MySQL数据库 (内部)

## 🚀 快速部署

### 方法一：自动部署脚本 (推荐)

1. **下载部署包**
```bash
# 下载并解压部署包
# 将 ssl-cert-system-v1.0.0.tar.gz 上传到服务器
tar -xzf ssl-cert-system-v1.0.0.tar.gz
cd ssl-cert-system-v1.0.0
```

2. **运行部署脚本**
```bash
# 给脚本执行权限
chmod +x deployment/scripts/deploy.sh

# 运行部署脚本
./deployment/scripts/deploy.sh
```

3. **等待部署完成**
脚本会自动完成以下操作：
- 检查系统环境
- 安装Docker和Docker Compose
- 创建项目目录
- 配置环境变量
- 构建和启动服务

### 方法二：手动部署

#### 步骤1：准备环境

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要的工具
sudo apt install -y curl wget git unzip
```

#### 步骤2：安装Docker

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 将当前用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或运行以下命令
newgrp docker

# 验证安装
docker --version
```

#### 步骤3：安装Docker Compose

```bash
# 下载Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 设置执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

#### 步骤4：部署应用

```bash
# 创建项目目录
sudo mkdir -p /opt/ssl-cert-system
sudo chown $USER:$USER /opt/ssl-cert-system
cd /opt/ssl-cert-system

# 复制部署文件
cp -r /path/to/deployment/* ./

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置文件

# 构建和启动服务
docker-compose -f docker/docker-compose.yml up -d
```

## ⚙️ 配置说明

### 环境变量配置

编辑 `.env` 文件配置以下参数：

```bash
# 应用配置
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=your_secure_password_here

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Redis配置 (可选)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# 其他配置
CORS_ORIGIN=*
INIT_DB=true
```

### 数据库配置

系统支持以下数据库配置方式：

1. **使用Docker内置MySQL** (推荐)
2. **连接外部MySQL数据库**

#### 外部数据库配置

如果使用外部MySQL数据库，请修改 `.env` 文件：

```bash
DB_HOST=your_mysql_host
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=your_password
```

并在 `docker-compose.yml` 中注释掉MySQL服务。

### SSL/HTTPS配置

#### 使用Let's Encrypt自动证书

1. **安装Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
```

2. **申请证书**
```bash
sudo certbot --nginx -d your-domain.com
```

3. **配置自动续期**
```bash
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 使用自定义证书

将证书文件放置在 `ssl_certs` 卷中，并修改Nginx配置。

## 🔧 运维管理

### 常用命令

```bash
# 查看服务状态
docker-compose -f docker/docker-compose.yml ps

# 查看日志
docker-compose -f docker/docker-compose.yml logs -f

# 重启服务
docker-compose -f docker/docker-compose.yml restart

# 停止服务
docker-compose -f docker/docker-compose.yml down

# 更新服务
docker-compose -f docker/docker-compose.yml pull
docker-compose -f docker/docker-compose.yml up -d
```

### 数据备份

#### 数据库备份

```bash
# 创建备份
docker-compose -f docker/docker-compose.yml exec mysql mysqldump -u root -p ssl_cert_system > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
docker-compose -f docker/docker-compose.yml exec -T mysql mysql -u root -p ssl_cert_system < backup_file.sql
```

#### 完整备份

```bash
# 备份数据卷
docker run --rm -v ssl_data:/data -v $(pwd):/backup alpine tar czf /backup/ssl_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# 恢复数据卷
docker run --rm -v ssl_data:/data -v $(pwd):/backup alpine tar xzf /backup/ssl_data_backup.tar.gz -C /data
```

### 监控和日志

#### 系统监控

```bash
# 查看资源使用情况
docker stats

# 查看磁盘使用情况
df -h

# 查看内存使用情况
free -h
```

#### 日志管理

```bash
# 查看应用日志
docker-compose -f docker/docker-compose.yml logs sslapp

# 查看数据库日志
docker-compose -f docker/docker-compose.yml logs mysql

# 清理日志
docker system prune -f
```

### 性能优化

#### 数据库优化

1. **调整MySQL配置**
```sql
-- 在MySQL中执行
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
```

2. **添加索引**
```sql
-- 为常用查询添加索引
CREATE INDEX idx_certificates_status_days ON certificates(status, days_remaining);
CREATE INDEX idx_servers_status_heartbeat ON servers(status, last_heartbeat);
```

#### 应用优化

1. **启用Redis缓存**
```bash
# 在docker-compose.yml中启用Redis服务
docker-compose -f docker/docker-compose.yml up -d redis
```

2. **配置Nginx缓存**
```nginx
# 在nginx.conf中添加
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔒 安全配置

### 基础安全

1. **修改默认密码**
   - 登录系统后立即修改admin密码
   - 修改数据库root密码

2. **配置防火墙**
```bash
# 安装ufw
sudo apt install ufw

# 配置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 启用防火墙
sudo ufw enable
```

3. **定期更新**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新Docker镜像
docker-compose -f docker/docker-compose.yml pull
docker-compose -f docker/docker-compose.yml up -d
```

### 高级安全

1. **启用HTTPS**
2. **配置访问控制**
3. **设置日志审计**
4. **定期安全扫描**

## 🚨 故障排除

### 常见问题

#### 1. 服务无法启动

**症状**: Docker容器启动失败
**解决方案**:
```bash
# 查看详细错误信息
docker-compose -f docker/docker-compose.yml logs

# 检查端口占用
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3001

# 重新构建镜像
docker-compose -f docker/docker-compose.yml build --no-cache
```

#### 2. 数据库连接失败

**症状**: 应用无法连接数据库
**解决方案**:
```bash
# 检查数据库状态
docker-compose -f docker/docker-compose.yml exec mysql mysqladmin ping

# 检查网络连接
docker network ls
docker network inspect ssl_network

# 重置数据库
docker-compose -f docker/docker-compose.yml down
docker volume rm ssl_mysql_data
docker-compose -f docker/docker-compose.yml up -d
```

#### 3. 前端页面无法访问

**症状**: 浏览器显示404或500错误
**解决方案**:
```bash
# 检查Nginx状态
docker-compose -f docker/docker-compose.yml exec sslapp nginx -t

# 检查前端文件
docker-compose -f docker/docker-compose.yml exec sslapp ls -la /app/frontend/dist

# 重启Nginx
docker-compose -f docker/docker-compose.yml restart sslapp
```

### 获取帮助

如果遇到问题，请：

1. 查看详细日志
2. 检查系统资源
3. 参考故障排除指南
4. 联系技术支持

## 📞 技术支持

- **文档**: [在线文档地址]
- **问题反馈**: [GitHub Issues]
- **技术交流**: [社区论坛]
- **邮件支持**: support@example.com
