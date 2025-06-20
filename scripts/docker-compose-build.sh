#!/bin/bash

# SSL证书管理系统 - Docker Compose构建脚本
# 正确设置构建参数并启动服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "SSL证书管理系统 - Docker Compose构建脚本"
    echo
    echo "用法: $0 [选项] [compose-file]"
    echo
    echo "选项:"
    echo "  -f, --file FILE     指定docker-compose文件 (默认: docker-compose.yml)"
    echo "  -b, --build         强制重新构建镜像"
    echo "  -d, --detach        后台运行服务"
    echo "  -s, --stop          停止并删除服务"
    echo "  -v, --version VER   指定版本号 (默认: 1.0.2)"
    echo "  -h, --help          显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0                                    # 使用默认配置启动"
    echo "  $0 -f docker-compose.fast.yml        # 使用快速部署配置"
    echo "  $0 -b -d                              # 强制重新构建并后台运行"
    echo "  $0 -s                                 # 停止服务"
    echo "  $0 -v 1.0.3                          # 指定版本号"
}

# 设置构建环境变量（简化版）
set_build_env() {
    log_info "设置构建环境变量..."

    # 设置版本号
    export VERSION="${VERSION:-1.0.2}"
    log_info "版本号: $VERSION"

    # 设置构建时间
    export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    log_info "构建时间: $BUILD_TIME"

    # 设置Git提交哈希（默认为unknown，适合无Git环境）
    export GIT_COMMIT="${GIT_COMMIT:-unknown}"
    log_info "Git提交: $GIT_COMMIT"

    log_success "环境变量设置完成"
}

# 检查Docker和Docker Compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不可用"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker守护进程未运行"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose未安装或不可用"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 构建并启动服务
build_and_start() {
    local compose_file="$1"
    local build_flag="$2"
    local detach_flag="$3"
    
    log_info "使用配置文件: $compose_file"
    
    # 设置构建环境变量
    set_build_env
    
    # 构建命令
    local cmd="docker-compose -f $compose_file"
    
    if [ "$build_flag" = "true" ]; then
        log_info "强制重新构建镜像..."
        $cmd build --no-cache
    fi
    
    # 启动服务
    log_info "启动服务..."
    if [ "$detach_flag" = "true" ]; then
        $cmd up -d --build
    else
        $cmd up --build
    fi
    
    log_success "服务启动完成"
}

# 停止服务
stop_services() {
    local compose_file="$1"
    
    log_info "停止服务..."
    docker-compose -f "$compose_file" down
    
    log_success "服务已停止"
}

# 主函数
main() {
    local compose_file="docker-compose.yml"
    local build_flag="false"
    local detach_flag="false"
    local stop_flag="false"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                compose_file="$2"
                shift 2
                ;;
            -b|--build)
                build_flag="true"
                shift
                ;;
            -d|--detach)
                detach_flag="true"
                shift
                ;;
            -s|--stop)
                stop_flag="true"
                shift
                ;;
            -v|--version)
                export VERSION="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                if [[ "$1" == *.yml ]] || [[ "$1" == *.yaml ]]; then
                    compose_file="$1"
                else
                    log_error "未知选项: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # 检查Docker环境
    check_docker
    
    # 检查compose文件是否存在
    if [ ! -f "$compose_file" ]; then
        log_error "Docker Compose文件不存在: $compose_file"
        exit 1
    fi
    
    log_info "开始SSL证书管理系统Docker Compose操作..."
    echo
    
    if [ "$stop_flag" = "true" ]; then
        stop_services "$compose_file"
    else
        build_and_start "$compose_file" "$build_flag" "$detach_flag"
    fi
    
    log_success "操作完成！"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
