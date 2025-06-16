#!/usr/bin/env ts-node

// 首先加载环境变量
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database';
import { runMigrations, dropAllTables } from '../config/migration';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * 数据库初始化脚本
 * 用于创建表结构和初始数据
 */

// 创建默认管理员用户
const createDefaultAdmin = async () => {
  try {
    logger.info('创建默认管理员用户...');
    
    const adminExists = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (adminExists) {
      logger.info('管理员用户已存在，跳过创建');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const apiKey = uuidv4();
    
    await User.create({
      username: 'admin',
      email: 'admin@ssl-cert-system.com',
      password: hashedPassword,
      is_admin: true,
      is_active: true,
      api_key: apiKey
    });
    
    logger.info('默认管理员用户创建成功');
    logger.info('用户名: admin');
    logger.info('密码: admin123');
    logger.info(`API密钥: ${apiKey}`);
    logger.warn('请在生产环境中立即修改默认密码！');
    
  } catch (error) {
    logger.error('创建默认管理员用户失败:', error);
    throw error;
  }
};

// 创建测试用户
const createTestUser = async () => {
  try {
    logger.info('创建测试用户...');
    
    const testUserExists = await User.findOne({
      where: { username: 'testuser' }
    });
    
    if (testUserExists) {
      logger.info('测试用户已存在，跳过创建');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('test123', 12);
    const apiKey = uuidv4();
    
    await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      is_admin: false,
      is_active: true,
      api_key: apiKey
    });
    
    logger.info('测试用户创建成功');
    logger.info('用户名: testuser');
    logger.info('密码: test123');
    
  } catch (error) {
    logger.error('创建测试用户失败:', error);
    throw error;
  }
};

// 初始化数据库
const initDatabase = async (reset: boolean = false) => {
  try {
    logger.info('开始初始化数据库...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    // 如果需要重置，先删除所有表
    if (reset) {
      logger.warn('重置模式：将删除所有现有数据');
      await dropAllTables(sequelize.getQueryInterface());
    }
    
    // 执行迁移
    await runMigrations(sequelize.getQueryInterface());
    
    // 同步模型（确保表结构正确）
    await sequelize.sync({ alter: true });
    logger.info('数据库模型同步完成');
    
    // 创建初始数据
    await createDefaultAdmin();
    
    // 如果是开发环境，创建测试用户
    if (process.env.NODE_ENV === 'development') {
      await createTestUser();
    }
    
    logger.info('数据库初始化完成！');
    
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
};

// 检查数据库状态
const checkDatabaseStatus = async () => {
  try {
    logger.info('检查数据库状态...');
    
    await sequelize.authenticate();
    logger.info('✅ 数据库连接正常');
    
    // 检查表是否存在
    const tables = await sequelize.getQueryInterface().showAllTables();
    logger.info(`📊 数据库表数量: ${tables.length}`);
    logger.info(`📋 表列表: ${tables.join(', ')}`);
    
    // 检查用户数量
    const userCount = await User.count();
    logger.info(`👥 用户数量: ${userCount}`);
    
    if (userCount > 0) {
      const adminCount = await User.count({ where: { is_admin: true } });
      logger.info(`👑 管理员数量: ${adminCount}`);
    }
    
  } catch (error) {
    logger.error('❌ 数据库状态检查失败:', error);
    throw error;
  }
};

// 主函数
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';
  
  try {
    switch (command) {
      case 'init':
        await initDatabase(false);
        break;
        
      case 'reset':
        await initDatabase(true);
        break;
        
      case 'status':
        await checkDatabaseStatus();
        break;
        
      default:
        console.log('用法:');
        console.log('  npm run db:init     - 初始化数据库');
        console.log('  npm run db:reset    - 重置数据库（删除所有数据）');
        console.log('  npm run db:status   - 检查数据库状态');
        process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    logger.error('脚本执行失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { initDatabase, checkDatabaseStatus };
