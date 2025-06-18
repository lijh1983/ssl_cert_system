#!/bin/bash

# SSL证书管理系统 - 健康检查脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="ssl-cert-system"
SERVICE_NAME="ssl-cert-system"
APP_PORT="3001"
APP_DIR="/opt/ssl-cert-system"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌]${NC} $1"
}

# 检查系统服务
check_system_services() {
    log_info "检查系统服务状态..."
    
    local services=("nginx" "mysql" "$SERVICE_NAME")
    local all_ok=true
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log_success "$service 服务运行正常"
        else
            log_error "$service 服务未运行"
            all_ok=false
        fi
    done
    
    return $all_ok
}

# 检查端口监听
check_ports() {
    log_info "检查端口监听状态..."
    
    local ports=("80" "443" "$APP_PORT" "3306")
    local all_ok=true
    
    for port in "${ports[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            log_success "端口 $port 正在监听"
        else
            log_warning "端口 $port 未监听"
            if [ "$port" = "$APP_PORT" ]; then
                all_ok=false
            fi
        fi
    done
    
    return $all_ok
}

# 检查应用健康状态
check_app_health() {
    log_info "检查应用健康状态..."
    
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$APP_PORT/health" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ]; then
            log_success "应用健康检查通过 (HTTP $response)"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                log_warning "应用健康检查失败 (HTTP $response)，重试中... ($retry_count/$max_retries)"
                sleep 2
            else
                log_error "应用健康检查失败 (HTTP $response)"
                return 1
            fi
        fi
    done
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    local health_response=$(curl -s "http://localhost:$APP_PORT/health" 2>/dev/null || echo "{}")
    local db_connected=$(echo "$health_response" | grep -o '"connected":true' || echo "")
    
    if [ "$db_connected" = '"connected":true' ]; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查磁盘空间..."
    
    local usage=$(df "$APP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        log_success "磁盘空间充足 (使用率: ${usage}%)"
    elif [ "$usage" -lt 90 ]; then
        log_warning "磁盘空间不足 (使用率: ${usage}%)"
    else
        log_error "磁盘空间严重不足 (使用率: ${usage}%)"
        return 1
    fi
    
    return 0
}

# 检查内存使用
check_memory() {
    log_info "检查内存使用..."
    
    local mem_info=$(free | grep Mem)
    local total=$(echo $mem_info | awk '{print $2}')
    local used=$(echo $mem_info | awk '{print $3}')
    local usage=$((used * 100 / total))
    
    if [ "$usage" -lt 80 ]; then
        log_success "内存使用正常 (使用率: ${usage}%)"
    elif [ "$usage" -lt 90 ]; then
        log_warning "内存使用较高 (使用率: ${usage}%)"
    else
        log_error "内存使用过高 (使用率: ${usage}%)"
        return 1
    fi
    
    return 0
}

# 检查应用进程
check_app_process() {
    log_info "检查应用进程..."
    
    local pid=$(pgrep -f "$APP_NAME" || echo "")
    
    if [ -n "$pid" ]; then
        log_success "应用进程运行正常 (PID: $pid)"
        
        # 检查进程资源使用
        local cpu_usage=$(ps -p "$pid" -o %cpu --no-headers | tr -d ' ')
        local mem_usage=$(ps -p "$pid" -o %mem --no-headers | tr -d ' ')
        
        log_info "进程资源使用: CPU ${cpu_usage}%, 内存 ${mem_usage}%"
        
        return 0
    else
        log_error "应用进程未运行"
        return 1
    fi
}

# 检查日志文件
check_logs() {
    log_info "检查日志文件..."
    
    local log_dir="$APP_DIR/logs"
    local error_count=0
    
    if [ -d "$log_dir" ]; then
        # 检查最近的错误日志
        local recent_errors=$(find "$log_dir" -name "*.log" -mtime -1 -exec grep -i "error\|fatal\|panic" {} \; 2>/dev/null | wc -l)
        
        if [ "$recent_errors" -eq 0 ]; then
            log_success "最近24小时无错误日志"
        else
            log_warning "最近24小时发现 $recent_errors 条错误日志"
        fi
    else
        log_warning "日志目录不存在: $log_dir"
    fi
    
    # 检查systemd日志
    local systemd_errors=$(journalctl -u "$SERVICE_NAME" --since "24 hours ago" -p err --no-pager -q | wc -l)
    
    if [ "$systemd_errors" -eq 0 ]; then
        log_success "systemd日志无错误"
    else
        log_warning "systemd日志发现 $systemd_errors 条错误"
    fi
}

# 检查SSL证书存储
check_cert_storage() {
    log_info "检查SSL证书存储..."
    
    local cert_dir="$APP_DIR/storage/certs"
    
    if [ -d "$cert_dir" ]; then
        local cert_count=$(find "$cert_dir" -name "*.pem" -o -name "*.crt" | wc -l)
        log_success "证书存储目录正常，包含 $cert_count 个证书文件"
        
        # 检查目录权限
        local dir_perms=$(stat -c "%a" "$cert_dir")
        if [ "$dir_perms" = "755" ] || [ "$dir_perms" = "750" ]; then
            log_success "证书目录权限正常 ($dir_perms)"
        else
            log_warning "证书目录权限异常 ($dir_perms)"
        fi
    else
        log_warning "证书存储目录不存在: $cert_dir"
    fi
}

# 生成健康报告
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local hostname=$(hostname)
    
    echo
    echo "📊 健康检查报告"
    echo "================================"
    echo "时间: $timestamp"
    echo "主机: $hostname"
    echo "应用: $APP_NAME"
    echo "================================"
    
    # 系统信息
    echo
    echo "🖥️  系统信息:"
    echo "  操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || uname -s)"
    echo "  内核版本: $(uname -r)"
    echo "  运行时间: $(uptime -p 2>/dev/null || uptime)"
    
    # 应用信息
    if check_app_health &>/dev/null; then
        local app_info=$(curl -s "http://localhost:$APP_PORT/health" 2>/dev/null || echo "{}")
        local version=$(echo "$app_info" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "未知")
        local uptime=$(echo "$app_info" | grep -o '"uptime":"[^"]*"' | cut -d'"' -f4 || echo "未知")
        
        echo
        echo "🚀 应用信息:"
        echo "  版本: $version"
        echo "  运行时间: $uptime"
    fi
}

# 主函数
main() {
    echo "🔍 开始系统健康检查..."
    echo
    
    local overall_status=0
    
    # 执行各项检查
    check_system_services || overall_status=1
    echo
    
    check_ports || overall_status=1
    echo
    
    check_app_health || overall_status=1
    echo
    
    check_database || overall_status=1
    echo
    
    check_disk_space || overall_status=1
    echo
    
    check_memory || overall_status=1
    echo
    
    check_app_process || overall_status=1
    echo
    
    check_logs
    echo
    
    check_cert_storage
    
    # 生成报告
    generate_report
    
    echo
    if [ $overall_status -eq 0 ]; then
        log_success "所有关键检查项通过，系统运行正常！"
    else
        log_error "发现问题，请检查上述错误信息"
    fi
    
    exit $overall_status
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
