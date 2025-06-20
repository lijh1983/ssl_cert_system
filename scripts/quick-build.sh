#!/bin/bash

# SSL证书管理系统 - 快速构建脚本
# 简化版本，适合开发阶段使用，默认无Git环境

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 SSL证书管理系统 - 快速构建${NC}"
echo "=================================="

# 设置默认值
VERSION="${VERSION:-1.0.2}"
BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT="${GIT_COMMIT:-unknown}"

echo "📋 构建信息:"
echo "   版本: $VERSION"
echo "   构建时间: $BUILD_TIME"
echo "   Git提交: $GIT_COMMIT"
echo ""

# 导出环境变量
export VERSION
export BUILD_TIME
export GIT_COMMIT

# 解析命令行参数
COMPOSE_FILE="docker-compose.yml"
DETACH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--fast)
            COMPOSE_FILE="docker-compose.fast.yml"
            shift
            ;;
        -d|--detach)
            DETACH="-d"
            shift
            ;;
        -v|--version)
            VERSION="$2"
            export VERSION
            shift 2
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -f, --fast      使用快速部署配置"
            echo "  -d, --detach    后台运行"
            echo "  -v, --version   指定版本号"
            echo "  -h, --help      显示帮助"
            echo ""
            echo "示例:"
            echo "  $0              # 基本构建"
            echo "  $0 -f           # 快速部署"
            echo "  $0 -d           # 后台运行"
            echo "  $0 -v 1.0.3     # 指定版本"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 -h 查看帮助"
            exit 1
            ;;
    esac
done

echo "🔧 开始构建..."
echo "   配置文件: $COMPOSE_FILE"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose未安装"
    exit 1
fi

# 检查配置文件
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ 配置文件不存在: $COMPOSE_FILE"
    exit 1
fi

# 构建并启动
echo "🐳 构建Docker镜像..."
docker-compose -f "$COMPOSE_FILE" build

echo "🚀 启动服务..."
docker-compose -f "$COMPOSE_FILE" up $DETACH

if [ "$DETACH" = "-d" ]; then
    echo ""
    echo -e "${GREEN}✅ 服务已在后台启动${NC}"
    echo ""
    echo "📊 查看状态:"
    echo "   docker-compose -f $COMPOSE_FILE ps"
    echo ""
    echo "📋 查看日志:"
    echo "   docker-compose -f $COMPOSE_FILE logs -f"
    echo ""
    echo "🛑 停止服务:"
    echo "   docker-compose -f $COMPOSE_FILE down"
else
    echo ""
    echo -e "${GREEN}✅ 构建完成${NC}"
fi
