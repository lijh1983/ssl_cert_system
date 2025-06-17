# SSL证书管理系统 - 快速部署版本
# 使用预构建的基础镜像，避免网络问题

# 如果有预构建的基础镜像，使用它
# FROM ghcr.io/lijh1983/ssl-cert-system-base:latest AS base

# 否则使用本地构建（网络环境好的时候）
FROM golang:1.21-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的工具
RUN apk add --no-cache git ca-certificates tzdata nodejs npm

# 复制go mod文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建前端 (如果存在)
RUN if [ -d "frontend" ]; then \
        cd frontend && \
        npm install && \
        npm run build; \
    fi

# 构建应用
ARG VERSION=1.0.2
ARG BUILD_TIME
ARG GIT_COMMIT

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static' -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}" \
    -a -installsuffix cgo \
    -o ssl-cert-system \
    cmd/server/main.go

# 最终运行镜像
FROM alpine:latest

# 安装必要的包
RUN apk --no-cache add ca-certificates tzdata curl

# 创建非root用户
RUN addgroup -g 1001 -S sslapp && \
    adduser -u 1001 -S sslapp -G sslapp

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder /app/ssl-cert-system .
COPY --from=builder /app/frontend/dist ./frontend/dist

# 创建必要的目录
RUN mkdir -p /app/storage/certs /app/logs && \
    chown -R sslapp:sslapp /app

# 复制配置文件
COPY --chown=sslapp:sslapp .env.example .env

# 切换到非root用户
USER sslapp

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 启动应用
CMD ["./ssl-cert-system"]
