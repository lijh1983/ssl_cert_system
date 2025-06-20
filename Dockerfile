# SSL证书管理系统 - 应用镜像
# 基于基础镜像构建，包含应用代码和构建过程

# 第一阶段：前端构建
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm ci

# 复制前端源代码
COPY frontend/ ./

# 构建前端
RUN npm run build

# 第二阶段：Go应用构建
FROM golang:1.21-alpine AS go-builder

# 配置Go代理（解决网络问题）
ENV GOPROXY=https://goproxy.cn,https://goproxy.io,direct
ENV GOSUMDB=sum.golang.google.cn
ENV GO111MODULE=on

# 安装构建依赖
# git ca-certificates 在alpine基础镜像中通常已存在或作为golang的一部分被依赖，如果构建失败再取消注释git
RUN apk add --no-cache ca-certificates # git

WORKDIR /app

# 复制Go模块文件
COPY go.mod go.sum ./

# 下载Go依赖
RUN go mod download

# 复制Go源代码
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# 构建应用
ARG VERSION=1.0.2
ARG GIT_COMMIT # GIT_COMMIT 将作为构建参数传入
RUN BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ') && \
    echo "Build Time: ${BUILD_TIME}" && \
    echo "Git Commit: ${GIT_COMMIT}" && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static' \
              -X main.Version=${VERSION} \
              -X main.BuildTime=${BUILD_TIME} \
              -X main.GitCommit=${GIT_COMMIT}" \
    -a -installsuffix cgo \
    -o ssl-cert-system \
    ./cmd/server/main.go

# 第三阶段：最终运行镜像
# 使用Alpine作为基础
FROM alpine:3.18 AS fallback-base

# 安装运行时依赖包
RUN apk --no-cache add \
    ca-certificates \
    curl \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建应用用户和组
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

# 创建应用目录结构
RUN mkdir -p \
    /app \
    /app/storage \
    /app/storage/certs \
    /app/logs \
    /app/config \
    /app/tmp

# 设置工作目录
WORKDIR /app

# 设置目录权限
RUN chown -R appuser:appuser /app && \
    chmod -R 755 /app && \
    chmod -R 750 /app/storage && \
    chmod -R 750 /app/logs && \
    chmod -R 750 /app/config

# 切换到非root用户
USER appuser

# 设置环境变量
ENV PATH="/app:$PATH" \
    APP_ENV=production \
    GOMAXPROCS=0

# 最终阶段：应用镜像
FROM fallback-base

# 从构建阶段复制应用文件
COPY --from=go-builder --chown=appuser:appuser /app/ssl-cert-system /app/
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/dist /app/frontend/dist

# 复制配置文件模板
COPY --chown=appuser:appuser .env.example /app/.env

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 使用dumb-init作为PID 1，提供信号处理
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# 启动应用
CMD ["./ssl-cert-system"]
