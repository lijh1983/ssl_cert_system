# 非Docker部署指南

本文档提供在已有 Nginx 和 MySQL 环境下的原生部署方案，适用于传统服务器环境。

## 📋 部署概览

- **应用架构**: Go后端 + Vue.js前端
- **数据库**: MySQL 8.0+
- **Web服务器**: Nginx
- **进程管理**: systemd
- **部署目录**: `/opt/ssl-cert-system`

## 🔧 环境要求

### 系统要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Go版本**: 1.21+
- **Node.js版本**: 16+
- **MySQL版本**: 8.0+
- **Nginx版本**: 1.18+

### 检查现有环境
```bash
# 检查Go版本
go version

# 检查Node.js版本
node --version
npm --version

# 检查服务状态
systemctl status nginx
systemctl status mysql
```

## 🚀 快速部署

### 1. 环境准备

#### 1.1 安装Go（如果需要）
```bash
# 下载Go 1.21
wget https://go.dev/dl/go1.21.13.linux-amd64.tar.gz

# 安装
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.13.linux-amd64.tar.gz

# 添加到PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

#### 1.2 安装Node.js（如果需要）
```bash
# 使用NodeSource仓库安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或者使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. 数据库配置

#### 2.1 创建数据库和用户
```sql
-- 连接到MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE ssl_cert_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'ssl_manager'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- 授权
GRANT ALL PRIVILEGES ON ssl_cert_system.* TO 'ssl_manager'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 3. 应用部署

#### 3.1 创建部署目录
```bash
# 创建应用目录
sudo mkdir -p /opt/ssl-cert-system
sudo chown $USER:$USER /opt/ssl-cert-system

# 进入目录
cd /opt/ssl-cert-system
```

#### 3.2 获取代码
```bash
# 克隆代码
git clone https://github.com/lijh1983/ssl_cert_system.git .

# 或者从现有代码复制
# scp -r /path/to/ssl_cert_system/* /opt/ssl-cert-system/
```

#### 3.3 配置环境变量
```bash
# 创建生产环境配置
cat > .env << 'EOF'
# 应用配置
NODE_ENV=production
PORT=3001
APP_VERSION=1.0.2

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=your_secure_password_here

# JWT配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# ACME配置
ACME_SERVER=https://acme-v02.api.letsencrypt.org/directory
ACME_EMAIL=your_email@domain.com
ACME_STORAGE_PATH=/opt/ssl-cert-system/storage/certs

# 日志配置
LOG_LEVEL=info
EOF

# 设置环境变量文件权限
chmod 600 .env
```

#### 3.4 构建应用
```bash
# 构建前端
cd frontend
npm install
npm run build
cd ..

# 构建后端
go mod download
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o ssl-cert-system ./cmd/server/main.go

# 创建必要目录
mkdir -p storage/certs logs

# 设置权限
chmod +x ssl-cert-system
```

### 4. 系统服务配置

#### 4.1 创建systemd服务
```bash
# 创建服务文件
sudo tee /etc/systemd/system/ssl-cert-system.service << 'EOF'
[Unit]
Description=SSL Certificate Management System
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/ssl-cert-system
ExecStart=/opt/ssl-cert-system/ssl-cert-system
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ssl-cert-system

# 环境变量文件
EnvironmentFile=/opt/ssl-cert-system/.env

[Install]
WantedBy=multi-user.target
EOF
```

#### 4.2 启动服务
```bash
# 设置目录权限
sudo chown -R www-data:www-data /opt/ssl-cert-system

# 重新加载systemd
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable ssl-cert-system

# 启动服务
sudo systemctl start ssl-cert-system

# 检查状态
sudo systemctl status ssl-cert-system
```

### 5. Nginx配置

#### 5.1 创建站点配置
```bash
# 创建Nginx配置文件
sudo tee /etc/nginx/sites-available/ssl-cert-system << 'EOF'
# SSL证书管理系统 Nginx配置

upstream ssl_cert_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name ssl.gzyggl.com;  # 修改为您的域名
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # 前端静态文件
    location / {
        root /opt/ssl-cert-system/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # 缓存设置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API代理
    location /api/ {
        proxy_pass http://ssl_cert_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # 健康检查
    location /health {
        proxy_pass http://ssl_cert_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 错误页面
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /opt/ssl-cert-system/frontend/dist;
    }

    # 日志
    access_log /var/log/nginx/ssl-cert-system.access.log;
    error_log /var/log/nginx/ssl-cert-system.error.log;
}
EOF
```

#### 5.2 启用站点
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/ssl-cert-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载Nginx
sudo systemctl reload nginx
```

## 🔧 高级配置

### 防火墙设置
```bash
# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果需要直接访问应用端口（调试用）
sudo ufw allow 3001/tcp
```

### 日志管理
```bash
# 配置日志轮转
sudo tee /etc/logrotate.d/ssl-cert-system << 'EOF'
/opt/ssl-cert-system/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload ssl-cert-system
    endscript
}
EOF
```

## 📜 管理脚本

详细的管理脚本请参考 `scripts/` 目录：
- `scripts/deploy-native.sh` - 自动化部署脚本
- `scripts/health-check.sh` - 健康检查脚本
- `scripts/backup.sh` - 备份脚本

## 🔍 故障排除

### 常见问题

#### 服务无法启动
```bash
# 检查服务状态
sudo systemctl status ssl-cert-system

# 查看详细日志
sudo journalctl -u ssl-cert-system -f

# 检查端口占用
sudo netstat -tlnp | grep :3001
```

#### 数据库连接失败
```bash
# 测试数据库连接
mysql -h localhost -u ssl_manager -p ssl_cert_system

# 检查数据库服务
sudo systemctl status mysql
```

#### Nginx配置错误
```bash
# 测试Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 性能优化

#### 系统级优化
```bash
# 增加文件描述符限制
echo "www-data soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "www-data hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

#### 数据库优化
```sql
-- 优化MySQL配置（添加到 /etc/mysql/mysql.conf.d/mysqld.cnf）
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 200
```

## 📊 监控和维护

### 健康检查
```bash
# 应用健康检查
curl http://localhost:3001/health

# 完整系统检查
./scripts/health-check.sh
```

### 日志查看
```bash
# 应用日志
sudo journalctl -u ssl-cert-system -f

# Nginx访问日志
sudo tail -f /var/log/nginx/ssl-cert-system.access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/ssl-cert-system.error.log
```

### 备份
```bash
# 数据库备份
./scripts/backup.sh

# 手动数据库备份
mysqldump -u ssl_manager -p ssl_cert_system > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🔄 更新部署

### 自动更新
```bash
# 使用部署脚本
./scripts/deploy-native.sh
```

### 手动更新
```bash
# 1. 备份当前版本
sudo cp /opt/ssl-cert-system/ssl-cert-system /opt/ssl-cert-system/ssl-cert-system.backup

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建
cd frontend && npm run build && cd ..
go build -o ssl-cert-system ./cmd/server/main.go

# 4. 重启服务
sudo systemctl restart ssl-cert-system
```

## 📞 技术支持

如果遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查系统日志和应用日志
3. 在GitHub仓库提交Issue

---

**注意**: 请根据实际环境修改配置文件中的域名、密码等信息。
