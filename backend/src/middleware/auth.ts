import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { createError } from './errorHandler';
import { User } from '../models/User';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: number;
    }
  }
}

// JWT载荷接口
interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// 生成JWT令牌
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.is_admin
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  } as any);
}

// 生成刷新令牌
export function generateRefreshToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.is_admin
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  } as any);
}

// 验证JWT令牌
export function verifyToken(token: string): JWTPayload {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError('访问令牌已过期', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw createError('无效的访问令牌', 401);
    } else {
      throw createError('令牌验证失败', 401);
    }
  }
}

// 从请求头中提取令牌
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

// 认证中间件
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw createError('未提供访问令牌', 401);
    }

    const payload = verifyToken(token);
    
    // 从数据库获取用户信息
    const user = await User.findByPk(payload.userId);
    if (!user) {
      throw createError('用户不存在', 401);
    }

    if (!user.is_active) {
      throw createError('用户账户已被禁用', 401);
    }

    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    next(error);
  }
};

// 管理员权限中间件
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(createError('未认证的用户', 401));
  }

  if (!req.user.is_admin) {
    return next(createError('需要管理员权限', 403));
  }

  next();
};

// 可选认证中间件（不强制要求认证）
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyToken(token);
      const user = await User.findByPk(payload.userId);
      
      if (user && user.is_active) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // 可选认证失败时不抛出错误，继续执行
    next();
  }
};

// 检查用户是否为资源所有者或管理员
export const requireOwnershipOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(createError('未认证的用户', 401));
  }

  const resourceUserId = parseInt(req.params.userId || req.body.userId || req.query.userId as string);
  
  if (req.user.is_admin || req.user.id === resourceUserId) {
    return next();
  }

  next(createError('无权访问此资源', 403));
};

export default {
  authenticate,
  requireAdmin,
  optionalAuth,
  requireOwnershipOrAdmin,
  generateToken,
  generateRefreshToken,
  verifyToken
};
