# SSL证书管理系统 v1.0.0 安装指南

## 快速安装

### 1. 解压文件
```bash
tar -xzf ssl-cert-system-v1.0.0.tar.gz
cd ssl-cert-system-v1.0.0
```

### 2. 运行安装脚本
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 3. 访问系统
- 地址: http://your-server-ip
- 默认账号: admin / admin123

## 手动安装

### 1. 安装依赖
```bash
# 前端依赖
cd frontend && npm install && npm run build && cd ..

# 后端依赖
cd backend && npm install && npm run build && cd ..
```

### 2. 使用Docker部署
```bash
docker-compose -f docker/docker-compose.yml up -d
```

## 详细文档

请查看 `docs/DEPLOYMENT.md` 获取详细的部署和配置说明。

## 系统要求

- Ubuntu 22.04.5 LTS
- Node.js 18+
- 4GB RAM
- 20GB 磁盘空间
- Docker 20.10+
- Docker Compose 2.0+

## 技术支持

如有问题，请参考文档或联系技术支持。
