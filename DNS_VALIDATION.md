# DNS-01 验证使用指南

SSL证书管理系统现在支持DNS-01验证方式，允许您通过添加DNS TXT记录来验证域名所有权。

## 🔍 验证方式对比

### HTTP-01 验证 (默认)
- ✅ 配置简单，自动化程度高
- ✅ 无需手动操作DNS
- ❌ 需要开放80端口
- ❌ 不支持通配符证书
- ❌ 需要公网可访问

### DNS-01 验证 (手动)
- ✅ 支持通配符证书 (*.example.com)
- ✅ 无需开放80/443端口
- ✅ 适合内网环境
- ✅ 支持任何DNS提供商
- ❌ 需要手动添加DNS记录
- ❌ DNS传播需要时间

## 🔧 配置DNS-01验证

### 1. 修改环境变量

编辑 `.env` 文件，设置挑战类型为DNS-01：

```bash
# 设置挑战类型为DNS-01
ACME_CHALLENGE_TYPE=dns-01

# DNS传播等待时间(秒) - 可根据DNS提供商调整
ACME_DNS_PROPAGATION_WAIT=300
```

### 2. 重启应用

```bash
# Docker部署
docker-compose restart ssl-cert-system

# 或直接部署
./ssl-cert-system
```

## 🚀 使用DNS-01验证

### 1. 创建证书申请

通过Web界面或API创建证书申请，系统会自动生成DNS挑战。

### 2. 获取DNS挑战信息

#### 通过API获取
```bash
# 获取所有DNS挑战
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dns/challenges

# 获取特定域名的DNS挑战
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dns/challenges/example.com

# 获取DNS配置说明
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dns/instructions/example.com
```

#### 响应示例
```json
{
  "domain": "example.com",
  "fqdn": "_acme-challenge.example.com",
  "value": "abc123def456...",
  "status": "pending",
  "created_at": "2025-06-18T02:30:00Z"
}
```

### 3. 添加DNS TXT记录

根据获取的挑战信息，在您的DNS管理面板中添加TXT记录：

```
记录类型: TXT
记录名称: _acme-challenge.example.com
记录值: abc123def456...
TTL: 600 (或默认值)
```

#### 常见DNS提供商配置示例

**阿里云DNS**
1. 登录阿里云控制台 → 云解析DNS
2. 选择域名 → 解析设置
3. 添加记录：
   - 记录类型：TXT
   - 主机记录：_acme-challenge
   - 记录值：abc123def456...

**腾讯云DNS**
1. 登录腾讯云控制台 → DNSPod
2. 选择域名 → 记录管理
3. 添加记录：
   - 记录类型：TXT
   - 主机记录：_acme-challenge
   - 记录值：abc123def456...

**Cloudflare**
1. 登录Cloudflare → DNS
2. 添加记录：
   - Type：TXT
   - Name：_acme-challenge
   - Content：abc123def456...

### 4. 验证DNS记录

添加DNS记录后，等待DNS传播（通常5-30分钟），然后验证：

#### 通过API验证
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dns/verify/example.com
```

#### 手动验证DNS记录
```bash
# 使用nslookup验证
nslookup -type=TXT _acme-challenge.example.com

# 使用dig验证
dig TXT _acme-challenge.example.com

# 使用在线工具
# https://toolbox.googleapps.com/apps/dig/
```

### 5. 完成证书申请

DNS记录验证成功后，系统会自动完成证书申请流程。

## 📋 API接口说明

### 获取挑战类型
```
GET /api/dns/challenge-type
```

### 获取DNS挑战状态
```
GET /api/dns/status
```

### 获取所有DNS挑战
```
GET /api/dns/challenges
```

### 获取特定域名的DNS挑战
```
GET /api/dns/challenges/{domain}
```

### 获取DNS配置说明
```
GET /api/dns/instructions/{domain}
```

### 验证DNS记录
```
POST /api/dns/verify/{domain}
```

## 🌟 通配符证书申请

DNS-01验证支持通配符证书，可以保护主域名及其所有子域名：

### 申请通配符证书
1. 域名填写：`*.example.com`
2. 备用域名可添加：`example.com`
3. 按照DNS挑战要求添加TXT记录
4. 验证并完成申请

### 通配符证书优势
- 一个证书保护所有子域名
- 减少证书管理复杂度
- 降低证书申请频率

## ⚠️ 注意事项

### DNS传播时间
- 不同DNS提供商传播时间不同
- 通常需要5-30分钟
- 某些情况下可能需要几小时
- 建议设置较长的等待时间

### 记录值格式
- TXT记录值必须完全匹配
- 包含特殊字符时注意转义
- 某些DNS提供商会自动添加引号

### 安全考虑
- DNS挑战记录包含敏感信息
- 验证完成后可以删除TXT记录
- 定期检查DNS记录的安全性

## 🔧 故障排查

### 常见问题

#### 1. DNS记录未生效
```bash
# 检查DNS传播状态
dig TXT _acme-challenge.example.com @8.8.8.8
dig TXT _acme-challenge.example.com @1.1.1.1
```

#### 2. 验证失败
- 检查记录名称是否正确
- 检查记录值是否完全匹配
- 确认DNS记录已全球传播
- 检查TTL设置是否过长

#### 3. 超时错误
- 增加DNS传播等待时间
- 检查网络连接
- 确认DNS服务器响应正常

### 调试命令
```bash
# 查看应用日志
docker-compose logs ssl-cert-system

# 检查DNS挑战状态
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/dns/status
```

## 📚 相关文档

- [Let's Encrypt DNS验证文档](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)
- [ACME协议规范](https://tools.ietf.org/html/rfc8555)
- [DNS记录类型说明](https://en.wikipedia.org/wiki/List_of_DNS_record_types)

---

如有问题，请查看项目文档或提交Issue：
https://github.com/lijh1983/ssl_cert_system
