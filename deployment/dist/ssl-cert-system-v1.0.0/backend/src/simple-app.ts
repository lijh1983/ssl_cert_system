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
  const { emailOrUsername, password } = req.body;

  // 简单的演示验证
  if ((emailOrUsername === 'admin' || emailOrUsername === 'admin@example.com') && password === 'admin123') {
    res.json({
      success: true,
      message: '登录成功',
      data: {
        token: 'demo-jwt-token-' + Date.now(),
        refreshToken: 'demo-refresh-token-' + Date.now(),
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          is_admin: true,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '用户名或密码错误',
      error: {
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误'
      }
    });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供有效的认证令牌',
      error: {
        code: 'MISSING_TOKEN',
        message: '请提供有效的认证令牌'
      }
    });
  }

  res.json({
    success: true,
    message: '获取用户信息成功',
    data: {
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      }
    }
  });
  return;
});

// 登出接口
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功',
    data: null
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
          os_type: 'Ubuntu',
          os_version: '20.04 LTS',
          web_server: 'Nginx',
          web_server_version: '1.20.1',
          status: 'online',
          auto_deploy: true,
          last_heartbeat: new Date(),
          created_at: '2024-01-01T00:00:00Z',
          updated_at: new Date()
        }
      ],
      total: 1
    }
  });
});

// 获取单个服务器详情
app.get('/api/servers/:id', (req, res) => {
  const serverId = req.params.id;

  // 演示数据
  const server = {
    id: parseInt(serverId),
    hostname: 'demo-server.example.com',
    ip_address: '192.168.1.100',
    os_type: 'Ubuntu',
    os_version: '20.04 LTS',
    web_server: 'Nginx',
    web_server_version: '1.20.1',
    status: 'online',
    auto_deploy: true,
    last_heartbeat: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
    ping_latency: 45,
    cpu_usage: 35,
    memory_usage: 68,
    disk_usage: 42,
    load_average: '0.85, 0.92, 1.05',
    uptime: '15天 8小时 32分钟',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: new Date(),
    note: '这是一个演示服务器，用于展示SSL证书管理系统的功能。\n\n服务器配置：\n- CPU: 4核心\n- 内存: 8GB\n- 磁盘: 100GB SSD\n- 网络: 1Gbps'
  };

  res.json({
    success: true,
    message: '服务器详情获取成功',
    data: {
      server: server
    }
  });
});

// 获取服务器部署的证书
app.get('/api/servers/:id/certificates', (req, res) => {
  const serverId = req.params.id;

  // 演示数据
  const certificates = [
    {
      id: 1,
      domain: 'example.com',
      status: 'deployed',
      days_remaining: 45,
      deployed_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      domain: 'api.example.com',
      status: 'deployed',
      days_remaining: 60,
      deployed_at: '2024-01-10T14:20:00Z'
    }
  ];

  res.json({
    success: true,
    message: '服务器证书列表获取成功',
    data: {
      certificates: certificates
    }
  });
});

// 测试服务器连接
app.post('/api/servers/:id/test', (req, res) => {
  const serverId = req.params.id;

  // 模拟连接测试
  setTimeout(() => {
    res.json({
      success: true,
      message: '服务器连接测试成功',
      data: {
        serverId: serverId,
        latency: Math.floor(Math.random() * 100) + 20,
        status: 'online',
        timestamp: new Date()
      }
    });
  }, 1000);
});

// 更新服务器配置
app.put('/api/servers/:id', (req, res) => {
  const serverId = req.params.id;
  const updates = req.body;

  res.json({
    success: true,
    message: '服务器配置更新成功',
    data: {
      serverId: serverId,
      updates: updates
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
      totalCertificates: 156,
      expiringSoon: 7,
      expired: 2,
      onlineServers: 24,
      successRate: 98.5,
      pendingTasks: 3
    }
  });
});

// 实时监控数据
app.get('/api/monitors/realtime/:type', (req, res) => {
  const { type } = req.params;
  const now = new Date();

  // 生成模拟实时数据
  const generateData = (baseValue: number, variance: number) => {
    const data = [];
    for (let i = 19; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
      const value = baseValue + (Math.random() - 0.5) * variance;
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.max(0, Math.min(100, Math.round(value)))
      });
    }
    return data;
  };

  let data;
  switch (type) {
    case 'cpu':
      data = generateData(35, 20);
      break;
    case 'memory':
      data = generateData(68, 15);
      break;
    case 'disk':
      data = generateData(42, 10);
      break;
    case 'network':
      data = {
        inbound: generateData(60, 30),
        outbound: generateData(40, 25)
      };
      break;
    case 'certificates':
      data = generateData(98, 5);
      break;
    default:
      data = [];
  }

  res.json({
    success: true,
    message: `${type}监控数据获取成功`,
    data: {
      type,
      data,
      timestamp: now.toISOString()
    }
  });
});

// 告警数据
app.get('/api/monitors/alerts', (req, res) => {
  const now = new Date();
  const alerts = [
    {
      id: '1',
      title: '证书即将过期',
      description: '域名 example.com 的SSL证书将在3天后过期',
      level: 'warning',
      type: 'certificate_expiring',
      source: 'certificate_monitor',
      target: 'example.com',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      read: false,
      resolved: false
    },
    {
      id: '2',
      title: '服务器离线',
      description: '服务器 web-server-01 已离线超过5分钟',
      level: 'critical',
      type: 'server_offline',
      source: 'server_monitor',
      target: 'web-server-01',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      read: false,
      resolved: false
    }
  ];

  res.json({
    success: true,
    message: '告警数据获取成功',
    data: {
      alerts,
      stats: {
        critical: alerts.filter(a => a.level === 'critical' && !a.resolved).length,
        warning: alerts.filter(a => a.level === 'warning' && !a.resolved).length,
        info: alerts.filter(a => a.level === 'info' && !a.resolved).length,
        unread: alerts.filter(a => !a.read && !a.resolved).length
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
  return;
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
