import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

// 服务器属性接口
export interface ServerAttributes {
  id: number;
  user_id: number;
  uuid: string;
  hostname: string;
  ip_address: string;
  os_type: string;
  os_version: string;
  web_server: string;
  web_server_version: string;
  status: 'online' | 'offline' | 'error';
  auto_deploy: boolean;
  last_heartbeat?: Date;
  system_info?: object;
  created_at: Date;
  updated_at: Date;
}

// 创建服务器时的可选属性
export interface ServerCreationAttributes extends Optional<ServerAttributes, 'id' | 'status' | 'auto_deploy' | 'last_heartbeat' | 'system_info' | 'created_at' | 'updated_at'> {}

// 服务器模型类
export class Server extends Model<ServerAttributes, ServerCreationAttributes> implements ServerAttributes {
  public id!: number;
  public user_id!: number;
  public uuid!: string;
  public hostname!: string;
  public ip_address!: string;
  public os_type!: string;
  public os_version!: string;
  public web_server!: string;
  public web_server_version!: string;
  public status!: 'online' | 'offline' | 'error';
  public auto_deploy!: boolean;
  public last_heartbeat?: Date;
  public system_info?: object;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 关联的用户
  public User?: User;

  // 更新心跳时间
  public async updateHeartbeat(): Promise<void> {
    this.last_heartbeat = new Date();
    this.status = 'online';
    await this.save();
  }

  // 检查服务器是否在线
  public isOnline(): boolean {
    if (!this.last_heartbeat) return false;
    
    const now = new Date();
    const heartbeatTime = new Date(this.last_heartbeat);
    const diffMinutes = (now.getTime() - heartbeatTime.getTime()) / (1000 * 60);
    
    // 如果超过5分钟没有心跳，认为离线
    return diffMinutes <= 5;
  }

  // 获取服务器状态
  public getStatus(): 'online' | 'offline' | 'error' {
    if (this.status === 'error') return 'error';
    return this.isOnline() ? 'online' : 'offline';
  }

  // 静态方法：根据UUID查找服务器
  public static async findByUUID(uuid: string): Promise<Server | null> {
    return Server.findOne({
      where: { uuid },
      include: [{ model: User, as: 'User' }]
    });
  }

  // 静态方法：获取用户的所有服务器
  public static async findByUserId(userId: number): Promise<Server[]> {
    return Server.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  }

  // 静态方法：获取在线服务器数量
  public static async getOnlineCount(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return Server.count({
      where: {
        last_heartbeat: {
          [Op.gte]: fiveMinutesAgo
        },
        status: {
          [Op.ne]: 'error'
        }
      }
    });
  }
}

// 定义模型
Server.init(
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
    uuid: {
      type: DataTypes.STRING(64),
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
      validate: {
        isIP: true,
      },
    },
    os_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    os_version: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    web_server: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    web_server_version: {
      type: DataTypes.STRING(50),
      allowNull: false,
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
  },
  {
    sequelize,
    modelName: 'Server',
    tableName: 'servers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['uuid'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['last_heartbeat'],
      },
    ],
  }
);

// 定义关联关系
Server.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User',
});

User.hasMany(Server, {
  foreignKey: 'user_id',
  as: 'Servers',
});

export default Server;
