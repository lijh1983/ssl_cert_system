import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Certificate } from '@/models/Certificate';
import { Server } from '@/models/Server';
import { User } from '@/models/User';
import { asyncHandler } from '@/middleware/errorHandler';

// 获取监控概览
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.is_admin;

  const whereClause: any = {};
  if (!isAdmin) {
    whereClause.user_id = userId;
  }

  // 证书统计
  const totalCertificates = await Certificate.count({ where: whereClause });
  
  const expiringSoon = await Certificate.count({
    where: {
      ...whereClause,
      days_remaining: {
        [Op.lte]: 30,
        [Op.gt]: 0
      },
      status: 'issued'
    }
  });

  const expired = await Certificate.count({
    where: {
      ...whereClause,
      [Op.or]: [
        { days_remaining: { [Op.lte]: 0 } },
        { status: 'expired' }
      ]
    }
  });

  const issued = await Certificate.count({
    where: {
      ...whereClause,
      status: 'issued'
    }
  });

  const pending = await Certificate.count({
    where: {
      ...whereClause,
      status: 'pending'
    }
  });

  // 服务器统计
  const serverWhereClause: any = {};
  if (!isAdmin) {
    serverWhereClause.user_id = userId;
  }

  const totalServers = await Server.count({ where: serverWhereClause });
  const onlineServers = await Server.count({
    where: {
      ...serverWhereClause,
      status: 'online'
    }
  });

  const offlineServers = await Server.count({
    where: {
      ...serverWhereClause,
      status: 'offline'
    }
  });

  const errorServers = await Server.count({
    where: {
      ...serverWhereClause,
      status: 'error'
    }
  });

  res.json({
    success: true,
    message: '获取监控概览成功',
    data: {
      certificates: {
        total: totalCertificates,
        issued,
        pending,
        expiring_soon: expiringSoon,
        expired
      },
      servers: {
        total: totalServers,
        online: onlineServers,
        offline: offlineServers,
        error: errorServers
      }
    }
  });
});

// 获取即将过期的证书
export const getExpiring = asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.query;
  const userId = req.user?.id;

  const whereClause: any = {
    days_remaining: {
      [Op.lte]: Number(days),
      [Op.gt]: 0
    },
    status: 'issued'
  };

  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificates = await Certificate.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      },
      {
        model: Server,
        as: 'Server',
        attributes: ['id', 'hostname', 'ip_address', 'status']
      }
    ],
    order: [['days_remaining', 'ASC']]
  });

  res.json({
    success: true,
    message: '获取即将过期证书成功',
    data: {
      certificates,
      total: certificates.length,
      warning_days: Number(days)
    }
  });
});

// 获取已过期的证书
export const getExpired = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const whereClause: any = {
    [Op.or]: [
      { days_remaining: { [Op.lte]: 0 } },
      { status: 'expired' }
    ]
  };

  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificates = await Certificate.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      },
      {
        model: Server,
        as: 'Server',
        attributes: ['id', 'hostname', 'ip_address', 'status']
      }
    ],
    order: [['valid_to', 'ASC']]
  });

  res.json({
    success: true,
    message: '获取已过期证书成功',
    data: {
      certificates,
      total: certificates.length
    }
  });
});

// 获取服务器状态
export const getServerStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const whereClause: any = {};
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const servers = await Server.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      }
    ],
    order: [['last_heartbeat', 'DESC']]
  });

  // 更新服务器在线状态
  for (const server of servers) {
    const currentStatus = server.getStatus();
    if (server.status !== currentStatus) {
      server.status = currentStatus;
      await server.save();
    }
  }

  const statusCounts = {
    online: 0,
    offline: 0,
    error: 0
  };

  servers.forEach(server => {
    statusCounts[server.status as keyof typeof statusCounts]++;
  });

  res.json({
    success: true,
    message: '获取服务器状态成功',
    data: {
      servers,
      counts: statusCounts,
      total: servers.length
    }
  });
});

// 获取系统统计
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const { period = '7d' } = req.query;
  const userId = req.user?.id;
  const isAdmin = req.user?.is_admin;

  // 计算时间范围
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const whereClause: any = {
    created_at: {
      [Op.gte]: startDate
    }
  };

  if (!isAdmin) {
    whereClause.user_id = userId;
  }

  // 证书申请统计
  const certificateStats = await Certificate.findAll({
    where: whereClause,
    attributes: [
      [Certificate.sequelize!.fn('DATE', Certificate.sequelize!.col('created_at')), 'date'],
      [Certificate.sequelize!.fn('COUNT', Certificate.sequelize!.col('id')), 'count']
    ],
    group: [Certificate.sequelize!.fn('DATE', Certificate.sequelize!.col('created_at'))],
    order: [[Certificate.sequelize!.fn('DATE', Certificate.sequelize!.col('created_at')), 'ASC']],
    raw: true
  });

  // 服务器注册统计
  const serverWhereClause: any = {
    created_at: {
      [Op.gte]: startDate
    }
  };

  if (!isAdmin) {
    serverWhereClause.user_id = userId;
  }

  const serverStats = await Server.findAll({
    where: serverWhereClause,
    attributes: [
      [Server.sequelize!.fn('DATE', Server.sequelize!.col('created_at')), 'date'],
      [Server.sequelize!.fn('COUNT', Server.sequelize!.col('id')), 'count']
    ],
    group: [Server.sequelize!.fn('DATE', Server.sequelize!.col('created_at'))],
    order: [[Server.sequelize!.fn('DATE', Server.sequelize!.col('created_at')), 'ASC']],
    raw: true
  });

  res.json({
    success: true,
    message: '获取系统统计成功',
    data: {
      period,
      start_date: startDate,
      end_date: now,
      certificate_stats: certificateStats,
      server_stats: serverStats
    }
  });
});

export default {
  getOverview,
  getExpiring,
  getExpired,
  getServerStatus,
  getStats
};
