// 导入所有模型
import User from './User';
import Server from './Server';
import Certificate from './Certificate';

// 导出所有模型
export {
  User,
  Server,
  Certificate
};

// 导出模型数组（用于批量操作）
export const models = [
  User,
  Server,
  Certificate
];

// 初始化所有模型关联关系的函数
export function initializeAssociations(): void {
  // 用户和服务器的关联关系
  User.hasMany(Server, {
    foreignKey: 'user_id',
    as: 'Servers',
  });
  
  Server.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User',
  });

  // 用户和证书的关联关系
  User.hasMany(Certificate, {
    foreignKey: 'user_id',
    as: 'Certificates',
  });
  
  Certificate.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User',
  });

  // 服务器和证书的关联关系
  Server.hasMany(Certificate, {
    foreignKey: 'server_id',
    as: 'Certificates',
  });
  
  Certificate.belongsTo(Server, {
    foreignKey: 'server_id',
    as: 'Server',
  });
}

export default {
  User,
  Server,
  Certificate,
  models,
  initializeAssociations
};
