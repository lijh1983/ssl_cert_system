import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import monitorController from '@/controllers/monitorController';

const router = Router();

// 所有监控路由都需要认证
router.use(authenticate);

// 获取监控概览
router.get('/overview', monitorController.getOverview);

// 获取即将过期的证书
router.get('/expiring', monitorController.getExpiring);

// 获取已过期的证书
router.get('/expired', monitorController.getExpired);

// 获取服务器状态
router.get('/servers', monitorController.getServerStatus);

// 获取系统统计
router.get('/stats', monitorController.getStats);

export default router;
