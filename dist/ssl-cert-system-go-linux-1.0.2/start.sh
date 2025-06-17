#!/bin/bash
# SSL证书管理系统启动脚本

echo "🚀 启动SSL证书管理系统..."

# 检查配置文件
if [ ! -f .env ]; then
    echo "⚠️  配置文件不存在，从示例复制..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置数据库和ACME设置"
    exit 1
fi

# 创建必要目录
mkdir -p storage/certs logs

# 启动应用
echo "✅ 启动应用..."
./ssl-cert-system
