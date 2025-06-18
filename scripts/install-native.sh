#!/bin/bash

# SSL证书管理系统 - 原生安装脚本
# 适用于Ubuntu/Debian系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="ssl-cert-system"
APP_DIR="/opt/ssl-cert-system"
SERVICE_NAME="ssl-cert-system"
NGINX_SITE="ssl-cert-system"
USER="www-data"
GROUP="www-data"
GO_VERSION="1.21.13"
NODE_VERSION="18"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        exit 1
    fi
}

# 检查操作系统
check_os() {
    log_info "检查操作系统..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "无法确定操作系统版本"
        exit 1
    fi
    
    case $OS in
        "Ubuntu"|"Debian GNU/Linux")
            log_success "支持的操作系统: $OS $VER"
            ;;
        *)
            log_warning "未测试的操作系统: $OS $VER"
            read -p "是否继续安装? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
            ;;
    esac
}

# 更新系统包
update_system() {
    log_info "更新系统包..."
    
    apt-get update
    apt-get upgrade -y
    
    log_success "系统包更新完成"
}

# 安装基础依赖
install_dependencies() {
    log_info "安装基础依赖..."
    
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        tar \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    
    log_success "基础依赖安装完成"
}

# 安装MySQL
install_mysql() {
    log_info "检查MySQL安装状态..."
    
    if systemctl is-active --quiet mysql; then
        log_success "MySQL已安装并运行"
        return 0
    fi
    
    if command -v mysql &> /dev/null; then
        log_info "MySQL已安装但未运行，启动服务..."
        systemctl start mysql
        systemctl enable mysql
        log_success "MySQL服务已启动"
        return 0
    fi
    
    log_info "安装MySQL..."
    
    # 设置MySQL root密码
    read -s -p "请设置MySQL root密码: " mysql_root_password
    echo
    
    # 预配置MySQL
    debconf-set-selections <<< "mysql-server mysql-server/root_password password $mysql_root_password"
    debconf-set-selections <<< "mysql-server mysql-server/root_password_again password $mysql_root_password"
    
    apt-get install -y mysql-server mysql-client
    
    systemctl start mysql
    systemctl enable mysql
    
    log_success "MySQL安装完成"
}

# 安装Nginx
install_nginx() {
    log_info "检查Nginx安装状态..."
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx已安装并运行"
        return 0
    fi
    
    if command -v nginx &> /dev/null; then
        log_info "Nginx已安装但未运行，启动服务..."
        systemctl start nginx
        systemctl enable nginx
        log_success "Nginx服务已启动"
        return 0
    fi
    
    log_info "安装Nginx..."
    
    apt-get install -y nginx
    
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx安装完成"
}

# 安装Go
install_go() {
    log_info "检查Go安装状态..."
    
    if command -v go &> /dev/null; then
        local current_version=$(go version | awk '{print $3}' | sed 's/go//')
        log_success "Go已安装，版本: $current_version"
        return 0
    fi
    
    log_info "安装Go $GO_VERSION..."
    
    # 下载Go
    wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
    
    # 删除旧版本
    rm -rf /usr/local/go
    
    # 安装新版本
    tar -C /usr/local -xzf /tmp/go.tar.gz
    
    # 添加到PATH
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    export PATH=$PATH:/usr/local/go/bin
    
    # 清理下载文件
    rm /tmp/go.tar.gz
    
    log_success "Go安装完成"
}

# 安装Node.js
install_nodejs() {
    log_info "检查Node.js安装状态..."
    
    if command -v node &> /dev/null; then
        local current_version=$(node --version | sed 's/v//')
        log_success "Node.js已安装，版本: $current_version"
        return 0
    fi
    
    log_info "安装Node.js $NODE_VERSION..."
    
    # 添加NodeSource仓库
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    
    # 安装Node.js
    apt-get install -y nodejs
    
    log_success "Node.js安装完成"
}

# 创建应用用户和目录
setup_app_environment() {
    log_info "设置应用环境..."
    
    # 创建应用目录
    mkdir -p "$APP_DIR"
    
    # 设置目录权限
    chown -R "$USER:$GROUP" "$APP_DIR"
    
    log_success "应用环境设置完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        # 允许SSH
        ufw allow ssh
        
        # 允许HTTP和HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # 启用防火墙（如果未启用）
        ufw --force enable
        
        log_success "防火墙配置完成"
    else
        log_warning "ufw未安装，跳过防火墙配置"
    fi
}

# 创建数据库和用户
setup_database() {
    log_info "设置数据库..."
    
    read -s -p "请输入MySQL root密码: " mysql_root_password
    echo
    
    read -p "请输入应用数据库密码: " app_db_password
    echo
    
    # 创建数据库和用户
    mysql -u root -p"$mysql_root_password" << EOF
CREATE DATABASE IF NOT EXISTS ssl_cert_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ssl_manager'@'localhost' IDENTIFIED BY '$app_db_password';
GRANT ALL PRIVILEGES ON ssl_cert_system.* TO 'ssl_manager'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    log_success "数据库设置完成"
    
    # 保存数据库密码到临时文件
    echo "$app_db_password" > /tmp/db_password
}

# 创建环境配置模板
create_env_template() {
    log_info "创建环境配置模板..."
    
    local db_password=$(cat /tmp/db_password)
    local jwt_secret=$(openssl rand -hex 32)
    
    cat > "$APP_DIR/.env.template" << EOF
# 应用配置
NODE_ENV=production
PORT=3001
APP_VERSION=1.0.2

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=$db_password

# JWT配置
JWT_SECRET=$jwt_secret

# ACME配置
ACME_SERVER=https://acme-v02.api.letsencrypt.org/directory
ACME_EMAIL=your_email@domain.com
ACME_STORAGE_PATH=$APP_DIR/storage/certs

# 日志配置
LOG_LEVEL=info
EOF
    
    # 清理临时文件
    rm -f /tmp/db_password
    
    log_success "环境配置模板创建完成"
}

# 显示安装完成信息
show_completion_info() {
    log_success "系统环境安装完成！"
    echo
    echo "📋 安装摘要："
    echo "  应用目录: $APP_DIR"
    echo "  数据库: ssl_cert_system"
    echo "  数据库用户: ssl_manager"
    echo
    echo "🔧 下一步操作："
    echo "  1. 获取应用代码:"
    echo "     cd $APP_DIR"
    echo "     git clone https://github.com/lijh1983/ssl_cert_system.git ."
    echo
    echo "  2. 配置环境变量:"
    echo "     cp .env.template .env"
    echo "     nano .env  # 修改ACME_EMAIL等配置"
    echo
    echo "  3. 运行部署脚本:"
    echo "     ./scripts/deploy-native.sh"
    echo
    echo "📚 相关文档："
    echo "  部署指南: DEPLOYMENT_NATIVE.md"
    echo "  快速开始: QUICK_START.md"
}

# 主函数
main() {
    echo "🚀 开始安装SSL证书管理系统环境..."
    echo
    
    check_root
    check_os
    update_system
    install_dependencies
    install_mysql
    install_nginx
    install_go
    install_nodejs
    setup_app_environment
    configure_firewall
    setup_database
    create_env_template
    
    show_completion_info
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
