#!/bin/bash

# SSL证书管理系统 - 自动部署脚本
# 适用于 Ubuntu 22.04.5 LTS
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查系统版本
check_system() {
    log_info "检查系统版本..."
    
    if [[ ! -f /etc/os-release ]]; then
        log_error "无法检测系统版本"
        exit 1
    fi
    
    source /etc/os-release
    
    if [[ "$ID" != "ubuntu" ]]; then
        log_error "此脚本仅支持Ubuntu系统"
        exit 1
    fi
    
    if [[ "$VERSION_ID" != "22.04" ]]; then
        log_warning "推荐使用Ubuntu 22.04，当前版本: $VERSION_ID"
    fi
    
    log_success "系统检查通过: $PRETTY_NAME"
}

# 安装Docker
install_docker() {
    log_info "检查Docker安装状态..."
    
    if command -v docker &> /dev/null; then
        log_success "Docker已安装: $(docker --version)"
        return
    fi
    
    log_info "安装Docker..."
    
    # 更新包索引
    sudo apt-get update
    
    # 安装必要的包
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 设置稳定版仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    # 启动Docker服务
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log_success "Docker安装完成"
    log_warning "请重新登录以使docker组权限生效"
}

# 安装Docker Compose
install_docker_compose() {
    log_info "检查Docker Compose安装状态..."
    
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose已安装: $(docker-compose --version)"
        return
    fi
    
    log_info "安装Docker Compose..."
    
    # 下载Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 设置执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose安装完成: $(docker-compose --version)"
}

# 创建项目目录
create_project_dir() {
    log_info "创建项目目录..."
    
    PROJECT_DIR="/opt/ssl-cert-system"
    
    if [[ -d "$PROJECT_DIR" ]]; then
        log_warning "项目目录已存在: $PROJECT_DIR"
        read -p "是否要删除现有目录并重新创建? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo rm -rf "$PROJECT_DIR"
        else
            log_info "使用现有目录"
            return
        fi
    fi
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    
    log_success "项目目录创建完成: $PROJECT_DIR"
}

# 复制部署文件
copy_deployment_files() {
    log_info "复制部署文件..."
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # 复制Docker相关文件
    cp -r "$DEPLOYMENT_DIR/docker" "$PROJECT_DIR/"
    
    # 复制源代码
    cp -r "$DEPLOYMENT_DIR/../frontend" "$PROJECT_DIR/"
    cp -r "$DEPLOYMENT_DIR/../backend" "$PROJECT_DIR/"
    
    # 设置权限
    chmod +x "$PROJECT_DIR/docker/entrypoint.sh"
    
    log_success "部署文件复制完成"
}

# 配置环境变量
configure_environment() {
    log_info "配置环境变量..."
    
    ENV_FILE="$PROJECT_DIR/.env"
    
    if [[ -f "$ENV_FILE" ]]; then
        log_warning "环境配置文件已存在"
        return
    fi
    
    # 生成随机密码
    DB_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    REDIS_PASSWORD=$(openssl rand -base64 32)
    
    cat > "$ENV_FILE" << EOF
# SSL证书管理系统环境配置
# 生成时间: $(date)

# 应用配置
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=$DB_PASSWORD

# JWT配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# 其他配置
CORS_ORIGIN=*
INIT_DB=true
EOF
    
    log_success "环境配置文件创建完成"
    log_info "数据库密码: $DB_PASSWORD"
    log_info "JWT密钥: $JWT_SECRET"
    log_warning "请妥善保存以上密码信息"
}

# 构建和启动服务
start_services() {
    log_info "构建和启动服务..."
    
    cd "$PROJECT_DIR"
    
    # 构建镜像
    docker-compose -f docker/docker-compose.yml build
    
    # 启动服务
    docker-compose -f docker/docker-compose.yml up -d
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待数据库
    log_info "等待数据库启动..."
    timeout=120
    while ! docker-compose -f docker/docker-compose.yml exec -T mysql mysqladmin ping -h localhost --silent; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            log_error "数据库启动超时"
            exit 1
        fi
    done
    
    # 等待应用
    log_info "等待应用启动..."
    timeout=60
    while ! curl -f http://localhost/api/health &> /dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            log_error "应用启动超时"
            exit 1
        fi
    done
    
    log_success "所有服务已就绪"
}

# 显示部署信息
show_deployment_info() {
    log_success "🎉 SSL证书管理系统部署完成！"
    echo
    echo "📋 部署信息:"
    echo "  - 应用地址: http://$(hostname -I | awk '{print $1}')"
    echo "  - 管理后台: http://$(hostname -I | awk '{print $1}')/admin"
    echo "  - API地址: http://$(hostname -I | awk '{print $1}')/api"
    echo "  - 项目目录: $PROJECT_DIR"
    echo
    echo "🔐 默认账号:"
    echo "  - 用户名: admin"
    echo "  - 密码: admin123"
    echo "  - 请登录后立即修改密码！"
    echo
    echo "🛠️ 常用命令:"
    echo "  - 查看日志: docker-compose -f $PROJECT_DIR/docker/docker-compose.yml logs -f"
    echo "  - 重启服务: docker-compose -f $PROJECT_DIR/docker/docker-compose.yml restart"
    echo "  - 停止服务: docker-compose -f $PROJECT_DIR/docker/docker-compose.yml down"
    echo "  - 更新服务: docker-compose -f $PROJECT_DIR/docker/docker-compose.yml pull && docker-compose -f $PROJECT_DIR/docker/docker-compose.yml up -d"
    echo
}

# 主函数
main() {
    echo "🚀 SSL证书管理系统自动部署脚本"
    echo "适用于 Ubuntu 22.04.5 LTS"
    echo "========================================"
    echo
    
    check_root
    check_system
    install_docker
    install_docker_compose
    create_project_dir
    copy_deployment_files
    configure_environment
    start_services
    wait_for_services
    show_deployment_info
}

# 执行主函数
main "$@"
