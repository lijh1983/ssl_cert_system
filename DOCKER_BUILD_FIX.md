# Docker构建问题解决方案

## 问题描述

在使用Docker构建SSL证书管理系统时，可能会遇到以下错误：

```
echo "Git Commit: $(git rev-parse --short HEAD)"
```

显示的是命令本身而不是实际的Git提交哈希，导致构建失败。

## 根本原因

1. **Git命令不可用**：Alpine容器中没有安装git包
2. **构建参数传递问题**：Docker Compose不会执行shell命令替换 `$()`
3. **环境变量设置错误**：构建参数没有正确传递给Docker构建过程
4. **生产环境限制**：生产环境或客户部署中通常不包含`.git`目录
5. **CI/CD环境问题**：代码从压缩包或导出文件获取，缺少Git历史

## 解决方案

### 1. Dockerfile修复

已修复两个Dockerfile文件中的git安装问题：

```dockerfile
# 修复前
RUN apk add --no-cache ca-certificates # git

# 修复后  
RUN apk add --no-cache ca-certificates git
```

### 2. Docker Compose配置修复

修复了docker-compose.yml和docker-compose.fast.yml中的构建参数：

```yaml
# 修复前 (错误 - Docker Compose不会执行shell命令)
args:
  BUILD_TIME: "${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  GIT_COMMIT: "${GIT_COMMIT:-$(git rev-parse --short HEAD)}"

# 修复后 (正确 - 依赖环境变量)
args:
  VERSION: "${VERSION:-1.0.2}"
  BUILD_TIME: "${BUILD_TIME:-unknown}"
  GIT_COMMIT: "${GIT_COMMIT:-unknown}"
```

### 3. 新增构建脚本

创建了 `scripts/docker-compose-build.sh` 脚本来正确设置环境变量：

```bash
# 自动设置构建环境变量
export GIT_COMMIT=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
export VERSION="${VERSION:-1.0.2}"

# 然后运行docker-compose
docker-compose -f docker-compose.yml up --build
```

## 使用方法

### 方法1：使用新的构建脚本（推荐）

```bash
# 基本使用
./scripts/docker-compose-build.sh

# 使用快速部署配置
./scripts/docker-compose-build.sh -f docker-compose.fast.yml

# 强制重新构建并后台运行
./scripts/docker-compose-build.sh -b -d

# 指定版本号
./scripts/docker-compose-build.sh -v 1.0.3

# 停止服务
./scripts/docker-compose-build.sh -s
```

### 方法2：手动设置环境变量

```bash
# 设置环境变量
export GIT_COMMIT=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
export VERSION="1.0.2"

# 运行docker-compose
docker-compose -f docker-compose.yml up --build -d
```

### 方法3：使用现有的构建脚本

```bash
# 使用更新后的镜像构建脚本
./scripts/build-images.sh

# 只构建应用镜像
./scripts/build-images.sh -a

# 强制重新构建
./scripts/build-images.sh -f
```

## 验证构建结果

构建完成后，可以验证版本信息是否正确：

```bash
# 检查版本信息
docker run --rm ssl-cert-system:latest ./ssl-cert-system -version
```

应该显示类似以下内容：

```
SSL Certificate Management System (Go Edition)
Version: 1.0.2
Build Time: 2025-06-20T02:00:00Z
Git Commit: abc1234
Go Version: go1.21+
```

## 故障排除

### 1. Git命令不可用

如果在构建环境中git不可用：

```bash
# 手动设置Git提交哈希
export GIT_COMMIT="manual-build"
./scripts/docker-compose-build.sh
```

### 2. 权限问题

确保脚本有执行权限：

```bash
chmod +x scripts/docker-compose-build.sh
```

### 3. Docker Compose版本问题

脚本支持新旧版本的Docker Compose：
- `docker-compose` (旧版本)
- `docker compose` (新版本，作为Docker插件)

## 最佳实践

1. **使用构建脚本**：推荐使用 `scripts/docker-compose-build.sh` 来确保环境变量正确设置
2. **CI/CD集成**：在CI/CD管道中，确保在运行docker-compose之前设置正确的环境变量
3. **版本管理**：使用Git标签来管理版本号，脚本会自动获取Git提交哈希
4. **环境隔离**：为不同环境（开发、测试、生产）使用不同的docker-compose文件

### 4. 生产环境和CI/CD问题

在生产环境中，代码通常不包含`.git`目录，需要特殊处理：

```bash
# 生产环境构建（指定版本信息）
export VERSION="1.0.3"
export GIT_COMMIT="abc1234"  # 从CI/CD系统获取
export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# 使用生产构建脚本
./scripts/build-production.sh -v 1.0.3 -c abc1234

# 或使用CI/CD构建脚本
./scripts/ci-build.sh -v 1.0.3 -c abc1234 -p
```

### 5. 版本信息预生成

使用版本信息生成脚本：

```bash
# 生成版本信息文件
./scripts/generate-version-info.sh -v 1.0.3 -c abc1234

# 然后进行Docker构建
docker-compose up --build
```

## 生产环境解决方案

### 新增脚本和功能

1. **版本信息生成脚本** (`scripts/generate-version-info.sh`)
   - 自动生成版本信息文件
   - 支持无Git环境
   - 生成Go版本信息包

2. **CI/CD构建脚本** (`scripts/ci-build.sh`)
   - 专为CI/CD环境设计
   - 支持镜像推送
   - 环境变量友好

3. **更新的生产构建脚本** (`scripts/build-production.sh`)
   - 支持版本信息预生成
   - 兼容无Git环境

### Docker构建改进

- 支持预生成的版本信息文件
- 更好的错误处理
- 兼容生产环境限制

## 相关文件

### 核心文件
- `Dockerfile` - 主要的Docker构建文件
- `Dockerfile.app` - 应用镜像构建文件
- `Dockerfile.base` - 基础镜像构建文件
- `docker-compose.yml` - 本地开发环境配置
- `docker-compose.fast.yml` - 快速部署配置

### 构建脚本
- `scripts/docker-compose-build.sh` - 智能构建脚本
- `scripts/generate-version-info.sh` - 版本信息生成脚本
- `scripts/ci-build.sh` - CI/CD构建脚本
- `scripts/build-production.sh` - 生产环境构建脚本
- `scripts/build-images.sh` - 镜像构建脚本

### 配置文件
- `.env.example` - 环境变量示例文件
- `.dockerignore` - Docker忽略文件（已更新）
- `version_info.txt` - 版本信息文件（自动生成）
- `internal/version/version.go` - Go版本信息包（自动生成）
