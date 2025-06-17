package models

import (
	"ssl-cert-system/internal/utils/logger"

	"gorm.io/gorm"
)

// AutoMigrate 自动迁移数据库表结构
func AutoMigrate(db *gorm.DB) error {
	logger.Info("Starting database migration...")

	// 迁移所有模型
	err := db.AutoMigrate(
		&User{},
		&Server{},
		&Certificate{},
	)

	if err != nil {
		logger.Error("Database migration failed", "error", err)
		return err
	}

	logger.Info("Database migration completed successfully")
	return nil
}

// CreateIndexes 创建额外的索引
func CreateIndexes(db *gorm.DB) error {
	logger.Info("Creating additional database indexes...")

	// 为证书表创建复合索引
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_certificates_user_status ON certificates(user_id, status)").Error; err != nil {
		logger.Warn("Failed to create index idx_certificates_user_status", "error", err)
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_certificates_expires_at ON certificates(expires_at)").Error; err != nil {
		logger.Warn("Failed to create index idx_certificates_expires_at", "error", err)
	}

	// 为服务器表创建复合索引
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_servers_user_status ON servers(user_id, status)").Error; err != nil {
		logger.Warn("Failed to create index idx_servers_user_status", "error", err)
	}

	logger.Info("Database indexes created successfully")
	return nil
}
