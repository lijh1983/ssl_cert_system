import cron from 'node-cron';
import { Op } from 'sequelize';
import { Certificate } from '@/models/Certificate';
import { logger } from '@/utils/logger';
import acmeService from './acmeService';
import certificateFileService from './certificateFileService';

/**
 * 定时任务服务
 * 负责证书自动续期、状态检查等定时任务
 */
export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.setupTasks();
  }

  /**
   * 设置定时任务
   */
  private setupTasks(): void {
    // 每天凌晨2点检查证书状态
    this.addTask('certificate-check', '0 2 * * *', this.checkCertificatesStatus.bind(this));
    
    // 每天凌晨3点执行自动续期
    this.addTask('auto-renewal', '0 3 * * *', this.autoRenewCertificates.bind(this));
    
    // 每周日凌晨4点清理过期备份
    this.addTask('cleanup-backups', '0 4 * * 0', this.cleanupOldBackups.bind(this));
    
    // 每小时更新证书剩余天数
    this.addTask('update-days-remaining', '0 * * * *', this.updateDaysRemaining.bind(this));
  }

  /**
   * 添加定时任务
   */
  private addTask(name: string, schedule: string, task: () => Promise<void>): void {
    const scheduledTask = cron.schedule(schedule, async () => {
      try {
        logger.info(`开始执行定时任务: ${name}`);
        await task();
        logger.info(`定时任务执行完成: ${name}`);
      } catch (error) {
        logger.error(`定时任务执行失败: ${name}`, error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set(name, scheduledTask);
    logger.info(`定时任务已添加: ${name} (${schedule})`);
  }

  /**
   * 启动所有定时任务
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('定时任务服务已在运行');
      return;
    }

    this.tasks.forEach((task, name) => {
      task.start();
      logger.info(`定时任务已启动: ${name}`);
    });

    this.isRunning = true;
    logger.info('定时任务服务启动完成');
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('定时任务服务未在运行');
      return;
    }

    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`定时任务已停止: ${name}`);
    });

    this.isRunning = false;
    logger.info('定时任务服务已停止');
  }

  /**
   * 检查证书状态
   */
  private async checkCertificatesStatus(): Promise<void> {
    try {
      logger.info('开始检查证书状态...');
      
      const certificates = await Certificate.findAll({
        where: {
          status: {
            [Op.in]: ['issued', 'expiring_soon']
          }
        }
      });

      let checkedCount = 0;
      let updatedCount = 0;

      for (const cert of certificates) {
        try {
          // 检查证书文件状态
          const status = await acmeService.checkCertificateStatus(cert.domain);
          
          if (status.exists && status.validTo && status.daysRemaining !== undefined) {
            // 更新证书信息
            const oldDaysRemaining = cert.days_remaining;
            cert.valid_to = status.validTo;
            cert.days_remaining = status.daysRemaining;
            
            // 更新状态
            if (status.daysRemaining <= 0) {
              cert.status = 'expired';
            } else if (status.daysRemaining <= 30) {
              cert.status = 'expiring_soon';
            } else {
              cert.status = 'issued';
            }
            
            await cert.save();
            
            if (oldDaysRemaining !== cert.days_remaining) {
              updatedCount++;
              logger.info(`证书状态已更新: ${cert.domain} (剩余${cert.days_remaining}天)`);
            }
          }
          
          checkedCount++;
        } catch (error) {
          logger.error(`检查证书状态失败: ${cert.domain}`, error);
        }
      }

      logger.info(`证书状态检查完成: 检查${checkedCount}个，更新${updatedCount}个`);
    } catch (error) {
      logger.error('检查证书状态失败:', error);
    }
  }

  /**
   * 自动续期证书
   */
  private async autoRenewCertificates(): Promise<void> {
    try {
      logger.info('开始自动续期证书...');
      
      // 查找需要续期的证书（剩余天数小于等于30天且启用自动续期）
      const certificates = await Certificate.findAll({
        where: {
          auto_renew: true,
          days_remaining: {
            [Op.lte]: 30
          },
          status: {
            [Op.in]: ['issued', 'expiring_soon']
          }
        }
      });

      let renewedCount = 0;
      let failedCount = 0;

      for (const cert of certificates) {
        try {
          logger.info(`开始续期证书: ${cert.domain}`);
          
          // 执行续期
          const success = await acmeService.renewCertificate(cert.domain);
          
          if (success) {
            // 更新证书状态
            cert.valid_to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90天后过期
            cert.days_remaining = 90;
            cert.status = 'issued';
            await cert.save();
            
            renewedCount++;
            logger.info(`证书续期成功: ${cert.domain}`);
          } else {
            failedCount++;
            logger.error(`证书续期失败: ${cert.domain}`);
          }
        } catch (error) {
          failedCount++;
          logger.error(`证书续期异常: ${cert.domain}`, error);
        }
      }

      logger.info(`自动续期完成: 成功${renewedCount}个，失败${failedCount}个`);
    } catch (error) {
      logger.error('自动续期证书失败:', error);
    }
  }

  /**
   * 清理过期备份
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      logger.info('开始清理过期备份...');
      
      const deletedCount = await certificateFileService.cleanupOldBackups(30);
      
      logger.info(`过期备份清理完成: 删除${deletedCount}个文件`);
    } catch (error) {
      logger.error('清理过期备份失败:', error);
    }
  }

  /**
   * 更新证书剩余天数
   */
  private async updateDaysRemaining(): Promise<void> {
    try {
      const certificates = await Certificate.findAll({
        where: {
          status: {
            [Op.in]: ['issued', 'expiring_soon']
          }
        }
      });

      let updatedCount = 0;

      for (const cert of certificates) {
        try {
          const oldDaysRemaining = cert.days_remaining;
          await cert.updateDaysRemaining();
          
          if (oldDaysRemaining !== cert.days_remaining) {
            updatedCount++;
          }
        } catch (error) {
          logger.error(`更新证书剩余天数失败: ${cert.domain}`, error);
        }
      }

      if (updatedCount > 0) {
        logger.info(`证书剩余天数更新完成: 更新${updatedCount}个证书`);
      }
    } catch (error) {
      logger.error('更新证书剩余天数失败:', error);
    }
  }

  /**
   * 手动执行任务
   */
  async executeTask(taskName: string): Promise<void> {
    switch (taskName) {
      case 'certificate-check':
        await this.checkCertificatesStatus();
        break;
      case 'auto-renewal':
        await this.autoRenewCertificates();
        break;
      case 'cleanup-backups':
        await this.cleanupOldBackups();
        break;
      case 'update-days-remaining':
        await this.updateDaysRemaining();
        break;
      default:
        throw new Error(`未知的任务: ${taskName}`);
    }
  }

  /**
   * 获取任务状态
   */
  getTasksStatus(): Array<{
    name: string;
    running: boolean;
    nextRun?: Date;
  }> {
    const status: Array<{
      name: string;
      running: boolean;
      nextRun?: Date;
    }> = [];

    this.tasks.forEach((task, name) => {
      status.push({
        name,
        running: this.isRunning,
        // nextRun: task.nextDate()?.toDate() // 如果node-cron支持的话
      });
    });

    return status;
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    running: boolean;
    tasksCount: number;
    tasks: string[];
  } {
    return {
      running: this.isRunning,
      tasksCount: this.tasks.size,
      tasks: Array.from(this.tasks.keys())
    };
  }
}

export default new SchedulerService();
