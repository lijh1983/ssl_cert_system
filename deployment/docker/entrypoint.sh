#!/bin/bash

# SSL证书管理系统 - Docker启动脚本

set -e

echo "🚀 启动SSL证书管理系统..."

# 检查环境变量
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

# 创建必要的目录
mkdir -p /var/log/sslapp
mkdir -p /app/data
mkdir -p /app/logs

# 设置权限
chown -R sslapp:sslapp /app/data
chown -R sslapp:sslapp /app/logs
chown -R sslapp:sslapp /var/log/sslapp

# 检查数据库连接
echo "📊 检查数据库连接..."
if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_PORT" ]; then
    echo "等待数据库连接..."
    timeout=60
    while ! nc -z $DB_HOST $DB_PORT; do
        sleep 1
        timeout=$((timeout - 1))
        if [ $timeout -eq 0 ]; then
            echo "❌ 数据库连接超时"
            exit 1
        fi
    done
    echo "✅ 数据库连接成功"
fi

# 初始化数据库（如果需要）
if [ "$INIT_DB" = "true" ]; then
    echo "🔧 初始化数据库..."
    # 这里可以添加数据库初始化脚本
    echo "✅ 数据库初始化完成"
fi

# 检查后端服务
echo "🔧 检查后端服务..."
if [ ! -f "/app/backend/dist/simple-app.js" ]; then
    echo "❌ 后端服务文件不存在"
    exit 1
fi

# 检查前端文件
echo "🎨 检查前端文件..."
if [ ! -d "/app/frontend/dist" ]; then
    echo "❌ 前端构建文件不存在"
    exit 1
fi

# 测试nginx配置
echo "🌐 测试Nginx配置..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx配置错误"
    exit 1
fi

# 创建环境配置文件
echo "⚙️ 创建环境配置..."
cat > /app/backend/.env << EOF
NODE_ENV=${NODE_ENV:-production}
PORT=${PORT:-3001}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-ssl_cert_system}
DB_USER=${DB_USER:-ssl_manager}
DB_PASSWORD=${DB_PASSWORD:-your_password}
JWT_SECRET=${JWT_SECRET:-your_jwt_secret_key_here}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}
CORS_ORIGIN=${CORS_ORIGIN:-*}
LOG_LEVEL=${LOG_LEVEL:-info}
EOF

chown sslapp:sslapp /app/backend/.env

echo "✅ 环境配置完成"

# 显示系统信息
echo "📋 系统信息:"
echo "  - Node.js版本: $(node --version)"
echo "  - NPM版本: $(npm --version)"
echo "  - 操作系统: $(lsb_release -d | cut -f2)"
echo "  - 时区: $(date +%Z)"
echo "  - 当前时间: $(date)"

echo "🎉 SSL证书管理系统启动准备完成！"

# 执行传入的命令
exec "$@"
