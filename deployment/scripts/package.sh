#!/bin/bash

# SSL证书管理系统 - 打包脚本
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
VERSION="1.0.0"
PACKAGE_NAME="ssl-cert-system"
BUILD_DIR="deployment/dist"
PACKAGE_DIR="$BUILD_DIR/$PACKAGE_NAME-v$VERSION"

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

# 清理旧的构建文件
clean_build() {
    log_info "清理旧的构建文件..."
    
    if [[ -d "$BUILD_DIR" ]]; then
        rm -rf "$BUILD_DIR"
    fi
    
    mkdir -p "$PACKAGE_DIR"
    
    log_success "构建目录已清理"
}

# 构建前端
build_frontend() {
    log_info "构建前端应用..."
    
    cd frontend
    
    # 安装依赖
    if [[ ! -d "node_modules" ]]; then
        log_info "安装前端依赖..."
        npm ci
    fi
    
    # 构建生产版本
    log_info "构建生产版本..."
    npm run build
    
    cd ..
    
    log_success "前端构建完成"
}

# 构建后端
build_backend() {
    log_info "构建后端应用..."
    
    cd backend
    
    # 安装依赖
    if [[ ! -d "node_modules" ]]; then
        log_info "安装后端依赖..."
        npm ci --only=production
    fi
    
    # 构建TypeScript
    log_info "编译TypeScript..."
    npm run build
    
    cd ..
    
    log_success "后端构建完成"
}

# 复制文件到打包目录
copy_files() {
    log_info "复制文件到打包目录..."
    
    # 复制前端构建文件
    mkdir -p "$PACKAGE_DIR/frontend"
    cp -r frontend/dist "$PACKAGE_DIR/frontend/"
    
    # 复制后端文件
    mkdir -p "$PACKAGE_DIR/backend"
    cp -r backend/dist "$PACKAGE_DIR/backend/"
    cp -r backend/node_modules "$PACKAGE_DIR/backend/"
    cp backend/package*.json "$PACKAGE_DIR/backend/"
    
    # 复制部署文件
    cp -r deployment/docker "$PACKAGE_DIR/"
    cp -r deployment/scripts "$PACKAGE_DIR/"
    cp -r deployment/docs "$PACKAGE_DIR/"
    
    # 复制根目录文件
    cp README.md "$PACKAGE_DIR/" 2>/dev/null || echo "README.md not found"
    cp LICENSE "$PACKAGE_DIR/" 2>/dev/null || echo "LICENSE not found"
    
    log_success "文件复制完成"
}

# 创建版本信息文件
create_version_info() {
    log_info "创建版本信息文件..."
    
    cat > "$PACKAGE_DIR/VERSION" << EOF
SSL证书管理系统
版本: $VERSION
构建时间: $(date)
构建环境: $(uname -a)
Git提交: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
EOF
    
    log_success "版本信息文件已创建"
}

# 创建安装说明
create_install_guide() {
    log_info "创建安装说明..."
    
    cat > "$PACKAGE_DIR/INSTALL.md" << EOF
# SSL证书管理系统 v$VERSION 安装指南

## 快速安装

### 1. 解压文件
\`\`\`bash
tar -xzf ssl-cert-system-v$VERSION.tar.gz
cd ssl-cert-system-v$VERSION
\`\`\`

### 2. 运行安装脚本
\`\`\`bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
\`\`\`

### 3. 访问系统
- 地址: http://your-server-ip
- 默认账号: admin / admin123

## 详细文档

请查看 \`docs/DEPLOYMENT.md\` 获取详细的部署和配置说明。

## 系统要求

- Ubuntu 22.04.5 LTS
- 4GB RAM
- 20GB 磁盘空间
- Docker 20.10+
- Docker Compose 2.0+

## 技术支持

如有问题，请参考文档或联系技术支持。
EOF
    
    log_success "安装说明已创建"
}

# 创建环境配置模板
create_env_template() {
    log_info "创建环境配置模板..."
    
    cat > "$PACKAGE_DIR/.env.example" << EOF
# SSL证书管理系统环境配置模板
# 复制此文件为 .env 并修改相应配置

# 应用配置
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=ssl_cert_system
DB_USER=ssl_manager
DB_PASSWORD=your_secure_password_here

# JWT配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=24h

# Redis配置 (可选)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# 其他配置
CORS_ORIGIN=*
INIT_DB=true

# 邮件配置 (可选)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=SSL证书系统 <noreply@example.com>

# 证书配置
ACME_SERVER=https://acme-v02.api.letsencrypt.org/directory
ACME_EMAIL=your_email@example.com
EOF
    
    log_success "环境配置模板已创建"
}

# 生成校验和
generate_checksums() {
    log_info "生成文件校验和..."
    
    cd "$BUILD_DIR"
    
    # 生成MD5校验和
    find "$PACKAGE_NAME-v$VERSION" -type f -exec md5sum {} \; > "$PACKAGE_NAME-v$VERSION.md5"
    
    # 生成SHA256校验和
    find "$PACKAGE_NAME-v$VERSION" -type f -exec sha256sum {} \; > "$PACKAGE_NAME-v$VERSION.sha256"
    
    cd - > /dev/null
    
    log_success "校验和文件已生成"
}

# 创建压缩包
create_archive() {
    log_info "创建压缩包..."
    
    cd "$BUILD_DIR"
    
    # 创建tar.gz压缩包
    tar -czf "$PACKAGE_NAME-v$VERSION.tar.gz" "$PACKAGE_NAME-v$VERSION"
    
    # 创建zip压缩包
    zip -r "$PACKAGE_NAME-v$VERSION.zip" "$PACKAGE_NAME-v$VERSION" > /dev/null
    
    cd - > /dev/null
    
    log_success "压缩包已创建"
}

# 显示打包结果
show_package_info() {
    log_success "🎉 打包完成！"
    echo
    echo "📦 打包信息:"
    echo "  - 版本: $VERSION"
    echo "  - 包名: $PACKAGE_NAME"
    echo "  - 构建目录: $BUILD_DIR"
    echo
    echo "📁 生成的文件:"
    ls -lh "$BUILD_DIR"/*.tar.gz "$BUILD_DIR"/*.zip "$BUILD_DIR"/*.md5 "$BUILD_DIR"/*.sha256 2>/dev/null || true
    echo
    echo "📊 文件大小:"
    du -sh "$BUILD_DIR"/*
    echo
    echo "✅ 可以使用以下文件进行部署:"
    echo "  - $PACKAGE_NAME-v$VERSION.tar.gz (推荐)"
    echo "  - $PACKAGE_NAME-v$VERSION.zip"
    echo
    echo "🔐 校验文件:"
    echo "  - $PACKAGE_NAME-v$VERSION.md5"
    echo "  - $PACKAGE_NAME-v$VERSION.sha256"
}

# 主函数
main() {
    echo "📦 SSL证书管理系统打包脚本"
    echo "版本: $VERSION"
    echo "==============================="
    echo
    
    # 检查是否在项目根目录
    if [[ ! -f "frontend/package.json" ]] || [[ ! -f "backend/package.json" ]]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    clean_build
    build_frontend
    build_backend
    copy_files
    create_version_info
    create_install_guide
    create_env_template
    generate_checksums
    create_archive
    show_package_info
}

# 执行主函数
main "$@"
