# GitHub Actions 工作流说明

本目录包含SSL证书管理系统的GitHub Actions工作流配置文件。

## 📁 工作流文件

### 1. `main.yml` - 基础镜像构建
**用途**: 构建和推送Docker基础镜像到GitHub Container Registry

**触发条件**:
- 手动触发 (workflow_dispatch)
- 推送到main分支时，如果修改了相关文件
- PR到main分支时 (仅构建，不推送)

**功能**:
- 🐳 构建多架构Docker基础镜像 (linux/amd64, linux/arm64)
- 📦 推送到GitHub Container Registry
- 🧪 测试镜像是否能正常启动
- 🔄 自动更新Dockerfile.fast中的基础镜像引用

**镜像地址**: `ghcr.io/lijh1983/ssl_cert_system-base:latest`

### 2. `release.yml` - 发布构建
**用途**: 完整的发布流程，包括构建应用和创建GitHub Release

**触发条件**:
- 推送Git标签 (v*)
- 手动触发发布

**功能**:
- 🔧 构建前端和后端应用
- 📦 生成完整发布包
- 🐳 构建并推送基础镜像和应用镜像
- 🏷️ 创建GitHub Release
- 📋 上传发布文件和校验和

## 🚀 使用方法

### 构建基础镜像

#### 方法1: 手动触发
1. 进入GitHub仓库的Actions页面
2. 选择"Build Docker Base Image"工作流
3. 点击"Run workflow"
4. 设置参数:
   - `version`: 镜像版本标签 (默认: latest)
   - `push_to_registry`: 是否推送到注册表 (默认: true)

#### 方法2: 自动触发
修改以下文件之一并推送到main分支:
- `Dockerfile.base`
- `go.mod`
- `go.sum`
- `frontend/package.json`

### 创建发布版本

#### 方法1: Git标签触发
```bash
# 创建并推送标签
git tag v1.0.3
git push origin v1.0.3
```

#### 方法2: 手动触发
1. 进入GitHub仓库的Actions页面
2. 选择"Build and Release"工作流
3. 点击"Run workflow"
4. 设置参数:
   - `version`: 发布版本号 (例如: v1.0.3)
   - `create_release`: 是否创建GitHub Release

## 🐳 Docker镜像

### 基础镜像
```bash
# 拉取最新基础镜像
docker pull ghcr.io/lijh1983/ssl_cert_system-base:latest

# 拉取特定版本
docker pull ghcr.io/lijh1983/ssl_cert_system-base:v1.0.2
```

### 应用镜像
```bash
# 拉取最新应用镜像
docker pull ghcr.io/lijh1983/ssl_cert_system:latest

# 拉取特定版本
docker pull ghcr.io/lijh1983/ssl_cert_system:v1.0.2
```

## 🔧 配置说明

### 环境变量
- `REGISTRY`: 容器注册表地址 (ghcr.io)
- `IMAGE_NAME`: 镜像名称
- `BASE_IMAGE_NAME`: 基础镜像名称

### 权限要求
工作流需要以下权限:
- `contents: read` - 读取仓库内容
- `packages: write` - 推送到GitHub Container Registry
- `contents: write` - 创建Release (仅release.yml)

### 缓存策略
- 使用GitHub Actions缓存 (gha) 加速构建
- 支持多架构构建缓存

## 📋 工作流状态

### 成功指标
- ✅ 镜像构建成功
- ✅ 镜像推送到注册表
- ✅ 镜像测试通过
- ✅ 发布文件上传成功

### 故障排查
1. **构建失败**: 检查Dockerfile语法和依赖
2. **推送失败**: 检查GitHub Token权限
3. **测试失败**: 检查应用启动配置
4. **发布失败**: 检查标签格式和权限

## 🔗 相关链接
- [GitHub Container Registry](https://github.com/features/packages)
- [Docker Buildx文档](https://docs.docker.com/buildx/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
