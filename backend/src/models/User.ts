import { DataTypes, Model, Optional, Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

// 用户属性接口
export interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// 创建用户时的可选属性
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_admin' | 'is_active' | 'last_login' | 'created_at' | 'updated_at'> {}

// 用户模型类
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public is_admin!: boolean;
  public is_active!: boolean;
  public last_login?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 验证密码
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // 获取用户的安全信息（不包含密码）
  public toSafeJSON() {
    const { password, ...safeUser } = this.toJSON();
    return safeUser;
  }

  // 静态方法：根据邮箱或用户名查找用户
  public static async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });
  }

  // 静态方法：创建用户（自动加密密码）
  public static async createUser(userData: UserCreationAttributes): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    return User.create({
      ...userData,
      password: hashedPassword
    });
  }
}

// 定义模型
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true,
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255],
      },
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
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['username'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

export default User;
