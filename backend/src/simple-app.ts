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

// API健康检查端点
app.get('/api/health', (req, res) => {
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
          alt_domains: 'www.example.com,api.example.com',
          status: 'issued',
          issuer: 'Let\'s Encrypt',
          encryption_type: 'ECC',
          auto_renew: true,
          valid_from: '2024-01-01T00:00:00Z',
          valid_to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          days_remaining: 90,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        }
      ],
      total: 1
    }
  });
});

// 获取单个证书详情
app.get('/api/certificates/:id', (req, res) => {
  const certificateId = req.params.id;

  // 演示数据
  const certificate = {
    id: parseInt(certificateId),
    domain: 'example.com',
    alt_domains: 'www.example.com,api.example.com,cdn.example.com',
    status: 'issued',
    issuer: 'Let\'s Encrypt Authority X3',
    encryption_type: 'ECC P-256',
    auto_renew: true,
    valid_from: '2024-01-01T00:00:00Z',
    valid_to: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    days_remaining: 45,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    note: '这是一个演示证书，用于展示SSL证书管理系统的功能。\n\n包含以下特性：\n- 自动续期功能\n- 多域名支持\n- ECC加密算法\n- 完整的证书链'
  };

  res.json({
    success: true,
    message: '证书详情获取成功',
    data: {
      certificate: certificate
    }
  });
});

// 证书续期
app.post('/api/certificates/:id/renew', (req, res) => {
  const certificateId = req.params.id;

  res.json({
    success: true,
    message: `证书 ${certificateId} 续期请求已提交`,
    data: {
      taskId: `renew-${certificateId}-${Date.now()}`
    }
  });
});

// 更新证书配置
app.put('/api/certificates/:id', (req, res) => {
  const certificateId = req.params.id;
  const updates = req.body;

  res.json({
    success: true,
    message: '证书配置更新成功',
    data: {
      certificateId: certificateId,
      updates: updates
    }
  });
});

// 下载证书文件
app.get('/api/certificates/:id/download/:fileType?', (req, res) => {
  const certificateId = req.params.id;
  const fileType = req.params.fileType || 'all';

  // 模拟文件下载
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}-${fileType}.${fileType === 'all' ? 'zip' : 'pem'}"`);

  res.send(`# 演示证书文件 - ${fileType}\n# 证书ID: ${certificateId}\n# 生成时间: ${new Date().toISOString()}\n\n-----BEGIN CERTIFICATE-----\nMIIFakeDataForDemo...\n-----END CERTIFICATE-----`);
});

// 简单的监控路由
app.get('/api/monitors/overview', (req, res) => {
  res.json({
    success: true,
    message: '监控概览（演示版本）',
    data: {
      totalCertificates: 1,
      expiringSoon: 0,
      expired: 0,
      healthy: 1,
      onlineServers: 1
    }
  });
});

app.get('/api/monitors/stats', (req, res) => {
  res.json({
    success: true,
    message: '系统统计（演示版本）',
    data: {
      totalCertificates: 1,
      expiringSoon: 0,
      expired: 0,
      onlineServers: 1
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
