#!/bin/bash

# SSL证书管理系统 - Go版本生产构建脚本

set -e

echo "🚀 开始构建SSL证书管理系统Go版本生产包"
echo "=================================================="

# 设置版本信息
VERSION="${VERSION:-1.0.2}"
BUILD_TIME="${BUILD_TIME:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

# 尝试获取Git提交哈希（生产环境可能没有.git目录）
if [ -z "$GIT_COMMIT" ]; then
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_COMMIT=$(git rev-parse --short HEAD)
        echo "ℹ️  从Git获取提交哈希: $GIT_COMMIT"
    else
        GIT_COMMIT="unknown"
        echo "⚠️  Git不可用或不在Git仓库中，使用默认值: $GIT_COMMIT"
    fi
fi

GO_VERSION=$(go version | awk '{print $3}')

# 生成版本信息文件（用于Docker构建）
if [ -f "scripts/generate-version-info.sh" ]; then
    echo "📝 生成版本信息文件..."
    chmod +x scripts/generate-version-info.sh
    ./scripts/generate-version-info.sh -f -v "$VERSION" -c "$GIT_COMMIT" -t "$BUILD_TIME"
fi

echo "📋 构建信息:"
echo "   版本: $VERSION"
echo "   构建时间: $BUILD_TIME"
echo "   Git提交: $GIT_COMMIT"
echo "   Go版本: $GO_VERSION"
echo ""

# 创建构建目录
BUILD_DIR="build"
DIST_DIR="dist"
rm -rf $BUILD_DIR $DIST_DIR
mkdir -p $BUILD_DIR $DIST_DIR

echo "🔧 开始构建前端..."

# 构建前端 (如果存在)
if [ -d "frontend" ]; then
    echo "   检测到前端项目，开始构建..."
    cd frontend

    # 检查是否有package.json
    if [ -f "package.json" ]; then
        echo "   安装前端依赖..."
        npm install

        echo "   构建前端项目..."
        npm run build

        echo "   ✅ 前端构建完成"
    else
        echo "   ⚠️  前端目录存在但没有package.json文件"
    fi

    cd ..
else
    echo "   ℹ️  未检测到前端项目，跳过前端构建"
fi

echo ""
echo "🔧 开始编译Go应用..."

# 设置构建标志
LDFLAGS="-w -s -X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME -X main.GitCommit=$GIT_COMMIT"

# 构建Linux版本 (生产环境)
echo "   构建Linux amd64版本..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="$LDFLAGS" \
    -o $BUILD_DIR/ssl-cert-system-linux-amd64 \
    cmd/server/main.go

# 构建Linux ARM64版本 (ARM服务器)
echo "   构建Linux arm64版本..."
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build \
    -ldflags="$LDFLAGS" \
    -o $BUILD_DIR/ssl-cert-system-linux-arm64 \
    cmd/server/main.go

# 注意: 已移除Windows和macOS支持以节约空间和简化部署
# 专注于Linux服务器部署

echo "✅ 编译完成"
echo ""

# 显示构建结果
echo "📊 构建结果:"
ls -lh $BUILD_DIR/

echo ""
echo "🐳 构建Docker镜像..."

# 构建生产Docker镜像
docker build \
    --build-arg VERSION=$VERSION \
    --build-arg BUILD_TIME="$BUILD_TIME" \
    --build-arg GIT_COMMIT=$GIT_COMMIT \
    -t ssl-cert-system-go:$VERSION .

docker build \
    --build-arg VERSION=$VERSION \
    --build-arg BUILD_TIME="$BUILD_TIME" \
    --build-arg GIT_COMMIT=$GIT_COMMIT \
    -t ssl-cert-system-go:latest .

echo "✅ Docker镜像构建完成"

# 显示镜像信息
echo ""
echo "📊 Docker镜像信息:"
docker images ssl-cert-system-go

echo ""
echo "📦 创建发布包..."

# 创建Linux生产包
LINUX_PACKAGE="ssl-cert-system-go-linux-$VERSION"
mkdir -p $DIST_DIR/$LINUX_PACKAGE

# 复制Linux二进制文件
cp $BUILD_DIR/ssl-cert-system-linux-amd64 $DIST_DIR/$LINUX_PACKAGE/ssl-cert-system

# 复制配置和文档文件
cp .env.example $DIST_DIR/$LINUX_PACKAGE/
cp .env.production $DIST_DIR/$LINUX_PACKAGE/
cp README.md $DIST_DIR/$LINUX_PACKAGE/
cp DEPLOYMENT.md $DIST_DIR/$LINUX_PACKAGE/
cp DEPLOYMENT_NATIVE.md $DIST_DIR/$LINUX_PACKAGE/
cp DOCKER_BUILD.md $DIST_DIR/$LINUX_PACKAGE/
cp QUICK_START.md $DIST_DIR/$LINUX_PACKAGE/
cp RELEASE_NOTES.md $DIST_DIR/$LINUX_PACKAGE/
cp docker-compose.yml $DIST_DIR/$LINUX_PACKAGE/
cp docker-compose.remote-db.yml $DIST_DIR/$LINUX_PACKAGE/
cp docker-compose.fast.yml $DIST_DIR/$LINUX_PACKAGE/
cp Dockerfile $DIST_DIR/$LINUX_PACKAGE/
cp Dockerfile.base $DIST_DIR/$LINUX_PACKAGE/
cp Dockerfile.app $DIST_DIR/$LINUX_PACKAGE/
cp Dockerfile.fast $DIST_DIR/$LINUX_PACKAGE/
cp .dockerignore $DIST_DIR/$LINUX_PACKAGE/
cp nginx.conf $DIST_DIR/$LINUX_PACKAGE/

# 复制Go源码文件 (用于Docker构建)
cp go.mod $DIST_DIR/$LINUX_PACKAGE/
cp go.sum $DIST_DIR/$LINUX_PACKAGE/

# 复制前端文件
if [ -d "frontend" ]; then
    mkdir -p $DIST_DIR/$LINUX_PACKAGE/frontend

    # 复制构建后的前端文件
    if [ -d "frontend/dist" ]; then
        cp -r frontend/dist $DIST_DIR/$LINUX_PACKAGE/frontend/
        echo "   ✅ 前端构建文件已复制"
    else
        echo "   ⚠️  前端构建文件不存在，请先运行前端构建"
    fi

    # 复制前端配置文件 (用于重新构建)
    cp frontend/package.json $DIST_DIR/$LINUX_PACKAGE/frontend/ 2>/dev/null || echo "   ⚠️  package.json不存在"
    cp frontend/vite.config.ts $DIST_DIR/$LINUX_PACKAGE/frontend/ 2>/dev/null || echo "   ⚠️  vite.config.ts不存在"
    cp frontend/tsconfig.json $DIST_DIR/$LINUX_PACKAGE/frontend/ 2>/dev/null || echo "   ⚠️  tsconfig.json不存在"
    cp frontend/tsconfig.node.json $DIST_DIR/$LINUX_PACKAGE/frontend/ 2>/dev/null || echo "   ⚠️  tsconfig.node.json不存在"
    cp frontend/index.html $DIST_DIR/$LINUX_PACKAGE/frontend/ 2>/dev/null || echo "   ⚠️  index.html不存在"

    # 复制前端源代码 (可选，用于重新构建)
    if [ -d "frontend/src" ]; then
        cp -r frontend/src $DIST_DIR/$LINUX_PACKAGE/frontend/
        echo "   ✅ 前端源代码已复制"
    fi
fi

# 复制源代码 (可选，用于重新构建)
mkdir -p $DIST_DIR/$LINUX_PACKAGE/cmd/server
cp cmd/server/main.go $DIST_DIR/$LINUX_PACKAGE/cmd/server/
cp -r internal $DIST_DIR/$LINUX_PACKAGE/

# 复制脚本文件
mkdir -p $DIST_DIR/$LINUX_PACKAGE/scripts
cp scripts/build-production.sh $DIST_DIR/$LINUX_PACKAGE/scripts/
cp scripts/build-images.sh $DIST_DIR/$LINUX_PACKAGE/scripts/
cp scripts/deploy-native.sh $DIST_DIR/$LINUX_PACKAGE/scripts/
cp scripts/install-native.sh $DIST_DIR/$LINUX_PACKAGE/scripts/
cp scripts/health-check.sh $DIST_DIR/$LINUX_PACKAGE/scripts/
cp scripts/backup.sh $DIST_DIR/$LINUX_PACKAGE/scripts/
cp scripts/verify-package.sh $DIST_DIR/$LINUX_PACKAGE/scripts/ 2>/dev/null || echo "   ⚠️  verify-package.sh不存在"
cp scripts/README.md $DIST_DIR/$LINUX_PACKAGE/scripts/

# 创建启动脚本
cat > $DIST_DIR/$LINUX_PACKAGE/start.sh << 'EOF'
#!/bin/bash
# SSL证书管理系统启动脚本

echo "🚀 启动SSL证书管理系统..."

# 检查配置文件
if [ ! -f .env ]; then
    echo "⚠️  配置文件不存在，从示例复制..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置数据库和ACME设置"
    exit 1
fi

# 创建必要目录
mkdir -p storage/certs logs

# 启动应用
echo "✅ 启动应用..."
./ssl-cert-system
EOF

chmod +x $DIST_DIR/$LINUX_PACKAGE/start.sh

# 创建systemd服务文件
cat > $DIST_DIR/$LINUX_PACKAGE/ssl-cert-system.service << 'EOF'
[Unit]
Description=SSL Certificate Management System
After=network.target mysql.service

[Service]
Type=simple
User=sslapp
WorkingDirectory=/opt/ssl-cert-system
ExecStart=/opt/ssl-cert-system/ssl-cert-system
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 创建安装脚本
cat > $DIST_DIR/$LINUX_PACKAGE/install.sh << 'EOF'
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
EOF

chmod +x $DIST_DIR/$LINUX_PACKAGE/install.sh

# 打包Linux版本
cd $DIST_DIR
tar -czf $LINUX_PACKAGE.tar.gz $LINUX_PACKAGE/
cd ..

echo "✅ Linux生产包创建完成: $DIST_DIR/$LINUX_PACKAGE.tar.gz"

# 注意: 已移除Windows包构建以节约空间
echo "ℹ️  Windows支持已移除，专注于Linux服务器部署"

# 创建校验和文件
echo ""
echo "🔐 生成校验和..."
cd $DIST_DIR
sha256sum *.tar.gz > checksums.sha256
md5sum *.tar.gz > checksums.md5
cd ..

echo "✅ 校验和文件生成完成"

echo ""
echo "📊 发布包信息:"
ls -lh $DIST_DIR/

echo ""
echo "🎉 生产版本构建完成！"
echo "=================================================="
echo "📦 发布包位置: $DIST_DIR/"
echo "🐳 Docker镜像: ssl-cert-system-go:$VERSION"
echo "📋 版本信息: $VERSION ($GIT_COMMIT)"
echo ""
echo "🚀 可以开始部署到生产环境了！"
