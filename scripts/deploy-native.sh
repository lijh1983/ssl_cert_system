#!/bin/bash

# SSL证书管理系统 - 原生部署脚本
# 适用于已有Nginx和MySQL环境的服务器

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
check_user() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Go
    if ! command -v go &> /dev/null; then
        log_error "Go未安装，请先安装Go 1.21+"
        exit 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装，请先安装Node.js 16+"
        exit 1
    fi
    
    # 检查MySQL
    if ! systemctl is-active --quiet mysql; then
        log_error "MySQL服务未运行"
        exit 1
    fi
    
    # 检查Nginx
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx服务未运行"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 备份当前版本
backup_current() {
    log_info "备份当前版本..."
    
    if [ -f "$APP_DIR/$APP_NAME" ]; then
        local backup_name="${APP_NAME}.backup.$(date +%Y%m%d_%H%M%S)"
        sudo cp "$APP_DIR/$APP_NAME" "$APP_DIR/$backup_name"
        log_success "已备份到: $backup_name"
    else
        log_warning "未找到现有应用文件，跳过备份"
    fi
}

# 拉取最新代码
update_code() {
    log_info "更新代码..."
    
    cd "$APP_DIR"
    
    # 检查是否为git仓库
    if [ -d ".git" ]; then
        git pull origin main
        log_success "代码更新完成"
    else
        log_warning "不是git仓库，请手动更新代码"
    fi
}

# 构建前端
build_frontend() {
    log_info "构建前端..."
    
    cd "$APP_DIR/frontend"
    
    # 安装依赖
    npm install
    
    # 构建生产版本
    npm run build
    
    log_success "前端构建完成"
}

# 构建后端
build_backend() {
    log_info "构建后端..."
    
    cd "$APP_DIR"
    
    # 下载Go依赖
    go mod download
    
    # 构建应用
    CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o "$APP_NAME" ./cmd/server/main.go
    
    # 设置执行权限
    chmod +x "$APP_NAME"
    
    log_success "后端构建完成"
}

# 设置权限
set_permissions() {
    log_info "设置文件权限..."
    
    # 创建必要目录
    mkdir -p "$APP_DIR/storage/certs" "$APP_DIR/logs"
    
    # 设置权限
    sudo chown -R "$USER:$GROUP" "$APP_DIR"
    
    # 设置环境变量文件权限
    if [ -f "$APP_DIR/.env" ]; then
        chmod 600 "$APP_DIR/.env"
    fi
    
    log_success "权限设置完成"
}

# 重启服务
restart_service() {
    log_info "重启应用服务..."
    
    # 重新加载systemd
    sudo systemctl daemon-reload
    
    # 重启服务
    sudo systemctl restart "$SERVICE_NAME"
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "服务重启成功"
    else
        log_error "服务启动失败，请检查日志："
        sudo systemctl status "$SERVICE_NAME" --no-pager -l
        exit 1
    fi
}

# 重新加载Nginx
reload_nginx() {
    log_info "重新加载Nginx配置..."
    
    # 测试配置
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "Nginx配置重新加载成功"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务完全启动
    sleep 5
    
    # 检查应用健康状态
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
    if [ "$response" = "200" ]; then
        log_success "应用健康检查通过"
    else
        log_error "应用健康检查失败 (HTTP $response)"
        return 1
    fi
    
    # 检查数据库连接
    local db_status=$(curl -s http://localhost:3001/health | grep -o '"connected":true' || echo "")
    if [ "$db_status" = '"connected":true' ]; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败"
        return 1
    fi
    
    return 0
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "📊 部署信息："
    echo "  应用目录: $APP_DIR"
    echo "  服务名称: $SERVICE_NAME"
    echo "  运行用户: $USER"
    echo
    echo "🔧 管理命令："
    echo "  查看状态: sudo systemctl status $SERVICE_NAME"
    echo "  查看日志: sudo journalctl -u $SERVICE_NAME -f"
    echo "  重启服务: sudo systemctl restart $SERVICE_NAME"
    echo
    echo "🌐 访问地址："
    echo "  前端: http://your-domain.com"
    echo "  API: http://your-domain.com/api"
    echo "  健康检查: http://your-domain.com/health"
}

# 主函数
main() {
    echo "🚀 开始部署SSL证书管理系统..."
    echo
    
    check_user
    check_dependencies
    backup_current
    update_code
    build_frontend
    build_backend
    set_permissions
    restart_service
    reload_nginx
    
    if health_check; then
        show_deployment_info
    else
        log_error "健康检查失败，请检查系统状态"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
