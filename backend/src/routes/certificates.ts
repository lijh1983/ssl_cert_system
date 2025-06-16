import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { validate, certificateValidation, paginationValidation, idValidation } from '@/middleware/validation';
import certificateController from '@/controllers/certificateController';

const router = Router();

// 所有证书路由都需要认证
router.use(authenticate);

// 获取证书列表
router.get('/',
  validate(paginationValidation, 'query'),
  certificateController.getCertificates
);

// 申请新证书
router.post('/',
  validate(certificateValidation.create, 'body'),
  certificateController.createCertificate
);

// 获取证书详情
router.get('/:id',
  validate(idValidation, 'params'),
  certificateController.getCertificate
);

// 更新证书配置
router.put('/:id',
  validate(idValidation, 'params'),
  validate(certificateValidation.update),
  certificateController.updateCertificate
);

// 续期证书
router.post('/:id/renew',
  validate(idValidation, 'params'),
  certificateController.renewCertificate
);

// 下载证书
router.get('/:id/download',
  validate(idValidation, 'params'),
  certificateController.downloadCertificate
);

// 删除证书
router.delete('/:id',
  validate(idValidation, 'params'),
  certificateController.deleteCertificate
);

// 验证域名
router.post('/:id/verify',
  validate(idValidation, 'params'),
  certificateController.verifyDomain
);

export default router;
