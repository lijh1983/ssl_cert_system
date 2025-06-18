#!/bin/bash

# SSL证书管理系统 - Docker镜像构建脚本
# 用于构建基础镜像和应用镜像

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
BASE_IMAGE_NAME="ssl-cert-system-base"
APP_IMAGE_NAME="ssl-cert-system"
VERSION="${VERSION:-1.0.2}"
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')

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

# 显示帮助信息
show_help() {
    echo "SSL证书管理系统 - Docker镜像构建脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -b, --base-only     只构建基础镜像"
    echo "  -a, --app-only      只构建应用镜像（需要基础镜像存在）"
    echo "  -f, --force         强制重新构建，不使用缓存"
    echo "  -p, --push          构建后推送到镜像仓库"
    echo "  -t, --tag TAG       指定镜像标签（默认: $VERSION）"
    echo "  -h, --help          显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0                  # 构建基础镜像和应用镜像"
    echo "  $0 -b               # 只构建基础镜像"
    echo "  $0 -a               # 只构建应用镜像"
    echo "  $0 -f               # 强制重新构建所有镜像"
    echo "  $0 -p -t latest     # 构建并推送latest标签"
}

# 检查Docker是否可用
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不可用"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker守护进程未运行"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 构建基础镜像
build_base_image() {
    log_info "开始构建基础镜像: $BASE_IMAGE_NAME:$VERSION"
    
    local build_args=""
    if [ "$FORCE_BUILD" = "true" ]; then
        build_args="--no-cache"
    fi
    
    docker build $build_args \
        -f Dockerfile.base \
        -t "$BASE_IMAGE_NAME:$VERSION" \
        -t "$BASE_IMAGE_NAME:latest" \
        .
    
    log_success "基础镜像构建完成: $BASE_IMAGE_NAME:$VERSION"
}

# 构建应用镜像
build_app_image() {
    log_info "开始构建应用镜像: $APP_IMAGE_NAME:$VERSION"
    
    # 检查基础镜像是否存在
    if ! docker image inspect "$BASE_IMAGE_NAME:latest" &> /dev/null; then
        log_warning "基础镜像不存在，将先构建基础镜像"
        build_base_image
    fi
    
    local build_args=""
    if [ "$FORCE_BUILD" = "true" ]; then
        build_args="--no-cache"
    fi
    
    docker build $build_args \
        -f Dockerfile.app \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        -t "$APP_IMAGE_NAME:$VERSION" \
        -t "$APP_IMAGE_NAME:latest" \
        .
    
    log_success "应用镜像构建完成: $APP_IMAGE_NAME:$VERSION"
}

# 推送镜像到仓库
push_images() {
    log_info "推送镜像到仓库..."
    
    if [ "$BUILD_BASE_ONLY" != "true" ]; then
        log_info "推送应用镜像: $APP_IMAGE_NAME:$VERSION"
        docker push "$APP_IMAGE_NAME:$VERSION"
        docker push "$APP_IMAGE_NAME:latest"
        log_success "应用镜像推送完成"
    fi
    
    if [ "$BUILD_APP_ONLY" != "true" ]; then
        log_info "推送基础镜像: $BASE_IMAGE_NAME:$VERSION"
        docker push "$BASE_IMAGE_NAME:$VERSION"
        docker push "$BASE_IMAGE_NAME:latest"
        log_success "基础镜像推送完成"
    fi
}

# 显示镜像信息
show_image_info() {
    log_info "构建完成的镜像信息:"
    echo
    
    if [ "$BUILD_BASE_ONLY" != "true" ]; then
        echo "应用镜像:"
        docker images "$APP_IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        echo
    fi
    
    if [ "$BUILD_APP_ONLY" != "true" ]; then
        echo "基础镜像:"
        docker images "$BASE_IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        echo
    fi
    
    echo "构建信息:"
    echo "  版本: $VERSION"
    echo "  构建时间: $BUILD_TIME"
    echo "  Git提交: $GIT_COMMIT"
}

# 清理旧镜像
cleanup_old_images() {
    log_info "清理悬空镜像..."
    
    # 清理悬空镜像
    docker image prune -f
    
    log_success "镜像清理完成"
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--base-only)
                BUILD_BASE_ONLY="true"
                shift
                ;;
            -a|--app-only)
                BUILD_APP_ONLY="true"
                shift
                ;;
            -f|--force)
                FORCE_BUILD="true"
                shift
                ;;
            -p|--push)
                PUSH_IMAGES="true"
                shift
                ;;
            -t|--tag)
                VERSION="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "开始构建SSL证书管理系统Docker镜像..."
    echo
    
    check_docker
    
    # 根据参数决定构建什么
    if [ "$BUILD_APP_ONLY" = "true" ]; then
        build_app_image
    elif [ "$BUILD_BASE_ONLY" = "true" ]; then
        build_base_image
    else
        build_base_image
        build_app_image
    fi
    
    # 推送镜像（如果需要）
    if [ "$PUSH_IMAGES" = "true" ]; then
        push_images
    fi
    
    # 清理旧镜像
    cleanup_old_images
    
    # 显示镜像信息
    show_image_info
    
    log_success "所有操作完成！"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
