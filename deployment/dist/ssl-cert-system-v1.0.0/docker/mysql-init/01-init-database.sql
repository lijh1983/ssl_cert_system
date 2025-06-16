-- SSL证书管理系统数据库初始化脚本
-- 创建时间: 2025-01-16
-- 版本: 1.0.0

USE ssl_cert_system;

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(100) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `is_admin` boolean DEFAULT FALSE,
  `is_active` boolean DEFAULT TRUE,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 服务器表
CREATE TABLE IF NOT EXISTS `servers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hostname` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `os_type` varchar(50) DEFAULT NULL,
  `os_version` varchar(50) DEFAULT NULL,
  `web_server` varchar(50) DEFAULT NULL,
  `web_server_version` varchar(50) DEFAULT NULL,
  `status` enum('online','offline','error','maintenance') DEFAULT 'offline',
  `auto_deploy` boolean DEFAULT FALSE,
  `last_heartbeat` timestamp NULL,
  `ping_latency` int DEFAULT NULL,
  `cpu_usage` decimal(5,2) DEFAULT NULL,
  `memory_usage` decimal(5,2) DEFAULT NULL,
  `disk_usage` decimal(5,2) DEFAULT NULL,
  `load_average` varchar(50) DEFAULT NULL,
  `uptime` varchar(100) DEFAULT NULL,
  `note` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hostname` (`hostname`),
  INDEX `idx_ip_address` (`ip_address`),
  INDEX `idx_status` (`status`),
  INDEX `idx_auto_deploy` (`auto_deploy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 证书表
CREATE TABLE IF NOT EXISTS `certificates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `domain` varchar(255) NOT NULL,
  `alt_domains` text,
  `status` enum('pending','issued','expired','error','revoked') DEFAULT 'pending',
  `issuer` varchar(255) DEFAULT 'Let\'s Encrypt',
  `encryption_type` varchar(50) DEFAULT 'ECC',
  `auto_renew` boolean DEFAULT TRUE,
  `valid_from` timestamp NULL,
  `valid_to` timestamp NULL,
  `days_remaining` int DEFAULT NULL,
  `cert_path` varchar(500) DEFAULT NULL,
  `key_path` varchar(500) DEFAULT NULL,
  `ca_path` varchar(500) DEFAULT NULL,
  `fullchain_path` varchar(500) DEFAULT NULL,
  `note` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_domain` (`domain`),
  INDEX `idx_status` (`status`),
  INDEX `idx_auto_renew` (`auto_renew`),
  INDEX `idx_valid_to` (`valid_to`),
  INDEX `idx_days_remaining` (`days_remaining`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 证书部署记录表
CREATE TABLE IF NOT EXISTS `certificate_deployments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `certificate_id` int NOT NULL,
  `server_id` int NOT NULL,
  `status` enum('pending','deployed','failed','removed') DEFAULT 'pending',
  `deployed_at` timestamp NULL,
  `deployment_log` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cert_server` (`certificate_id`, `server_id`),
  INDEX `idx_certificate_id` (`certificate_id`),
  INDEX `idx_server_id` (`server_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`certificate_id`) REFERENCES `certificates` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`server_id`) REFERENCES `servers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统日志表
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `level` enum('info','warning','error','debug') DEFAULT 'info',
  `message` text NOT NULL,
  `source` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `extra_data` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_level` (`level`),
  INDEX `idx_source` (`source`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员用户
-- 密码: admin123 (请在生产环境中修改)
INSERT IGNORE INTO `users` (`username`, `email`, `password_hash`, `is_admin`, `is_active`) VALUES
('admin', 'admin@example.com', '$2b$10$rQZ9vKzQ8YxKzQ8YxKzQ8O7vKzQ8YxKzQ8YxKzQ8YxKzQ8YxKzQ8Y', TRUE, TRUE);

-- 插入示例服务器
INSERT IGNORE INTO `servers` (`hostname`, `ip_address`, `os_type`, `os_version`, `web_server`, `web_server_version`, `status`, `auto_deploy`) VALUES
('demo-server.example.com', '192.168.1.100', 'Ubuntu', '22.04 LTS', 'Nginx', '1.20.1', 'online', TRUE);

-- 插入示例证书
INSERT IGNORE INTO `certificates` (`domain`, `alt_domains`, `status`, `issuer`, `encryption_type`, `auto_renew`, `valid_from`, `valid_to`, `days_remaining`) VALUES
('example.com', 'www.example.com,api.example.com', 'issued', 'Let\'s Encrypt Authority X3', 'ECC P-256', TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 90);

-- 设置外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 创建视图：证书概览
CREATE OR REPLACE VIEW `certificate_overview` AS
SELECT 
    c.id,
    c.domain,
    c.status,
    c.days_remaining,
    c.auto_renew,
    COUNT(cd.id) as deployment_count,
    c.created_at,
    c.updated_at
FROM certificates c
LEFT JOIN certificate_deployments cd ON c.id = cd.certificate_id AND cd.status = 'deployed'
GROUP BY c.id;

-- 创建视图：服务器概览
CREATE OR REPLACE VIEW `server_overview` AS
SELECT 
    s.id,
    s.hostname,
    s.ip_address,
    s.status,
    s.auto_deploy,
    COUNT(cd.id) as certificate_count,
    s.last_heartbeat,
    s.created_at,
    s.updated_at
FROM servers s
LEFT JOIN certificate_deployments cd ON s.id = cd.server_id AND cd.status = 'deployed'
GROUP BY s.id;

-- 创建存储过程：更新证书剩余天数
DELIMITER //
CREATE PROCEDURE UpdateCertificateRemainingDays()
BEGIN
    UPDATE certificates 
    SET days_remaining = DATEDIFF(valid_to, NOW())
    WHERE valid_to IS NOT NULL;
END //
DELIMITER ;

-- 创建事件：每日更新证书剩余天数
SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS update_certificate_days
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL UpdateCertificateRemainingDays();

-- 输出初始化完成信息
SELECT 'SSL证书管理系统数据库初始化完成！' as message;
SELECT CONCAT('默认管理员账号: admin / admin123') as admin_info;
SELECT CONCAT('数据库版本: ', VERSION()) as db_version;
SELECT CONCAT('当前时间: ', NOW()) as current_time;
