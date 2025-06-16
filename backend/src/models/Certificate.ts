import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Server from './Server';

// 证书属性接口
export interface CertificateAttributes {
  id: number;
  user_id: number;
  server_id?: number;
  domain: string;
  alt_domains?: string;
  issuer: string;
  valid_from: Date;
  valid_to: Date;
  days_remaining: number;
  encryption_type: 'RSA' | 'ECC';
  status: 'pending' | 'issued' | 'expired' | 'revoked' | 'error';
  verification_status: 'pending' | 'verified' | 'failed';
  cert_path?: string;
  key_path?: string;
  ca_path?: string;
  fullchain_path?: string;
  auto_renew: boolean;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

// 创建证书时的可选属性
export interface CertificateCreationAttributes extends Optional<CertificateAttributes, 'id' | 'server_id' | 'alt_domains' | 'days_remaining' | 'status' | 'verification_status' | 'cert_path' | 'key_path' | 'ca_path' | 'fullchain_path' | 'auto_renew' | 'note' | 'created_at' | 'updated_at'> {}

// 证书模型类
export class Certificate extends Model<CertificateAttributes, CertificateCreationAttributes> implements CertificateAttributes {
  public id!: number;
  public user_id!: number;
  public server_id?: number;
  public domain!: string;
  public alt_domains?: string;
  public issuer!: string;
  public valid_from!: Date;
  public valid_to!: Date;
  public days_remaining!: number;
  public encryption_type!: 'RSA' | 'ECC';
  public status!: 'pending' | 'issued' | 'expired' | 'revoked' | 'error';
  public verification_status!: 'pending' | 'verified' | 'failed';
  public cert_path?: string;
  public key_path?: string;
  public ca_path?: string;
  public fullchain_path?: string;
  public auto_renew!: boolean;
  public note?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 关联的用户和服务器
  public User?: User;
  public Server?: Server;

  // 计算剩余天数
  public calculateDaysRemaining(): number {
    const now = new Date();
    const validTo = new Date(this.valid_to);
    const diffTime = validTo.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // 更新剩余天数
  public async updateDaysRemaining(): Promise<void> {
    this.days_remaining = this.calculateDaysRemaining();
    
    // 更新状态
    if (this.days_remaining <= 0) {
      this.status = 'expired';
    } else if (this.status === 'expired' && this.days_remaining > 0) {
      this.status = 'issued';
    }
    
    await this.save();
  }

  // 检查是否即将过期
  public isExpiringSoon(warningDays: number = 30): boolean {
    return this.days_remaining <= warningDays && this.days_remaining > 0;
  }

  // 检查是否已过期
  public isExpired(): boolean {
    return this.days_remaining <= 0;
  }

  // 获取所有域名（主域名 + 备用域名）
  public getAllDomains(): string[] {
    const domains = [this.domain];
    if (this.alt_domains) {
      domains.push(...this.alt_domains.split(',').map(d => d.trim()));
    }
    return domains;
  }

  // 静态方法：根据域名查找证书
  public static async findByDomain(domain: string): Promise<Certificate[]> {
    return Certificate.findAll({
      where: {
        [Op.or]: [
          { domain },
          { alt_domains: { [Op.like]: `%${domain}%` } }
        ]
      },
      include: [
        { model: User, as: 'User' },
        { model: Server, as: 'Server' }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  // 静态方法：获取即将过期的证书
  public static async findExpiringSoon(warningDays: number = 30): Promise<Certificate[]> {
    return Certificate.findAll({
      where: {
        days_remaining: {
          [Op.lte]: warningDays,
          [Op.gt]: 0
        },
        status: 'issued'
      },
      include: [
        { model: User, as: 'User' },
        { model: Server, as: 'Server' }
      ],
      order: [['days_remaining', 'ASC']]
    });
  }

  // 静态方法：获取已过期的证书
  public static async findExpired(): Promise<Certificate[]> {
    return Certificate.findAll({
      where: {
        [Op.or]: [
          { days_remaining: { [Op.lte]: 0 } },
          { status: 'expired' }
        ]
      },
      include: [
        { model: User, as: 'User' },
        { model: Server, as: 'Server' }
      ],
      order: [['valid_to', 'ASC']]
    });
  }

  // 静态方法：获取用户的证书
  public static async findByUserId(userId: number): Promise<Certificate[]> {
    return Certificate.findAll({
      where: { user_id: userId },
      include: [{ model: Server, as: 'Server' }],
      order: [['created_at', 'DESC']]
    });
  }

  // 静态方法：批量更新剩余天数
  public static async updateAllDaysRemaining(): Promise<void> {
    const certificates = await Certificate.findAll({
      where: {
        status: {
          [Op.in]: ['issued', 'expired']
        }
      }
    });

    for (const cert of certificates) {
      await cert.updateDaysRemaining();
    }
  }
}

// 定义模型
Certificate.init(
  {
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
      defaultValue: 'ECC',
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
  },
  {
    sequelize,
    modelName: 'Certificate',
    tableName: 'certificates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['server_id'],
      },
      {
        fields: ['domain'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['days_remaining'],
      },
      {
        fields: ['valid_to'],
      },
    ],
  }
);

// 定义关联关系
Certificate.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User',
});

Certificate.belongsTo(Server, {
  foreignKey: 'server_id',
  as: 'Server',
});

User.hasMany(Certificate, {
  foreignKey: 'user_id',
  as: 'Certificates',
});

Server.hasMany(Certificate, {
  foreignKey: 'server_id',
  as: 'Certificates',
});

export default Certificate;
