import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Certificate } from '@/models/Certificate';
import { Server } from '@/models/Server';
import { User } from '@/models/User';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import acmeService from '@/services/acmeService';

// 获取证书列表
export const getCertificates = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, status, domain } = req.query;
  const userId = req.user?.id;

  // 构建查询条件
  const whereClause: any = {};
  
  // 非管理员只能查看自己的证书
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  // 状态筛选
  if (status) {
    whereClause.status = status;
  }

  // 域名筛选
  if (domain) {
    whereClause[Op.or] = [
      { domain: { [Op.like]: `%${domain}%` } },
      { alt_domains: { [Op.like]: `%${domain}%` } }
    ];
  }

  // 搜索条件
  if (search) {
    whereClause[Op.or] = [
      { domain: { [Op.like]: `%${search}%` } },
      { alt_domains: { [Op.like]: `%${search}%` } },
      { issuer: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows: certificates } = await Certificate.findAndCountAll({
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
    limit: Number(limit),
    offset,
    order: [['created_at', 'DESC']]
  });

  // 更新证书剩余天数
  for (const cert of certificates) {
    await cert.updateDaysRemaining();
  }

  res.json({
    success: true,
    message: '获取证书列表成功',
    data: {
      certificates,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    }
  });
});

// 申请证书
export const createCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { domain, alt_domains, encryption_type = 'ECC' } = req.body;
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) {
    throw createError('用户信息不完整', 400);
  }

  // 检查域名是否已存在
  const existingCert = await Certificate.findOne({
    where: {
      domain,
      status: {
        [Op.in]: ['pending', 'issued']
      }
    }
  });

  if (existingCert) {
    throw createError('该域名的证书申请已存在', 400);
  }

  // 获取 DNS 验证信息
  const dnsInfo = await acmeService.getDnsValidationInfo(domain);

  // 创建证书记录
  const certificate = await Certificate.create({
    user_id: userId,
    domain,
    alt_domains: alt_domains?.join(','),
    issuer: 'Let\'s Encrypt',
    valid_from: new Date(),
    valid_to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天后过期
    encryption_type,
    status: 'pending',
    verification_status: 'pending',
    auto_renew: true
  });

  res.json({
    success: true,
    message: '证书申请已创建',
    data: {
      certificate,
      dns_validation: dnsInfo
    }
  });
});

// 获取证书详情
export const getCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能查看自己的证书
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificate = await Certificate.findOne({
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
        attributes: ['id', 'hostname', 'ip_address', 'status', 'auto_deploy']
      }
    ]
  });

  if (!certificate) {
    throw createError('证书不存在', 404);
  }

  // 更新剩余天数
  await certificate.updateDaysRemaining();

  res.json({
    success: true,
    message: '获取证书详情成功',
    data: {
      certificate
    }
  });
});

// 续期证书
export const renewCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能续期自己的证书
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificate = await Certificate.findOne({
    where: whereClause
  });

  if (!certificate) {
    throw createError('证书不存在', 404);
  }

  if (certificate.status === 'pending') {
    throw createError('证书正在申请中，无法续期', 400);
  }

  // 更新证书状态为续期中
  certificate.status = 'pending';
  certificate.verification_status = 'pending';
  await certificate.save();

  logger.info(`证书续期: ${certificate.domain} - 用户: ${req.user?.username}`);

  // TODO: 这里应该调用ACME客户端开始证书续期流程

  res.json({
    success: true,
    message: '证书续期已提交',
    data: {
      certificate
    }
  });
});

// 下载证书
export const downloadCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { format = 'zip' } = req.query;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能下载自己的证书
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificate = await Certificate.findOne({
    where: whereClause
  });

  if (!certificate) {
    throw createError('证书不存在', 404);
  }

  if (certificate.status !== 'issued') {
    throw createError('证书未签发，无法下载', 400);
  }

  // TODO: 实现证书文件打包和下载逻辑
  
  res.json({
    success: true,
    message: '证书下载功能待实现',
    data: {
      certificate_id: certificate.id,
      domain: certificate.domain,
      format,
      download_url: `/api/certificates/${id}/files/${format}`
    }
  });
});

// 删除证书
export const deleteCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能删除自己的证书
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificate = await Certificate.findOne({
    where: whereClause
  });

  if (!certificate) {
    throw createError('证书不存在', 404);
  }

  await certificate.destroy();

  logger.info(`证书删除: ${certificate.domain} - 用户: ${req.user?.username}`);

  // TODO: 删除相关的证书文件

  res.json({
    success: true,
    message: '证书删除成功',
    data: {
      id: Number(id)
    }
  });
});

// 更新证书配置
export const updateCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { auto_renew, note } = req.body;
  const userId = req.user?.id;

  const whereClause: any = { id };
  
  // 非管理员只能更新自己的证书
  if (!req.user?.is_admin) {
    whereClause.user_id = userId;
  }

  const certificate = await Certificate.findOne({
    where: whereClause
  });

  if (!certificate) {
    throw createError('证书不存在', 404);
  }

  // 更新配置
  if (typeof auto_renew === 'boolean') {
    certificate.auto_renew = auto_renew;
  }
  
  if (note !== undefined) {
    certificate.note = note;
  }

  await certificate.save();

  logger.info(`证书配置更新: ${certificate.domain} - 自动续期: ${certificate.auto_renew}`);

  res.json({
    success: true,
    message: '证书配置更新成功',
    data: {
      certificate
    }
  });
});

// 验证域名
export const verifyDomain = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const certificate = await Certificate.findOne({
    where: {
      id,
      user_id: userId,
      status: 'pending'
    }
  });

  if (!certificate) {
    throw createError('证书不存在或状态不正确', 404);
  }

  // 验证域名所有权
  const isValid = await acmeService.verifyDomain(certificate.domain);

  if (!isValid) {
    certificate.verification_status = 'failed';
    await certificate.save();
    throw createError('域名验证失败', 400);
  }

  // 申请证书
  const certPaths = await acmeService.issueCertificate(
    certificate.domain,
    certificate.alt_domains?.split(','),
    req.user?.email || '',
    certificate.encryption_type
  );

  // 更新证书信息
  certificate.status = 'issued';
  certificate.verification_status = 'verified';
  certificate.cert_path = certPaths.certPath;
  certificate.key_path = certPaths.keyPath;
  certificate.ca_path = certPaths.caPath;
  certificate.fullchain_path = certPaths.fullchainPath;
  await certificate.save();

  res.json({
    success: true,
    message: '域名验证成功，证书已签发',
    data: {
      certificate
    }
  });
});

export default {
  getCertificates,
  createCertificate,
  getCertificate,
  renewCertificate,
  downloadCertificate,
  deleteCertificate,
  updateCertificate,
  verifyDomain
};
