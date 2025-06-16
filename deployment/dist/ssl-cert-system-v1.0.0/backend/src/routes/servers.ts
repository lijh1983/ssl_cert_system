import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { validate, serverValidation, paginationValidation, idValidation } from '@/middleware/validation';
import serverController from '@/controllers/serverController';

const router = Router();

// 所有服务器路由都需要认证
router.use(authenticate);

// 获取服务器列表
router.get('/',
  validate(paginationValidation, 'query'),
  serverController.getServers
);

// 服务器注册/心跳
router.post('/heartbeat',
  validate(serverValidation.heartbeat),
  serverController.heartbeat
);

// 获取服务器统计信息
router.get('/stats',
  serverController.getServerStats
);

// 获取服务器详情
router.get('/:id',
  validate(idValidation, 'params'),
  serverController.getServer
);

// 更新服务器配置
router.put('/:id',
  validate(idValidation, 'params'),
  validate(serverValidation.update),
  serverController.updateServer
);

// 删除服务器
router.delete('/:id',
  validate(idValidation, 'params'),
  serverController.deleteServer
);

export default router;
