import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { generateToken, generateRefreshToken, verifyToken } from '../middleware/auth';
import { createError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// 用户注册
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // 检查用户是否已存在
  const existingUser = await User.findByEmailOrUsername(email);
  if (existingUser) {
    throw createError('用户名或邮箱已存在', 409);
  }

  // 创建新用户
  const user = await User.createUser({
    username,
    email,
    password
  });

  logger.info(`新用户注册: ${username} (${email})`);

  res.status(201).json({
    success: true,
    message: '用户注册成功',
    data: {
      user: user.toSafeJSON()
    }
  });
});

// 用户登录
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body;

  // 查找用户
  const user = await User.findByEmailOrUsername(emailOrUsername);
  if (!user) {
    throw createError('用户名或密码错误', 401);
  }

  // 检查用户是否激活
  if (!user.is_active) {
    throw createError('用户账户已被禁用', 401);
  }

  // 验证密码
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    throw createError('用户名或密码错误', 401);
  }

  // 更新最后登录时间
  user.last_login = new Date();
  await user.save();

  // 生成令牌
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info(`用户登录: ${user.username} (${user.email})`);

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      refreshToken,
      user: user.toSafeJSON()
    }
  });
});

// 刷新令牌
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw createError('未提供刷新令牌', 400);
  }

  try {
    // 验证刷新令牌
    const payload = verifyToken(refreshToken);
    
    // 获取用户信息
    const user = await User.findByPk(payload.userId);
    if (!user || !user.is_active) {
      throw createError('用户不存在或已被禁用', 401);
    }

    // 生成新的访问令牌
    const newToken = generateToken(user);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token: newToken,
        user: user.toSafeJSON()
      }
    });
  } catch (error) {
    throw createError('刷新令牌无效或已过期', 401);
  }
});

// 用户注销
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // 在实际应用中，可以将令牌加入黑名单
  // 这里简单返回成功消息
  
  logger.info(`用户注销: ${req.user?.username}`);

  res.json({
    success: true,
    message: '注销成功'
  });
});

// 获取当前用户信息
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createError('未认证的用户', 401);
  }

  res.json({
    success: true,
    message: '获取用户信息成功',
    data: {
      user: req.user.toSafeJSON()
    }
  });
});

// 更新当前用户信息
export const updateCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createError('未认证的用户', 401);
  }

  const { username, email } = req.body;
  const user = req.user;

  // 检查用户名是否已被其他用户使用
  if (username && username !== user.username) {
    const existingUser = await User.findOne({
      where: { username },
      attributes: ['id']
    });
    if (existingUser && existingUser.id !== user.id) {
      throw createError('用户名已被使用', 409);
    }
    user.username = username;
  }

  // 检查邮箱是否已被其他用户使用
  if (email && email !== user.email) {
    const existingUser = await User.findOne({
      where: { email },
      attributes: ['id']
    });
    if (existingUser && existingUser.id !== user.id) {
      throw createError('邮箱已被使用', 409);
    }
    user.email = email;
  }

  await user.save();

  logger.info(`用户信息更新: ${user.username} (${user.email})`);

  res.json({
    success: true,
    message: '用户信息更新成功',
    data: {
      user: user.toSafeJSON()
    }
  });
});

// 修改密码
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createError('未认证的用户', 401);
  }

  const { currentPassword, newPassword } = req.body;
  const user = req.user;

  // 验证当前密码
  const isCurrentPasswordValid = await user.validatePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw createError('当前密码错误', 400);
  }

  // 加密新密码
  const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));
  user.password = hashedNewPassword;
  await user.save();

  logger.info(`用户修改密码: ${user.username} (${user.email})`);

  res.json({
    success: true,
    message: '密码修改成功'
  });
});

export default {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  updateCurrentUser,
  changePassword
};
