import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

/**
 * 证书文件管理服务
 * 负责证书文件的存储、读取、备份和下载
 */
export class CertificateFileService {
  private readonly storageDir: string;
  private readonly backupDir: string;

  constructor() {
    this.storageDir = process.env.CERT_STORAGE_PATH || path.join(process.cwd(), 'storage/certificates');
    this.backupDir = process.env.CERT_BACKUP_PATH || path.join(process.cwd(), 'storage/backups');
    
    this.ensureDirectories();
  }

  /**
   * 确保存储目录存在
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info('证书存储目录初始化完成');
    } catch (error) {
      logger.error('创建存储目录失败:', error);
    }
  }

  /**
   * 保存证书文件
   * @param domain 域名
   * @param files 证书文件内容
   */
  async saveCertificateFiles(domain: string, files: {
    cert: string;
    key: string;
    ca?: string;
    fullchain?: string;
  }): Promise<{
    certPath: string;
    keyPath: string;
    caPath?: string;
    fullchainPath?: string;
  }> {
    try {
      const domainDir = path.join(this.storageDir, domain);
      await fs.mkdir(domainDir, { recursive: true });

      // 保存证书文件
      const certPath = path.join(domainDir, `${domain}.crt`);
      await fs.writeFile(certPath, files.cert, 'utf8');

      // 保存私钥文件
      const keyPath = path.join(domainDir, `${domain}.key`);
      await fs.writeFile(keyPath, files.key, 'utf8');

      let caPath: string | undefined;
      let fullchainPath: string | undefined;

      // 保存CA证书文件
      if (files.ca) {
        caPath = path.join(domainDir, 'ca.crt');
        await fs.writeFile(caPath, files.ca, 'utf8');
      }

      // 保存完整链证书文件
      if (files.fullchain) {
        fullchainPath = path.join(domainDir, 'fullchain.crt');
        await fs.writeFile(fullchainPath, files.fullchain, 'utf8');
      }

      // 设置私钥文件权限（仅所有者可读）
      await fs.chmod(keyPath, 0o600);

      logger.info(`证书文件保存成功: ${domain}`);

      return {
        certPath,
        keyPath,
        caPath,
        fullchainPath
      };
    } catch (error) {
      logger.error(`保存证书文件失败: ${domain}`, error);
      throw createError('保存证书文件失败', 500);
    }
  }

  /**
   * 读取证书文件
   * @param domain 域名
   * @param fileType 文件类型
   */
  async readCertificateFile(domain: string, fileType: 'cert' | 'key' | 'ca' | 'fullchain'): Promise<string> {
    try {
      let fileName: string;
      
      switch (fileType) {
        case 'cert':
          fileName = `${domain}.crt`;
          break;
        case 'key':
          fileName = `${domain}.key`;
          break;
        case 'ca':
          fileName = 'ca.crt';
          break;
        case 'fullchain':
          fileName = 'fullchain.crt';
          break;
        default:
          throw createError('无效的文件类型', 400);
      }

      const filePath = path.join(this.storageDir, domain, fileName);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          throw createError('证书文件不存在', 404);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`读取证书文件失败: ${domain}/${fileType}`, error);
      throw error;
    }
  }

  /**
   * 检查证书文件是否存在
   * @param domain 域名
   */
  async checkCertificateFiles(domain: string): Promise<{
    cert: boolean;
    key: boolean;
    ca: boolean;
    fullchain: boolean;
  }> {
    try {
      const domainDir = path.join(this.storageDir, domain);
      
      const [cert, key, ca, fullchain] = await Promise.all([
        this.fileExists(path.join(domainDir, `${domain}.crt`)),
        this.fileExists(path.join(domainDir, `${domain}.key`)),
        this.fileExists(path.join(domainDir, 'ca.crt')),
        this.fileExists(path.join(domainDir, 'fullchain.crt'))
      ]);

      return { cert, key, ca, fullchain };
    } catch (error) {
      logger.error(`检查证书文件失败: ${domain}`, error);
      return { cert: false, key: false, ca: false, fullchain: false };
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 备份证书文件
   * @param domain 域名
   */
  async backupCertificateFiles(domain: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${domain}_${timestamp}.zip`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      const output = createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          logger.info(`证书备份完成: ${backupFileName} (${archive.pointer()} bytes)`);
          resolve(backupPath);
        });

        archive.on('error', (err) => {
          logger.error('证书备份失败:', err);
          reject(err);
        });

        archive.pipe(output);

        // 添加证书文件到压缩包
        const domainDir = path.join(this.storageDir, domain);
        archive.directory(domainDir, domain);

        archive.finalize();
      });
    } catch (error) {
      logger.error(`备份证书文件失败: ${domain}`, error);
      throw createError('备份证书文件失败', 500);
    }
  }

  /**
   * 创建证书下载包
   * @param domain 域名
   * @param format 下载格式
   */
  async createDownloadPackage(domain: string, format: 'zip' | 'tar' = 'zip'): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${domain}_certificates_${timestamp}.${format}`;
      const filePath = path.join(this.backupDir, fileName);
      
      if (format === 'zip') {
        const output = createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', () => {
            resolve({
              filePath,
              fileName,
              mimeType: 'application/zip'
            });
          });

          archive.on('error', reject);
          archive.pipe(output);

          const domainDir = path.join(this.storageDir, domain);
          archive.directory(domainDir, false);
          archive.finalize();
        });
      } else {
        // TODO: 实现tar格式支持
        throw createError('暂不支持tar格式', 400);
      }
    } catch (error) {
      logger.error(`创建下载包失败: ${domain}`, error);
      throw createError('创建下载包失败', 500);
    }
  }

  /**
   * 删除证书文件
   * @param domain 域名
   */
  async deleteCertificateFiles(domain: string): Promise<void> {
    try {
      const domainDir = path.join(this.storageDir, domain);
      
      // 先备份再删除
      await this.backupCertificateFiles(domain);
      
      // 删除目录及其所有文件
      await fs.rm(domainDir, { recursive: true, force: true });
      
      logger.info(`证书文件删除成功: ${domain}`);
    } catch (error) {
      logger.error(`删除证书文件失败: ${domain}`, error);
      throw createError('删除证书文件失败', 500);
    }
  }

  /**
   * 获取证书文件大小
   * @param domain 域名
   */
  async getCertificateFilesSizes(domain: string): Promise<{
    cert: number;
    key: number;
    ca: number;
    fullchain: number;
    total: number;
  }> {
    try {
      const domainDir = path.join(this.storageDir, domain);
      
      const sizes = {
        cert: 0,
        key: 0,
        ca: 0,
        fullchain: 0,
        total: 0
      };

      const files = [
        { name: `${domain}.crt`, key: 'cert' as const },
        { name: `${domain}.key`, key: 'key' as const },
        { name: 'ca.crt', key: 'ca' as const },
        { name: 'fullchain.crt', key: 'fullchain' as const }
      ];

      for (const file of files) {
        try {
          const filePath = path.join(domainDir, file.name);
          const stats = await fs.stat(filePath);
          sizes[file.key] = stats.size;
          sizes.total += stats.size;
        } catch {
          // 文件不存在，保持为0
        }
      }

      return sizes;
    } catch (error) {
      logger.error(`获取证书文件大小失败: ${domain}`, error);
      throw createError('获取证书文件大小失败', 500);
    }
  }

  /**
   * 清理过期的备份文件
   * @param daysToKeep 保留天数
   */
  async cleanupOldBackups(daysToKeep: number = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.backupDir);
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`删除过期备份文件: ${file}`);
        }
      }

      logger.info(`清理完成，删除了 ${deletedCount} 个过期备份文件`);
      return deletedCount;
    } catch (error) {
      logger.error('清理备份文件失败:', error);
      throw createError('清理备份文件失败', 500);
    }
  }
}

export default new CertificateFileService();
