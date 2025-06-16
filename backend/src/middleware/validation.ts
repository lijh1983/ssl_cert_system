import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

// 验证中间件工厂函数
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(createError(`数据验证失败: ${errorMessage}`, 400));
    }

    // 将验证后的数据替换原始数据
    req[property] = value;
    next();
  };
};

// 用户相关验证规则
export const userValidation = {
  // 用户注册验证
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少需要3个字符',
        'string.max': '用户名不能超过50个字符',
        'any.required': '用户名是必填项'
      }),
    email: Joi.string()
      .email()
      .max(100)
      .required()
      .messages({
        'string.email': '请输入有效的邮箱地址',
        'string.max': '邮箱地址不能超过100个字符',
        'any.required': '邮箱是必填项'
      }),
    password: Joi.string()
      .min(6)
      .max(50)
      .required()
      .messages({
        'string.min': '密码至少需要6个字符',
        'string.max': '密码不能超过50个字符',
        'any.required': '密码是必填项'
      })
  }),

  // 用户登录验证
  login: Joi.object({
    emailOrUsername: Joi.string()
      .required()
      .messages({
        'any.required': '邮箱或用户名是必填项'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': '密码是必填项'
      })
  }),

  // 用户更新验证
  update: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .optional(),
    email: Joi.string()
      .email()
      .max(100)
      .optional(),
    is_admin: Joi.boolean().optional(),
    is_active: Joi.boolean().optional()
  })
};

// 服务器相关验证规则
export const serverValidation = {
  // 服务器心跳验证
  heartbeat: Joi.object({
    uuid: Joi.string()
      .required()
      .messages({
        'any.required': '服务器UUID是必填项'
      }),
    hostname: Joi.string()
      .max(255)
      .required()
      .messages({
        'string.max': '主机名不能超过255个字符',
        'any.required': '主机名是必填项'
      }),
    ip_address: Joi.string()
      .ip()
      .required()
      .messages({
        'string.ip': '请输入有效的IP地址',
        'any.required': 'IP地址是必填项'
      }),
    os_type: Joi.string()
      .max(50)
      .required()
      .messages({
        'string.max': '操作系统类型不能超过50个字符',
        'any.required': '操作系统类型是必填项'
      }),
    os_version: Joi.string()
      .max(50)
      .required()
      .messages({
        'string.max': '操作系统版本不能超过50个字符',
        'any.required': '操作系统版本是必填项'
      }),
    web_server: Joi.string()
      .max(50)
      .required()
      .messages({
        'string.max': 'Web服务器类型不能超过50个字符',
        'any.required': 'Web服务器类型是必填项'
      }),
    web_server_version: Joi.string()
      .max(50)
      .required()
      .messages({
        'string.max': 'Web服务器版本不能超过50个字符',
        'any.required': 'Web服务器版本是必填项'
      }),
    system_info: Joi.object().optional()
  }),

  // 服务器更新验证
  update: Joi.object({
    auto_deploy: Joi.boolean().optional(),
    note: Joi.string().max(500).optional()
  })
};

// 证书相关验证规则
export const certificateValidation = {
  // 证书申请验证
  create: Joi.object({
    domain: Joi.string()
      .domain()
      .max(255)
      .required()
      .messages({
        'string.domain': '请输入有效的域名',
        'string.max': '域名不能超过255个字符',
        'any.required': '域名是必填项'
      }),
    alt_domains: Joi.string()
      .max(1000)
      .optional()
      .messages({
        'string.max': '备用域名不能超过1000个字符'
      }),
    server_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.integer': '服务器ID必须是整数',
        'number.positive': '服务器ID必须是正数'
      }),
    encryption_type: Joi.string()
      .valid('RSA', 'ECC')
      .default('ECC')
      .messages({
        'any.only': '加密类型只能是RSA或ECC'
      }),
    auto_renew: Joi.boolean()
      .default(true),
    note: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': '备注不能超过500个字符'
      })
  }),

  // 证书更新验证
  update: Joi.object({
    auto_renew: Joi.boolean().optional(),
    note: Joi.string().max(500).optional()
  })
};

// 分页验证规则
export const paginationValidation = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': '页码必须是整数',
      'number.min': '页码必须大于0'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.integer': '每页数量必须是整数',
      'number.min': '每页数量必须大于0',
      'number.max': '每页数量不能超过100'
    }),
  search: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': '搜索关键词不能超过100个字符'
    }),
  sort: Joi.string()
    .valid('created_at', 'updated_at', 'name', 'status')
    .default('created_at')
    .optional(),
  order: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .optional()
});

// ID参数验证
export const idValidation = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': 'ID必须是整数',
      'number.positive': 'ID必须是正数',
      'any.required': 'ID是必填项'
    })
});

export default {
  validate,
  userValidation,
  serverValidation,
  certificateValidation,
  paginationValidation,
  idValidation
};
