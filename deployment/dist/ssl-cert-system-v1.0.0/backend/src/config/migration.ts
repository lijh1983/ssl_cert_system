import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '@/utils/logger';

/**
 * 数据库迁移配置
 * 用于创建和管理数据库表结构
 */

// 创建用户表
export const createUsersTable = async (queryInterface: QueryInterface) => {
  logger.info('创建用户表...');

  // 检查表是否已存在
  const tables = await queryInterface.showAllTables();
  if (tables.includes('users')) {
    logger.info('用户表已存在，跳过创建');
    return;
  }

  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // 创建索引
  await queryInterface.addIndex('users', ['username']);
  await queryInterface.addIndex('users', ['email']);
  await queryInterface.addIndex('users', ['api_key']);
  
  logger.info('用户表创建完成');
};

// 创建服务器表
export const createServersTable = async (queryInterface: QueryInterface) => {
  logger.info('创建服务器表...');

  // 检查表是否已存在
  const tables = await queryInterface.showAllTables();
  if (tables.includes('servers')) {
    logger.info('服务器表已存在，跳过创建');
    return;
  }

  await queryInterface.createTable('servers', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    uuid: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    hostname: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false,
    },
    os_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    os_version: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    web_server: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    web_server_version: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'error'),
      allowNull: false,
      defaultValue: 'offline',
    },
    auto_deploy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    system_info: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // 创建索引
  await queryInterface.addIndex('servers', ['user_id']);
  await queryInterface.addIndex('servers', ['uuid']);
  await queryInterface.addIndex('servers', ['hostname']);
  await queryInterface.addIndex('servers', ['ip_address']);
  await queryInterface.addIndex('servers', ['status']);
  
  logger.info('服务器表创建完成');
};

// 创建证书表
export const createCertificatesTable = async (queryInterface: QueryInterface) => {
  logger.info('创建证书表...');

  // 检查表是否已存在
  const tables = await queryInterface.showAllTables();
  if (tables.includes('certificates')) {
    logger.info('证书表已存在，跳过创建');
    return;
  }

  await queryInterface.createTable('certificates', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    server_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'servers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    alt_domains: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issuer: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    valid_to: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    days_remaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    encryption_type: {
      type: DataTypes.ENUM('RSA', 'ECC'),
      allowNull: false,
      defaultValue: 'RSA',
    },
    status: {
      type: DataTypes.ENUM('pending', 'issued', 'expired', 'revoked', 'error'),
      allowNull: false,
      defaultValue: 'pending',
    },
    verification_status: {
      type: DataTypes.ENUM('pending', 'verified', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    cert_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    key_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ca_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    fullchain_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // 创建索引
  await queryInterface.addIndex('certificates', ['user_id']);
  await queryInterface.addIndex('certificates', ['server_id']);
  await queryInterface.addIndex('certificates', ['domain']);
  await queryInterface.addIndex('certificates', ['status']);
  await queryInterface.addIndex('certificates', ['valid_to']);
  await queryInterface.addIndex('certificates', ['days_remaining']);
  
  logger.info('证书表创建完成');
};

// 执行所有迁移
export const runMigrations = async (queryInterface: QueryInterface) => {
  try {
    logger.info('开始执行数据库迁移...');
    
    await createUsersTable(queryInterface);
    await createServersTable(queryInterface);
    await createCertificatesTable(queryInterface);
    
    logger.info('数据库迁移完成！');
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    throw error;
  }
};

// 删除所有表（用于重置）
export const dropAllTables = async (queryInterface: QueryInterface) => {
  try {
    logger.info('开始删除所有表...');
    
    await queryInterface.dropTable('certificates');
    await queryInterface.dropTable('servers');
    await queryInterface.dropTable('users');
    
    logger.info('所有表删除完成');
  } catch (error) {
    logger.error('删除表失败:', error);
    throw error;
  }
};
