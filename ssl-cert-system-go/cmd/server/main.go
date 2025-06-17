package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"ssl-cert-system/internal/config"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/router"
	"ssl-cert-system/internal/services"
	"ssl-cert-system/internal/utils/logger"
)

// 版本信息 (构建时注入)
var (
	Version   = "1.0.2"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	// 处理命令行参数
	var showVersion = flag.Bool("version", false, "显示版本信息")
	flag.Parse()

	if *showVersion {
		fmt.Printf("SSL Certificate Management System (Go Edition)\n")
		fmt.Printf("Version: %s\n", Version)
		fmt.Printf("Build Time: %s\n", BuildTime)
		fmt.Printf("Git Commit: %s\n", GitCommit)
		fmt.Printf("Go Version: %s\n", "go1.21+")
		return
	}

	// 初始化配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化日志
	logger.Init(cfg.LogLevel)

	// 检查是否为测试模式
	if os.Getenv("NODE_ENV") == "test" {
		logger.Info("Running in test mode - skipping database and scheduler initialization")

		// 初始化路由（测试模式）
		r := router.SetupTestMode(cfg)

		// 启动服务器
		logger.Info("Starting SSL Certificate Management System (Test Mode)",
			"port", cfg.Server.Port,
			"env", cfg.Environment)

		if err := r.Run(":" + cfg.Server.Port); err != nil {
			logger.Fatal("Failed to start server", "error", err)
		}
		return
	}

	// 正常模式：初始化数据库
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

	// 初始化定时任务服务
	schedulerService, err := services.NewSchedulerService()
	if err != nil {
		logger.Fatal("Failed to initialize scheduler service", "error", err)
	}

	// 启动定时任务
	if err := schedulerService.Start(); err != nil {
		logger.Fatal("Failed to start scheduler service", "error", err)
	}

	// 初始化路由
	r := router.Setup(db, cfg)

	// 启动服务器
	logger.Info("Starting SSL Certificate Management System",
		"version", Version,
		"port", cfg.Server.Port,
		"env", cfg.Environment,
		"build_time", BuildTime,
		"git_commit", GitCommit)

	if err := r.Run(":" + cfg.Server.Port); err != nil {
		logger.Fatal("Failed to start server", "error", err)
	}
}
