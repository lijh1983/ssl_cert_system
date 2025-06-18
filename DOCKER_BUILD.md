# Docker 镜像构建指南

本文档说明SSL证书管理系统的Docker镜像构建架构和使用方法。

## 📋 镜像架构

### 分层设计

我们采用分层镜像设计，将基础运行时环境和应用代码分离：

```
ssl-cert-system-base:latest (基础镜像)
├── Alpine Linux 3.18
├── 运行时依赖 (ca-certificates, curl, tzdata, dumb-init)
├── 应用用户 (appuser:1001)
├── 目录结构 (/app, /app/storage, /app/logs)
└── 基础环境配置

ssl-cert-system:latest (应用镜像)
├── FROM ssl-cert-system-base:latest
├── Go应用二进制文件
├── 前端构建文件
├── 配置文件模板
└── 启动配置
```

### 镜像文件说明

| 文件 | 用途 | 包含内容 |
|------|------|----------|
| `Dockerfile.base` | 基础镜像 | 运行时环境、系统依赖、用户、目录结构 |
| `Dockerfile.app` | 应用镜像 | 基于基础镜像，包含应用代码 |
| `Dockerfile` | 完整镜像 | 自包含的完整镜像（包含回退机制） |
| `Dockerfile.fast` | 快速部署 | 用于快速部署的简化版本 |

## 🔧 构建方法

### 方法1：使用构建脚本（推荐）

```bash
# 构建所有镜像
./scripts/build-images.sh

# 只构建基础镜像
./scripts/build-images.sh --base-only

# 只构建应用镜像
./scripts/build-images.sh --app-only

# 强制重新构建
./scripts/build-images.sh --force

# 构建并推送到仓库
./scripts/build-images.sh --push --tag v1.0.2
```

### 方法2：手动构建

#### 构建基础镜像
```bash
# 构建基础镜像
docker build -f Dockerfile.base -t ssl-cert-system-base:latest .

# 验证基础镜像
docker run --rm ssl-cert-system-base:latest whoami
```

#### 构建应用镜像
```bash
# 构建应用镜像（基于基础镜像）
docker build -f Dockerfile.app \
  --build-arg VERSION=1.0.2 \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  -t ssl-cert-system:latest .
```

#### 构建完整镜像（自包含）
```bash
# 构建完整镜像（包含回退机制）
docker build -f Dockerfile \
  --build-arg VERSION=1.0.2 \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  -t ssl-cert-system:complete .
```

### 方法3：使用 Docker Compose

```bash
# 构建并启动（会自动构建依赖的镜像）
docker-compose up --build

# 只构建不启动
docker-compose build
```

## 🚀 使用方法

### 开发环境

```bash
# 使用完整镜像（推荐用于开发）
docker-compose -f docker-compose.yml up -d

# 使用快速部署镜像
docker-compose -f docker-compose.fast.yml up -d
```

### 生产环境

```bash
# 先构建基础镜像
./scripts/build-images.sh --base-only

# 构建应用镜像
./scripts/build-images.sh --app-only

# 或者一次性构建所有镜像
./scripts/build-images.sh

# 启动生产环境
docker-compose -f docker-compose.yml up -d
```

## 📊 镜像优势

### 分层构建的优势

1. **构建效率**：
   - 基础镜像变化较少，可以重用缓存
   - 应用代码变更时只需重建应用层
   - 大幅减少构建时间

2. **存储优化**：
   - 多个应用可以共享同一个基础镜像
   - 减少镜像存储空间占用
   - 提高镜像分发效率

3. **维护便利**：
   - 基础环境和应用代码分离
   - 便于安全更新和依赖管理
   - 符合Docker最佳实践

### 安全特性

1. **非root用户**：应用以 `appuser` 用户运行
2. **最小化镜像**：基于Alpine Linux，减少攻击面
3. **信号处理**：使用 `dumb-init` 正确处理信号
4. **健康检查**：内置健康检查机制

## 🔧 高级配置

### 自定义构建参数

```bash
# 自定义版本和构建信息
docker build -f Dockerfile.app \
  --build-arg VERSION=2.0.0 \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  -t ssl-cert-system:2.0.0 .
```

### 多架构构建

```bash
# 创建多架构构建器
docker buildx create --name multiarch --use

# 构建多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.base \
  -t ssl-cert-system-base:latest \
  --push .
```

### 镜像优化

```bash
# 分析镜像层
docker history ssl-cert-system:latest

# 检查镜像大小
docker images ssl-cert-system

# 扫描安全漏洞
docker scout cves ssl-cert-system:latest
```

## 🔍 故障排除

### 常见问题

#### 基础镜像不存在
```bash
# 错误：基础镜像不存在
Error: pull access denied for ssl-cert-system-base

# 解决：先构建基础镜像
./scripts/build-images.sh --base-only
```

#### 构建缓存问题
```bash
# 清理构建缓存
docker builder prune

# 强制重新构建
./scripts/build-images.sh --force
```

#### 权限问题
```bash
# 检查文件权限
docker run --rm -it ssl-cert-system:latest ls -la /app

# 修复权限问题（在Dockerfile中）
RUN chown -R appuser:appuser /app
```

### 调试技巧

```bash
# 进入容器调试
docker run --rm -it ssl-cert-system:latest sh

# 查看构建过程
docker build --progress=plain -f Dockerfile.app .

# 检查镜像内容
docker run --rm ssl-cert-system:latest find /app -type f
```

## 📚 最佳实践

### 构建优化

1. **使用 .dockerignore**：排除不必要的文件
2. **多阶段构建**：分离构建和运行环境
3. **层缓存优化**：将变化较少的指令放在前面
4. **最小化镜像**：只安装必要的依赖

### 安全建议

1. **定期更新基础镜像**：保持系统依赖最新
2. **扫描漏洞**：定期扫描镜像安全漏洞
3. **非root运行**：始终以非特权用户运行应用
4. **最小权限原则**：只授予必要的权限

### 生产部署

1. **版本标签**：使用具体版本标签，避免使用 `latest`
2. **健康检查**：配置适当的健康检查
3. **资源限制**：设置内存和CPU限制
4. **日志管理**：配置适当的日志驱动

## 📞 技术支持

如果遇到构建问题：
1. 查看构建日志和错误信息
2. 检查Docker版本和系统环境
3. 参考故障排除部分
4. 在GitHub仓库提交Issue
