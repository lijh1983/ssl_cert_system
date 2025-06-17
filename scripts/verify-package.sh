#!/bin/bash

# SSL证书管理系统 - 发布包完整性验证脚本

set -e

echo "🔍 开始验证发布包完整性"
echo "=================================================="

PACKAGE_DIR="dist"
LINUX_PACKAGE="ssl-cert-system-go-linux-1.0.2"

# 检查发布包是否存在
if [ ! -d "$PACKAGE_DIR" ]; then
    echo "❌ 发布包目录不存在: $PACKAGE_DIR"
    exit 1
fi

echo "📦 验证Linux发布包..."

# 解压Linux包进行验证
if [ -f "$PACKAGE_DIR/$LINUX_PACKAGE.tar.gz" ]; then
    cd $PACKAGE_DIR
    tar -xzf $LINUX_PACKAGE.tar.gz
    cd ..
    
    LINUX_DIR="$PACKAGE_DIR/$LINUX_PACKAGE"
    
    # 检查必要文件
    REQUIRED_FILES=(
        "ssl-cert-system"
        ".env.example"
        ".env.production"
        "README.md"
        "DEPLOYMENT.md"
        "DEPLOYMENT_OPTIONS.md"
        "docker-compose.yml"
        "docker-compose.remote-db.yml"
        "Dockerfile"
        "nginx.conf"
        "go.mod"
        "go.sum"
        "start.sh"
        "install.sh"
        "ssl-cert-system.service"
    )
    
    echo "   检查必要文件..."
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$LINUX_DIR/$file" ]; then
            echo "   ✅ $file"
        else
            echo "   ❌ 缺少文件: $file"
        fi
    done
    
    # 检查目录
    REQUIRED_DIRS=(
        "scripts"
        "cmd/server"
        "internal"
        "frontend/dist"
    )
    
    echo "   检查必要目录..."
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ -d "$LINUX_DIR/$dir" ]; then
            echo "   ✅ $dir/"
        else
            echo "   ❌ 缺少目录: $dir/"
        fi
    done
    
    # 检查二进制文件是否可执行
    if [ -x "$LINUX_DIR/ssl-cert-system" ]; then
        echo "   ✅ 二进制文件可执行"
        
        # 测试版本信息
        VERSION_OUTPUT=$($LINUX_DIR/ssl-cert-system --version 2>/dev/null || echo "版本检查失败")
        echo "   📋 版本信息: $VERSION_OUTPUT"
    else
        echo "   ❌ 二进制文件不可执行"
    fi
    
    # 检查前端文件
    if [ -f "$LINUX_DIR/frontend/dist/index.html" ]; then
        echo "   ✅ 前端文件存在"
        FRONTEND_SIZE=$(du -sh "$LINUX_DIR/frontend/dist" | cut -f1)
        echo "   📊 前端大小: $FRONTEND_SIZE"
    else
        echo "   ❌ 前端文件缺失"
    fi
    
    # 检查Docker构建文件
    if [ -f "$LINUX_DIR/go.mod" ] && [ -f "$LINUX_DIR/go.sum" ]; then
        echo "   ✅ Go模块文件存在"
    else
        echo "   ❌ Go模块文件缺失"
    fi
    
else
    echo "❌ Linux发布包不存在: $PACKAGE_DIR/$LINUX_PACKAGE.tar.gz"
fi

echo ""
echo "ℹ️  Windows支持已移除，专注于Linux服务器部署"

echo ""
echo "🐳 验证Docker镜像..."

# 检查Docker镜像
if docker images ssl-cert-system-go:1.0.2 | grep -q "1.0.2"; then
    echo "   ✅ Docker镜像存在"
    
    # 获取镜像大小
    IMAGE_SIZE=$(docker images ssl-cert-system-go:1.0.0 --format "table {{.Size}}" | tail -n 1)
    echo "   📊 镜像大小: $IMAGE_SIZE"
    
    # 测试容器启动
    echo "   🧪 测试容器启动..."
    CONTAINER_ID=$(docker run -d --rm -e NODE_ENV=test ssl-cert-system-go:1.0.2)
    sleep 3
    
    if docker ps | grep -q $CONTAINER_ID; then
        echo "   ✅ 容器启动成功"
        docker stop $CONTAINER_ID >/dev/null 2>&1
    else
        echo "   ❌ 容器启动失败"
    fi
else
    echo "   ❌ Docker镜像不存在"
fi

echo ""
echo "📊 验证校验和文件..."

# 检查校验和文件
if [ -f "$PACKAGE_DIR/checksums.sha256" ] && [ -f "$PACKAGE_DIR/checksums.md5" ]; then
    echo "   ✅ 校验和文件存在"
    
    # 验证校验和
    cd $PACKAGE_DIR
    if sha256sum -c checksums.sha256 >/dev/null 2>&1; then
        echo "   ✅ SHA256校验通过"
    else
        echo "   ❌ SHA256校验失败"
    fi
    
    if md5sum -c checksums.md5 >/dev/null 2>&1; then
        echo "   ✅ MD5校验通过"
    else
        echo "   ❌ MD5校验失败"
    fi
    cd ..
else
    echo "   ❌ 校验和文件缺失"
fi

echo ""
echo "📋 验证总结"
echo "=================================================="

# 计算总体评分
TOTAL_CHECKS=20
PASSED_CHECKS=0

# 这里可以添加更详细的评分逻辑
echo "🎯 发布包完整性验证完成"
echo ""
echo "📝 建议检查项目:"
echo "1. 确保所有必要文件都包含在发布包中"
echo "2. 验证Docker构建可以正常工作"
echo "3. 测试前端文件可以正常访问"
echo "4. 确认版本信息正确显示"
echo "5. 验证部署脚本可以正常执行"

# 清理临时文件
rm -rf "$PACKAGE_DIR/$LINUX_PACKAGE" 2>/dev/null || true

echo ""
echo "🎉 验证脚本执行完成！"
