# SSL证书管理系统 - Go版本部署指南

## 🚀 快速部署

### 使用Docker Compose (推荐)

#### 1. 环境准备
```bash
# 确保已安装Docker和Docker Compose
docker --version
docker-compose --version

# 克隆项目
git clone <repository-url>
cd ssl-cert-system-go
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
# 数据库密码
DB_PASSWORD=your_secure_database_password

# JWT密钥
JWT_SECRET=your_jwt_secret_key_change_in_production

# ACME邮箱 (用于Let's Encrypt)
ACME_EMAIL=your_email@domain.com

# MySQL root密码
MYSQL_ROOT_PASSWORD=your_mysql_root_password

# Redis密码
REDIS_PASSWORD=your_redis_password
```

#### 3. 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f ssl-cert-system
```

#### 4. 验证部署
```bash
# 检查健康状态
curl http://localhost:3001/health

# 检查API
curl http://localhost:3001/api
```

## 🔧 生产环境部署

### 1. 系统要求
- **操作系统**: Ubuntu 22.04 LTS (推荐)
- **内存**: 最少2GB，推荐4GB+
- **存储**: 最少10GB可用空间
- **网络**: 需要访问Let's Encrypt服务器

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
```bash
# 如果使用反向代理，配置Nginx
sudo apt install nginx

# 配置Nginx反向代理
sudo nano /etc/nginx/sites-available/ssl-cert-system
```

**Nginx配置示例**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
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
```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
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

#### 1. 容器启动失败
```bash
# 查看详细错误信息
docker-compose logs ssl-cert-system

# 检查端口占用
sudo netstat -tlnp | grep :3001
```

#### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose ps mysql

# 测试数据库连接
docker-compose exec mysql mysql -u ssl_manager -p ssl_cert_system
```

#### 3. 证书申请失败
```bash
# 检查ACME配置
curl -X GET http://localhost:3001/api/monitors/health

# 查看证书申请日志
docker-compose logs ssl-cert-system | grep -i acme
```

#### 4. 内存不足
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

## 📞 技术支持

如果遇到问题，请：
1. 查看应用日志
2. 检查系统资源
3. 参考故障排除指南
4. 提交Issue到GitHub仓库
