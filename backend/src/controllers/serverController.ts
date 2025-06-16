import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Server } from '@/models/Server';
import { User } from '@/models/User';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

// 获取服务器列表
export const getServers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const userId = req.user?.id;

  // 构建查询条件
  const whereClause: any = {};
  
  // 非管理员只能查看自己的服务器
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  // 状态筛选
  if (status) {
    whereClause.status = status;
  }

  // 搜索条件
  if (search) {
    whereClause[Op.or] = [
      { hostname: { [Op.like]: `%${search}%` } },
      { ip_address: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows: servers } = await Server.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      }
    ],
    limit: Number(limit),
    offset,
    order: [['created_at', 'DESC']]
  });

  // 更新服务器在线状态
  for (const server of servers) {
    const currentStatus = server.getStatus();
    if (server.status !== currentStatus) {
      server.status = currentStatus;
      await server.save();
    }
  }

  res.json({
    success: true,
    message: '获取服务器列表成功',
    data: {
      servers,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// 服务器心跳/注册
export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const {
    uuid,
    hostname,
    ip_address,
    os_type,
    os_version,
    web_server,
    web_server_version,
    system_info
  } = req.body;

  const userId = req.user?.id;
  if (!userId) {
    throw createError('未认证的用户', 401);
  }

  // 查找现有服务器
  let server = await Server.findOne({
    where: { uuid }
  });

  if (server) {
    // 检查服务器是否属于当前用户
    if (server.user_id !== userId && !req.user?.is_admin) {
      throw createError('无权访问此服务器', 403);
    }

    // 更新服务器信息
    server.hostname = hostname;
    server.ip_address = ip_address;
    server.os_type = os_type;
    server.os_version = os_version;
    server.web_server = web_server;
    server.web_server_version = web_server_version;
    server.system_info = system_info;
    await server.updateHeartbeat();

    logger.info(`服务器心跳更新: ${hostname} (${ip_address})`);
  } else {
    // 创建新服务器
    server = await Server.create({
      user_id: userId,
      uuid,
      hostname,
      ip_address,
      os_type,
      os_version,
      web_server,
      web_server_version,
      system_info,
      status: 'online',
      last_heartbeat: new Date()
    });

    logger.info(`新服务器注册: ${hostname} (${ip_address})`);
  }

  res.json({
    success: true,
    message: server ? '服务器心跳更新成功' : '服务器注册成功',
    data: {
      server: {
        id: server.id,
        uuid: server.uuid,
        hostname: server.hostname,
        status: server.status,
        auto_deploy: server.auto_deploy
      }
    }
  });
});

// 获取服务器详情
export const getServer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能查看自己的服务器
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const server = await Server.findOne({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      }
    ]
  });

  if (!server) {
    throw createError('服务器不存在', 404);
  }

  // 更新在线状态
  const currentStatus = server.getStatus();
  if (server.status !== currentStatus) {
    server.status = currentStatus;
    await server.save();
  }

  res.json({
    success: true,
    message: '获取服务器详情成功',
    data: {
      server
    }
  });
});

// 更新服务器配置
export const updateServer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { auto_deploy } = req.body;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能更新自己的服务器
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const server = await Server.findOne({
    where: whereClause
  });

  if (!server) {
    throw createError('服务器不存在', 404);
  }

  // 更新配置
  if (typeof auto_deploy === 'boolean') {
    server.auto_deploy = auto_deploy;
  }

  await server.save();

  logger.info(`服务器配置更新: ${server.hostname} - 自动部署: ${server.auto_deploy}`);

  res.json({
    success: true,
    message: '服务器配置更新成功',
    data: {
      server
    }
  });
});

// 删除服务器
export const deleteServer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能删除自己的服务器
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const server = await Server.findOne({
    where: whereClause
  });

  if (!server) {
    throw createError('服务器不存在', 404);
  }

  await server.destroy();

  logger.info(`服务器删除: ${server.hostname} (${server.ip_address})`);

  res.json({
    success: true,
    message: '服务器删除成功',
    data: {
      id: Number(id)
    }
  });
});

// 获取服务器统计信息
export const getServerStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.is_admin;

  const whereClause: any = {};
  if (!isAdmin) {
    whereClause.user_id = userId;
  }

  const totalServers = await Server.count({ where: whereClause });
  const onlineServers = await Server.getOnlineCount();
  
  const statusCounts = await Server.findAll({
    where: whereClause,
    attributes: [
      'status',
      [Server.sequelize!.fn('COUNT', Server.sequelize!.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  const stats = {
    total: totalServers,
    online: onlineServers,
    offline: 0,
    error: 0
  };

  statusCounts.forEach((item: any) => {
    if (item.status === 'offline') {
      stats.offline = parseInt(item.count);
    } else if (item.status === 'error') {
      stats.error = parseInt(item.count);
    }
  });

  res.json({
    success: true,
    message: '获取服务器统计成功',
    data: {
      stats
    }
  });
});

export default {
  getServers,
  heartbeat,
  getServer,
  updateServer,
  deleteServer,
  getServerStats
};
