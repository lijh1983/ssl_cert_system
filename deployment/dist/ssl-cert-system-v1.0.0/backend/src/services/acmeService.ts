import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export class AcmeService {
  private readonly acmePath: string;
  private readonly certsDir: string;

  constructor() {
    // 设置证书存储目录
    this.certsDir = path.join(process.cwd(), 'certs');
    this.acmePath = path.join(process.cwd(), 'acme.sh', 'acme.sh');
    
    // 确保目录存在
    if (!fs.existsSync(this.certsDir)) {
      fs.mkdirSync(this.certsDir, { recursive: true });
    }
  }

  /**
   * 申请证书
   * @param domain 主域名
   * @param altDomains 备用域名
   * @param email 邮箱
   * @param encryptionType 加密类型
   */
  async issueCertificate(domain: string, altDomains: string[] = [], email: string, encryptionType: 'RSA' | 'ECC'): Promise<{
    certPath: string;
    keyPath: string;
    caPath: string;
    fullchainPath: string;
  }> {
    try {
      // 构建域名参数
      const domainParams = [domain, ...altDomains].map(d => `-d ${d}`).join(' ');
      
      // 构建加密类型参数
      const keyType = encryptionType === 'ECC' ? '--keylength ec-256' : '--keylength 2048';
      
      // 构建命令
      const command = `${this.acmePath} --issue --dns -d ${domain} ${domainParams} --email ${email} ${keyType} --yes-I-know-dns-manual-mode-enough-go-ahead-please`;
      
      logger.info(`开始申请证书: ${domain}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.error(`证书申请错误: ${stderr}`);
        throw createError('证书申请失败', 500);
      }
      
      logger.info(`证书申请成功: ${domain}`);
      
      // 获取证书路径
      const certPath = path.join(this.certsDir, domain, `${domain}.cer`);
      const keyPath = path.join(this.certsDir, domain, `${domain}.key`);
      const caPath = path.join(this.certsDir, domain, 'ca.cer');
      const fullchainPath = path.join(this.certsDir, domain, 'fullchain.cer');
      
      return {
        certPath,
        keyPath,
        caPath,
        fullchainPath
      };
    } catch (error) {
      logger.error(`证书申请失败: ${error}`);
      throw createError('证书申请失败', 500);
    }
  }

  /**
   * 获取 DNS 验证信息
   * @param domain 域名
   */
  async getDnsValidationInfo(domain: string): Promise<{
    recordName: string;
    recordValue: string;
  }> {
    try {
      const command = `${this.acmePath} --issue --dns -d ${domain} --yes-I-know-dns-manual-mode-enough-go-ahead-please --dry-run`;
      const { stdout } = await execAsync(command);
      
      // 解析输出获取 DNS 记录信息
      const recordMatch = stdout.match(/Add the following TXT record:\n([^\n]+)\n([^\n]+)/);
      if (!recordMatch) {
        throw createError('无法获取 DNS 验证信息', 500);
      }
      
      return {
        recordName: recordMatch[1].trim(),
        recordValue: recordMatch[2].trim()
      };
    } catch (error) {
      logger.error(`获取 DNS 验证信息失败: ${error}`);
      throw createError('获取 DNS 验证信息失败', 500);
    }
  }

  /**
   * 验证域名所有权
   * @param domain 域名
   */
  async verifyDomain(domain: string): Promise<boolean> {
    try {
      const command = `${this.acmePath} --renew -d ${domain} --yes-I-know-dns-manual-mode-enough-go-ahead-please --dry-run`;
      const { stdout } = await execAsync(command);

      return stdout.includes('Verify finished');
    } catch (error) {
      logger.error(`域名验证失败: ${error}`);
      return false;
    }
  }

  /**
   * 续期证书
   * @param domain 域名
   */
  async renewCertificate(domain: string): Promise<boolean> {
    try {
      logger.info(`开始续期证书: ${domain}`);

      const command = `${this.acmePath} --renew -d ${domain} --force`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Skip')) {
        logger.error(`证书续期错误: ${stderr}`);
        return false;
      }

      logger.info(`证书续期成功: ${domain}`);
      return true;
    } catch (error) {
      logger.error(`证书续期失败: ${error}`);
      return false;
    }
  }

  /**
   * 撤销证书
   * @param domain 域名
   */
  async revokeCertificate(domain: string): Promise<boolean> {
    try {
      logger.info(`开始撤销证书: ${domain}`);

      const command = `${this.acmePath} --revoke -d ${domain}`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.error(`证书撤销错误: ${stderr}`);
        return false;
      }

      logger.info(`证书撤销成功: ${domain}`);
      return true;
    } catch (error) {
      logger.error(`证书撤销失败: ${error}`);
      return false;
    }
  }

  /**
   * 检查证书状态
   * @param domain 域名
   */
  async checkCertificateStatus(domain: string): Promise<{
    exists: boolean;
    validTo?: Date;
    daysRemaining?: number;
    status: string;
  }> {
    try {
      const certPath = path.join(this.certsDir, domain, `${domain}.cer`);

      if (!fs.existsSync(certPath)) {
        return {
          exists: false,
          status: 'not_found'
        };
      }

      // 使用openssl检查证书信息
      const command = `openssl x509 -in ${certPath} -noout -enddate`;
      const { stdout } = await execAsync(command);

      // 解析过期时间
      const dateMatch = stdout.match(/notAfter=(.+)/);
      if (!dateMatch) {
        return {
          exists: true,
          status: 'invalid'
        };
      }

      const validTo = new Date(dateMatch[1]);
      const now = new Date();
      const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'valid';
      if (daysRemaining <= 0) {
        status = 'expired';
      } else if (daysRemaining <= 30) {
        status = 'expiring_soon';
      }

      return {
        exists: true,
        validTo,
        daysRemaining,
        status
      };
    } catch (error) {
      logger.error(`检查证书状态失败: ${error}`);
      return {
        exists: false,
        status: 'error'
      };
    }
  }

  /**
   * 安装或检查acme.sh
   */
  async checkAndInstallAcme(): Promise<boolean> {
    try {
      // 检查acme.sh是否存在
      if (fs.existsSync(this.acmePath)) {
        const { stdout } = await execAsync(`${this.acmePath} --version`);
        logger.info(`ACME.sh已安装，版本: ${stdout.trim()}`);
        return true;
      }

      // 安装acme.sh
      logger.info('开始安装acme.sh...');
      const installCommand = 'curl https://get.acme.sh | sh -s email=admin@ssl-cert-system.com';
      await execAsync(installCommand);

      logger.info('acme.sh安装完成');
      return true;
    } catch (error) {
      logger.error('acme.sh安装失败:', error);
      return false;
    }
  }

  /**
   * 获取证书文件内容
   * @param domain 域名
   * @param fileType 文件类型
   */
  async getCertificateFile(domain: string, fileType: 'cert' | 'key' | 'ca' | 'fullchain'): Promise<string> {
    try {
      let filePath: string;

      switch (fileType) {
        case 'cert':
          filePath = path.join(this.certsDir, domain, `${domain}.cer`);
          break;
        case 'key':
          filePath = path.join(this.certsDir, domain, `${domain}.key`);
          break;
        case 'ca':
          filePath = path.join(this.certsDir, domain, 'ca.cer');
          break;
        case 'fullchain':
          filePath = path.join(this.certsDir, domain, 'fullchain.cer');
          break;
        default:
          throw createError('无效的文件类型', 400);
      }

      if (!fs.existsSync(filePath)) {
        throw createError('证书文件不存在', 404);
      }

      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      logger.error(`获取证书文件失败: ${error}`);
      throw error;
    }
  }
}

export default new AcmeService();