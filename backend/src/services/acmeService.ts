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
}

export default new AcmeService(); 