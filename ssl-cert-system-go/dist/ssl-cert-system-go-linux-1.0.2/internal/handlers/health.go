package handlers

import (
	"net/http"
	"os"
	"runtime"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/utils/response"
	"time"

	"github.com/gin-gonic/gin"
)

var startTime = time.Now()

// HealthResponse 健康检查响应结构
type HealthResponse struct {
	Status      string            `json:"status"`
	Timestamp   string            `json:"timestamp"`
	Uptime      string            `json:"uptime"`
	Environment string            `json:"environment"`
	Version     string            `json:"version"`
	Database    DatabaseStatus    `json:"database"`
	System      SystemInfo        `json:"system"`
}

// DatabaseStatus 数据库状态
type DatabaseStatus struct {
	Connected bool   `json:"connected"`
	Error     string `json:"error,omitempty"`
}

// SystemInfo 系统信息
type SystemInfo struct {
	GoVersion    string `json:"go_version"`
	NumGoroutine int    `json:"num_goroutine"`
	NumCPU       int    `json:"num_cpu"`
}

// HealthCheck 健康检查处理器
func HealthCheck(c *gin.Context) {
	// 检查数据库连接
	dbStatus := DatabaseStatus{Connected: true}
	if db := database.GetDB(); db != nil {
		sqlDB, err := db.DB()
		if err != nil || sqlDB.Ping() != nil {
			dbStatus.Connected = false
			if err != nil {
				dbStatus.Error = err.Error()
			} else {
				dbStatus.Error = "database ping failed"
			}
		}
	} else {
		dbStatus.Connected = false
		dbStatus.Error = "database not initialized"
	}

	// 获取环境信息
	env := os.Getenv("NODE_ENV")
	if env == "" {
		env = "production"
	}

	// 构建响应
	healthResp := HealthResponse{
		Status:      "OK",
		Timestamp:   time.Now().Format(time.RFC3339),
		Uptime:      time.Since(startTime).String(),
		Environment: env,
		Version:     getVersion(),
		Database:    dbStatus,
		System: SystemInfo{
			GoVersion:    runtime.Version(),
			NumGoroutine: runtime.NumGoroutine(),
			NumCPU:       runtime.NumCPU(),
		},
	}

	// 如果数据库连接失败，返回503状态码
	if !dbStatus.Connected {
		response.Data(c, http.StatusServiceUnavailable, healthResp)
		return
	}

	response.Data(c, http.StatusOK, healthResp)
}

// APIInfo API信息处理器
func APIInfo(c *gin.Context) {
	info := gin.H{
		"name":        "SSL Certificate Management System API",
		"version":     "1.0.0",
		"description": "Go语言重写版本的SSL证书管理系统API",
		"endpoints": gin.H{
			"health":       "/api/health",
			"auth":         "/api/auth/*",
			"users":        "/api/users/*",
			"servers":      "/api/servers/*",
			"certificates": "/api/certificates/*",
			"monitors":     "/api/monitors/*",
		},
	}

	response.Data(c, http.StatusOK, info)
}

// getVersion 获取版本信息
func getVersion() string {
	// 这里可以从构建时注入的变量获取版本信息
	// 或者从环境变量获取
	if version := os.Getenv("APP_VERSION"); version != "" {
		return version
	}
	return "1.0.0"
}
