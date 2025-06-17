#!/bin/bash
# SSL证书管理系统安装脚本

set -e

echo "🚀 安装SSL证书管理系统..."

# 创建用户
if ! id "sslapp" &>/dev/null; then
    echo "📝 创建sslapp用户..."
    sudo useradd -r -s /bin/false sslapp
fi

# 创建安装目录
INSTALL_DIR="/opt/ssl-cert-system"
echo "📁 创建安装目录: $INSTALL_DIR"
sudo mkdir -p $INSTALL_DIR

# 复制文件
echo "📋 复制应用文件..."
sudo cp ssl-cert-system $INSTALL_DIR/
sudo cp .env.example $INSTALL_DIR/
sudo cp start.sh $INSTALL_DIR/
sudo chmod +x $INSTALL_DIR/ssl-cert-system
sudo chmod +x $INSTALL_DIR/start.sh

# 创建数据目录
sudo mkdir -p $INSTALL_DIR/storage/certs
sudo mkdir -p $INSTALL_DIR/logs

# 设置权限
sudo chown -R sslapp:sslapp $INSTALL_DIR

# 安装systemd服务
echo "⚙️  安装systemd服务..."
sudo cp ssl-cert-system.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ssl-cert-system

echo "✅ 安装完成！"
echo ""
echo "📝 下一步:"
echo "1. 编辑配置文件: sudo nano $INSTALL_DIR/.env"
echo "2. 启动服务: sudo systemctl start ssl-cert-system"
echo "3. 查看状态: sudo systemctl status ssl-cert-system"
echo "4. 查看日志: sudo journalctl -u ssl-cert-system -f"
