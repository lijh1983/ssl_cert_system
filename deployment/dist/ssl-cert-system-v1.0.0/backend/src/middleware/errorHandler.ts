import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // 记录错误日志
  logger.error(`Error ${statusCode}: ${message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: error.stack
  });

  // Sequelize错误处理
  if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = '数据已存在，违反唯一性约束';
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = '外键约束错误';
  } else if (error.name === 'SequelizeConnectionError') {
    statusCode = 503;
    message = '数据库连接错误';
  }

  // JWT错误处理
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的访问令牌';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '访问令牌已过期';
  }

  // 语法错误处理
  if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = '请求数据格式错误';
  }

  // 生产环境不暴露详细错误信息
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    message = '服务器内部错误';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

// 异步错误处理包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 创建错误的便捷方法
export const createError = (message: string, statusCode: number = 500): CustomError => {
  return new CustomError(message, statusCode);
};

export default errorHandler;
