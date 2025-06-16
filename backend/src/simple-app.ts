import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 压缩中间件
app.use(compression());

// 请求日志
app.use(morgan('combined'));

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API根路径
app.get('/api', (req, res) => {
  res.json({
    message: 'SSL证书自动化管理系统 API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      servers: '/api/servers',
      certificates: '/api/certificates',
      monitors: '/api/monitors'
    }
  });
});

// 简单的认证路由
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: '登录接口（演示版本）',
    data: {
      token: 'demo-jwt-token',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      }
    }
  });
});

// 简单的服务器路由
app.get('/api/servers', (req, res) => {
  res.json({
    success: true,
    message: '服务器列表（演示版本）',
    data: {
      servers: [
        {
          id: 1,
          hostname: 'demo-server.example.com',
          ip_address: '192.168.1.100',
          status: 'online',
          last_heartbeat: new Date()
        }
      ],
      total: 1
    }
  });
});

// 简单的证书路由
app.get('/api/certificates', (req, res) => {
  res.json({
    success: true,
    message: '证书列表（演示版本）',
    data: {
      certificates: [
        {
          id: 1,
          domain: 'example.com',
          status: 'issued',
          valid_to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          days_remaining: 90
        }
      ],
      total: 1
    }
  });
});

// 简单的监控路由
app.get('/api/monitors/overview', (req, res) => {
  res.json({
    success: true,
    message: '监控概览（演示版本）',
    data: {
      certificates: {
        total: 1,
        issued: 1,
        pending: 0,
        expiring_soon: 0,
        expired: 0
      },
      servers: {
        total: 1,
        online: 1,
        offline: 0,
        error: 0
      }
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `路径 ${req.originalUrl} 未找到`,
      code: 404
    }
  });
});

// 错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: {
      message: '服务器内部错误',
      code: 500
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 SSL证书管理系统后端服务启动成功`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  console.log(`📚 API文档: http://localhost:${PORT}/api`);
});

export default app;
