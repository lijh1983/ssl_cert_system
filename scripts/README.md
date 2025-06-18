# 部署和管理脚本

本目录包含SSL证书管理系统的部署和管理脚本，适用于原生部署环境。

## 📜 脚本列表

### 🚀 install-native.sh
**环境安装脚本**

自动安装系统环境，包括Go、Node.js、MySQL、Nginx等依赖。

```bash
# 使用方法（需要root权限）
sudo ./scripts/install-native.sh
```

**功能**：
- 检查操作系统兼容性
- 更新系统包
- 安装Go 1.21+
- 安装Node.js 18+
- 安装MySQL 8.0+
- 安装Nginx
- 配置防火墙
- 创建数据库和用户
- 生成环境配置模板

**支持系统**：Ubuntu 20.04+, Debian 11+

### 🔧 deploy-native.sh
**应用部署脚本**

自动化部署SSL证书管理系统到生产环境。

```bash
# 使用方法
./scripts/deploy-native.sh
```

**功能**：
- 检查系统依赖
- 备份当前版本
- 拉取最新代码
- 构建前端和后端
- 设置文件权限
- 重启应用服务
- 重新加载Nginx
- 执行健康检查

**前置条件**：
- 已运行 `install-native.sh`
- 应用目录存在于 `/opt/ssl-cert-system`
- 环境变量已配置

### 🔍 health-check.sh
**健康检查脚本**

全面检查系统运行状态和健康指标。

```bash
# 使用方法
./scripts/health-check.sh
```

**检查项目**：
- 系统服务状态（nginx, mysql, ssl-cert-system）
- 端口监听状态
- 应用健康状态
- 数据库连接
- 磁盘空间使用
- 内存使用情况
- 应用进程状态
- 日志错误检查
- SSL证书存储检查

**输出**：
- 彩色状态指示
- 详细健康报告
- 系统资源使用情况

### 💾 backup.sh
**备份脚本**

创建完整的系统备份，包括数据库、应用文件、配置文件等。

```bash
# 使用方法
./scripts/backup.sh
```

**备份内容**：
- 数据库（压缩SQL文件）
- 应用文件（排除临时文件）
- SSL证书文件
- 配置文件（.env, nginx, systemd）
- 备份信息文件

**备份位置**：`/opt/backups/ssl-cert-system/YYYYMMDD_HHMMSS/`

**功能**：
- 自动压缩备份文件
- 验证备份完整性
- 清理旧备份（默认保留30天）
- 生成恢复说明

## 🔧 使用流程

### 首次部署

1. **环境安装**
```bash
# 在新服务器上安装环境
sudo ./scripts/install-native.sh
```

2. **获取代码**
```bash
cd /opt/ssl-cert-system
git clone https://github.com/lijh1983/ssl_cert_system.git .
```

3. **配置环境**
```bash
cp .env.template .env
nano .env  # 修改必要配置
```

4. **部署应用**
```bash
./scripts/deploy-native.sh
```

### 日常维护

1. **更新部署**
```bash
./scripts/deploy-native.sh
```

2. **健康检查**
```bash
./scripts/health-check.sh
```

3. **创建备份**
```bash
./scripts/backup.sh
```

### 定时任务

建议设置以下定时任务：

```bash
# 编辑crontab
crontab -e

# 添加以下内容：

# 每天凌晨2点备份
0 2 * * * /opt/ssl-cert-system/scripts/backup.sh >> /var/log/ssl-cert-backup.log 2>&1

# 每小时健康检查
0 * * * * /opt/ssl-cert-system/scripts/health-check.sh >> /var/log/ssl-cert-health.log 2>&1

# 每周日凌晨4点更新部署
0 4 * * 0 /opt/ssl-cert-system/scripts/deploy-native.sh >> /var/log/ssl-cert-deploy.log 2>&1
```

## 🔧 配置说明

### 环境变量

脚本使用以下环境变量（可在脚本中修改）：

```bash
# 应用配置
APP_NAME="ssl-cert-system"
APP_DIR="/opt/ssl-cert-system"
SERVICE_NAME="ssl-cert-system"
USER="www-data"
GROUP="www-data"

# 备份配置
BACKUP_DIR="/opt/backups/ssl-cert-system"
BACKUP_KEEP_DAYS=30

# 版本配置
GO_VERSION="1.21.13"
NODE_VERSION="18"
```

### 目录结构

```
/opt/ssl-cert-system/          # 应用根目录
├── ssl-cert-system            # 应用可执行文件
├── frontend/dist/             # 前端构建文件
├── storage/certs/             # SSL证书存储
├── logs/                      # 应用日志
├── .env                       # 环境配置
└── scripts/                   # 管理脚本

/opt/backups/ssl-cert-system/  # 备份目录
└── YYYYMMDD_HHMMSS/          # 时间戳备份
    ├── database.sql.gz        # 数据库备份
    ├── application.tar.gz     # 应用文件备份
    ├── certificates.tar.gz    # 证书备份
    ├── configs/               # 配置文件备份
    └── backup_info.txt        # 备份信息
```

## 🚨 故障排除

### 脚本执行失败

1. **检查权限**
```bash
chmod +x scripts/*.sh
```

2. **检查依赖**
```bash
# 检查必要命令
which go node npm mysql nginx systemctl
```

3. **查看详细错误**
```bash
# 使用bash -x运行脚本查看详细执行过程
bash -x ./scripts/deploy-native.sh
```

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务状态
   - 验证数据库用户权限
   - 确认.env文件中的数据库配置

2. **应用启动失败**
   - 查看systemd日志：`sudo journalctl -u ssl-cert-system -f`
   - 检查端口占用：`sudo netstat -tlnp | grep :3001`
   - 验证应用文件权限

3. **Nginx配置错误**
   - 测试配置：`sudo nginx -t`
   - 查看错误日志：`sudo tail -f /var/log/nginx/error.log`

## 📞 技术支持

如果遇到问题：
1. 查看脚本输出的错误信息
2. 检查系统日志
3. 参考 [DEPLOYMENT_NATIVE.md](../DEPLOYMENT_NATIVE.md) 文档
4. 在GitHub仓库提交Issue
