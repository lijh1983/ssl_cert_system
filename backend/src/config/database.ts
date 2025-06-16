import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'ssl_manager',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql' as const,
  logging: (sql: string) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`SQL: ${sql}`);
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  timezone: '+08:00'
};

// 创建Sequelize实例
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    timezone: dbConfig.timezone
  }
);

// 连接数据库
export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接验证成功');
    
    // 在开发环境中同步数据库模型
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('数据库模型同步完成');
    }
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}

// 关闭数据库连接
export async function closeDatabase(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
    throw error;
  }
}

export default sequelize;
