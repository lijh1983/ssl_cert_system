package main

import (
	"log"
	"ssl-cert-system/internal/config"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/router"
	"ssl-cert-system/internal/utils/logger"
)

func main() {
	// 初始化配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化日志
	logger.Init(cfg.LogLevel)

	// 初始化数据库
	db, err := database.Init(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", "error", err)
	}

	// 自动迁移数据库表结构
	if err := models.AutoMigrate(db); err != nil {
		logger.Fatal("Failed to migrate database", "error", err)
	}

	// 创建额外的索引
	if err := models.CreateIndexes(db); err != nil {
		logger.Warn("Failed to create some indexes", "error", err)
	}

	// 初始化路由
	r := router.Setup(db, cfg)

	// 启动服务器
	logger.Info("Starting SSL Certificate Management System", 
		"port", cfg.Server.Port,
		"env", cfg.Environment)

	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Fatal("Failed to start server", "error", err)
	}
}
