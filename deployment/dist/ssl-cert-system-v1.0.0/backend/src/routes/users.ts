import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// 获取用户列表
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '用户列表接口待实现',
    data: {
      users: [],
      total: 0,
      page: 1,
      limit: 10
    }
  });
}));

// 获取用户详情
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: '用户详情接口待实现',
    data: {
      id: parseInt(id),
      username: 'user',
      email: 'user@example.com'
    }
  });
}));

// 更新用户信息
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: '用户更新接口待实现',
    data: {
      id: parseInt(id),
      message: '用户信息更新成功'
    }
  });
}));

// 删除用户
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: '用户删除接口待实现',
    data: {
      id: parseInt(id),
      message: '用户删除成功'
    }
  });
}));

export default router;
