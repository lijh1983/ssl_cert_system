# SSL证书自动化管理系统 - 后端API

这是SSL证书自动化管理系统的后端API服务，基于Node.js + Express + TypeScript + MySQL构建。

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- MySQL >= 8.0

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置数据库连接等信息：
```env
# 数据库配置
DB_HOST=172.27.133.144
DB_PORT=3306
DB_NAME=ssl_manager
DB_USER=ssl_manager
DB_PASSWORD=your-password

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
```

### 启动开发服务器

#### 方法1: 标准npm脚本（推荐）
```bash
# 启动开发服务器
npm run dev

# 其他开发命令
npm run dev:simple    # 运行简化版应用
npm run dev:full      # 运行完整版应用（含数据库）
npm run dev:debug     # 启用Node.js调试器
npm run dev:verbose   # 详细日志模式
```

#### 方法2: 进程管理脚本（稳定运行）
```bash
# 后台启动服务器
npm run dev:start
# 或者
./scripts/dev-server.sh start

# 检查服务器状态
npm run dev:status

# 查看日志
npm run dev:logs

# 停止服务器
npm run dev:stop

# 重启服务器
npm run dev:restart
```

#### 方法3: PM2进程管理器（类生产环境）
```bash
# 全局安装PM2（可选）
npm install -g pm2

# 使用PM2启动
pm2 start ecosystem.config.js --env development

# 监控
pm2 monit

# 停止
pm2 stop ssl-cert-backend-dev
```

#### 其他命令
```bash
# 构建项目
npm run build

# 生产模式
npm start
```

## 📁 项目结构

```
backend/
├── src/
│   ├── app.ts              # 应用入口文件
│   ├── config/             # 配置文件
│   │   └── database.ts     # 数据库配置
│   ├── controllers/        # 控制器（待实现）
│   ├── middleware/         # 中间件
│   │   ├── errorHandler.ts # 错误处理中间件
│   │   └── notFoundHandler.ts # 404处理中间件
│   ├── models/             # 数据模型
│   │   ├── User.ts         # 用户模型
│   │   ├── Server.ts       # 服务器模型
│   │   ├── Certificate.ts  # 证书模型
│   │   └── index.ts        # 模型索引
│   ├── routes/             # 路由
│   │   ├── auth.ts         # 认证路由
│   │   ├── users.ts        # 用户路由
│   │   ├── servers.ts      # 服务器路由
│   │   ├── certificates.ts # 证书路由
│   │   └── monitors.ts     # 监控路由
│   ├── services/           # 业务逻辑服务（待实现）
│   ├── types/              # TypeScript类型定义（待实现）
│   └── utils/              # 工具函数
│       └── logger.ts       # 日志工具
├── dist/                   # 编译输出目录
├── logs/                   # 日志文件目录
├── uploads/                # 文件上传目录
├── .env.example            # 环境变量模板
├── .gitignore              # Git忽略文件
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
└── README.md               # 项目说明
```

## 🔌 API接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户注销
- `GET /api/auth/me` - 获取当前用户信息

### 用户管理
- `GET /api/users` - 获取用户列表
- `GET /api/users/:id` - 获取用户详情
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户

### 服务器管理
- `GET /api/servers` - 获取服务器列表
- `POST /api/servers/heartbeat` - 服务器心跳
- `GET /api/servers/:id` - 获取服务器详情
- `PUT /api/servers/:id` - 更新服务器配置
- `DELETE /api/servers/:id` - 删除服务器

### 证书管理
- `GET /api/certificates` - 获取证书列表
- `POST /api/certificates` - 申请新证书
- `GET /api/certificates/:id` - 获取证书详情
- `POST /api/certificates/:id/renew` - 续期证书
- `GET /api/certificates/:id/download` - 下载证书
- `DELETE /api/certificates/:id` - 删除证书

### 监控接口
- `GET /api/monitors/overview` - 获取监控概览
- `GET /api/monitors/expiring` - 获取即将过期的证书
- `GET /api/monitors/expired` - 获取已过期的证书
- `GET /api/monitors/servers` - 获取服务器状态
- `GET /api/monitors/stats` - 获取系统统计

## 🗄️ 数据库模型

### 用户表 (users)
- id: 主键
- username: 用户名
- email: 邮箱
- password: 密码（加密）
- is_admin: 是否管理员
- is_active: 是否激活
- last_login: 最后登录时间
- created_at/updated_at: 创建/更新时间

### 服务器表 (servers)
- id: 主键
- user_id: 用户ID（外键）
- uuid: 服务器唯一标识
- hostname: 主机名
- ip_address: IP地址
- os_type: 操作系统类型
- os_version: 操作系统版本
- web_server: Web服务器类型
- web_server_version: Web服务器版本
- status: 状态（online/offline/error）
- auto_deploy: 是否自动部署
- last_heartbeat: 最后心跳时间
- system_info: 系统信息（JSON）
- created_at/updated_at: 创建/更新时间

### 证书表 (certificates)
- id: 主键
- user_id: 用户ID（外键）
- server_id: 服务器ID（外键，可选）
- domain: 主域名
- alt_domains: 备用域名
- issuer: 证书颁发机构
- valid_from: 有效期开始时间
- valid_to: 有效期结束时间
- days_remaining: 剩余天数
- encryption_type: 加密类型（RSA/ECC）
- status: 状态（pending/issued/expired/revoked/error）
- verification_status: 验证状态（pending/verified/failed）
- cert_path: 证书文件路径
- key_path: 私钥文件路径
- ca_path: CA证书文件路径
- fullchain_path: 完整链证书文件路径
- auto_renew: 是否自动续期
- note: 备注
- created_at/updated_at: 创建/更新时间

## 🔧 开发状态

### ✅ 已完成
- [x] 项目基础结构搭建
- [x] TypeScript配置
- [x] Express应用框架
- [x] 数据库连接配置
- [x] 基础中间件（错误处理、日志、安全等）
- [x] 数据模型定义（User、Server、Certificate）
- [x] 基础路由结构
- [x] 日志系统

### ⏳ 待实现
- [ ] JWT认证中间件
- [ ] 用户认证逻辑
- [ ] 控制器层实现
- [ ] 业务逻辑服务层
- [ ] 数据验证
- [ ] 文件上传处理
- [ ] ACME客户端集成
- [ ] 证书申请和管理逻辑
- [ ] 服务器心跳和监控
- [ ] 自动续期任务
- [ ] 邮件通知
- [ ] API文档
- [ ] 单元测试
- [ ] 集成测试

## 🧪 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 📝 代码规范

```bash
# 代码检查
npm run lint

# 自动修复代码格式
npm run lint:fix
```

## 🚀 部署

1. 构建项目：
```bash
npm run build
```

2. 启动生产服务：
```bash
npm start
```

## 📞 健康检查

访问 `http://localhost:3000/health` 检查服务状态。

## 🐛 故障排除

### 常见问题

1. **服务器无法启动**
   ```bash
   # 检查依赖是否安装
   npm run deps

   # 重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **端口被占用**
   ```bash
   # 检查端口3000的使用情况
   lsof -i :3000

   # 终止占用端口3000的进程
   kill -9 $(lsof -t -i:3000)

   # 或使用不同端口
   PORT=3001 npm run dev
   ```

3. **TypeScript编译错误**
   ```bash
   # 检查TypeScript配置
   npx tsc --noEmit

   # 清理构建
   npm run build:clean
   ```

4. **进程管理问题**
   ```bash
   # 检查服务器状态
   npm run dev:status

   # 查看日志
   npm run dev:logs

   # 强制停止所有相关进程
   pkill -f "ssl-cert-system-backend"
   ```

### 日志文件
- 开发日志: `backend/logs/dev-server.log`
- PM2日志: `backend/logs/pm2-*.log`

### 健康检查
- 健康检查端点: `http://localhost:3000/health`
- 快速检查: `npm run health`

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目。
