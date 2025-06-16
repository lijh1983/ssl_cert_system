import { Router } from 'express';
import { validate, userValidation } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import authController from '../controllers/authController';

const router = Router();

// 用户注册
router.post('/register',
  validate(userValidation.register),
  authController.register
);

// 用户登录
router.post('/login',
  validate(userValidation.login),
  authController.login
);

// 刷新令牌
router.post('/refresh',
  authController.refreshToken
);

// 用户注销
router.post('/logout',
  authenticate,
  authController.logout
);

// 获取当前用户信息
router.get('/me',
  authenticate,
  authController.getCurrentUser
);

// 更新当前用户信息
router.put('/me',
  authenticate,
  validate(userValidation.update),
  authController.updateCurrentUser
);

// 修改密码
router.put('/password',
  authenticate,
  authController.changePassword
);

export default router;
