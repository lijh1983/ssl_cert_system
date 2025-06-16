# SSL证书管理系统 - 多阶段构建Dockerfile
# 基于 Ubuntu 22.04.5 LTS

# 阶段1: 前端构建
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./
RUN npm ci --only=production

# 复制前端源码并构建
COPY frontend/ ./
RUN npm run build

# 阶段2: 后端构建
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制后端依赖文件
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制后端源码并构建
COPY backend/ ./
RUN npm run build

# 阶段3: 生产环境
FROM ubuntu:22.04

# 设置环境变量
ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    software-properties-common \
    nginx \
    supervisor \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# 安装Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# 创建应用用户
RUN useradd -m -s /bin/bash sslapp

# 创建应用目录
RUN mkdir -p /app/{frontend,backend,logs,data} \
    && chown -R sslapp:sslapp /app

# 切换到应用用户
USER sslapp
WORKDIR /app

# 复制构建好的前端文件
COPY --from=frontend-builder --chown=sslapp:sslapp /app/frontend/dist ./frontend/dist

# 复制构建好的后端文件
COPY --from=backend-builder --chown=sslapp:sslapp /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=sslapp:sslapp /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=sslapp:sslapp /app/backend/package*.json ./backend/

# 复制配置文件
COPY deployment/docker/nginx.conf /etc/nginx/sites-available/default
COPY deployment/docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 切换回root用户进行系统配置
USER root

# 创建日志目录
RUN mkdir -p /var/log/sslapp \
    && chown -R sslapp:sslapp /var/log/sslapp

# 配置nginx
RUN rm -f /etc/nginx/sites-enabled/default \
    && ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# 暴露端口
EXPOSE 80 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# 启动脚本
COPY deployment/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 设置启动命令
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
