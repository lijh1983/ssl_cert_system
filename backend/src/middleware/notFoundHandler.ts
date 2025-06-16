import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = createError(`路径 ${req.originalUrl} 未找到`, 404);
  next(error);
};

export default notFoundHandler;
