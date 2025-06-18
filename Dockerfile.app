# SSL证书管理系统 - 应用镜像（基于基础镜像）
# 此Dockerfile基于ssl-cert-system-base基础镜像构建应用

# 第一阶段：前端构建
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm ci --only=production

# 复制前端源代码
COPY frontend/ ./

# 构建前端
RUN npm run build

# 第二阶段：Go应用构建
FROM golang:1.21-alpine AS go-builder

# 安装构建依赖
RUN apk add --no-cache git ca-certificates

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
ARG BUILD_TIME
ARG GIT_COMMIT

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static' \
              -X main.Version=${VERSION} \
              -X main.BuildTime=${BUILD_TIME} \
              -X main.GitCommit=${GIT_COMMIT}" \
    -a -installsuffix cgo \
    -o ssl-cert-system \
    ./cmd/server/main.go

# 第三阶段：最终运行镜像
FROM ssl-cert-system-base:latest

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
