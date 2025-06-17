package handlers

import (
	"net/http"
	"ssl-cert-system/internal/utils/jwt"
	"ssl-cert-system/internal/utils/response"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthCheckTestMode 测试模式健康检查
func HealthCheckTestMode(c *gin.Context) {
	healthResp := gin.H{
		"status":      "OK",
		"timestamp":   time.Now().Format(time.RFC3339),
		"mode":        "test",
		"version":     "1.0.0-test",
		"database":    gin.H{"connected": false, "mode": "test"},
		"message":     "SSL Certificate Management System - Test Mode",
	}

	response.Data(c, http.StatusOK, healthResp)
}

// LoginTestMode 测试模式登录
func LoginTestMode(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// 测试模式：接受任何用户名密码
	if req.Username == "" || req.Password == "" {
		response.Error(c, http.StatusUnauthorized, "Username and password required")
		return
	}

	// 生成测试JWT token
	token, err := jwt.GenerateToken(1, req.Username, false, "test_jwt_secret_key_for_testing_only", 24*time.Hour)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	loginResp := gin.H{
		"token": token,
		"user": gin.H{
			"id":       1,
			"username": req.Username,
			"email":    "test@example.com",
			"is_admin": false,
		},
	}

	response.Data(c, http.StatusOK, loginResp)
}

// RegisterTestMode 测试模式注册
func RegisterTestMode(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// 测试模式：总是成功注册
	user := gin.H{
		"id":       1,
		"username": req.Username,
		"email":    req.Email,
		"is_admin": false,
		"is_active": true,
		"created_at": time.Now(),
	}

	response.Success(c, http.StatusCreated, "User registered successfully", user)
}

// GetUsersTestMode 测试模式获取用户列表
func GetUsersTestMode(c *gin.Context) {
	users := []gin.H{
		{
			"id":       1,
			"username": "testuser",
			"email":    "test@example.com",
			"is_admin": false,
			"is_active": true,
			"created_at": time.Now().AddDate(0, 0, -1),
		},
		{
			"id":       2,
			"username": "admin",
			"email":    "admin@example.com",
			"is_admin": true,
			"is_active": true,
			"created_at": time.Now().AddDate(0, 0, -7),
		},
	}

	response.Data(c, http.StatusOK, users)
}

// GetServersTestMode 测试模式获取服务器列表
func GetServersTestMode(c *gin.Context) {
	servers := []gin.H{
		{
			"id":                1,
			"hostname":          "test-server-1.example.com",
			"ip_address":        "192.168.1.100",
			"status":            "online",
			"os_type":           "Ubuntu",
			"os_version":        "22.04",
			"web_server":        "nginx",
			"web_server_version": "1.18.0",
			"last_heartbeat":    time.Now().Add(-5 * time.Minute),
			"created_at":        time.Now().AddDate(0, 0, -10),
		},
		{
			"id":                2,
			"hostname":          "test-server-2.example.com",
			"ip_address":        "192.168.1.101",
			"status":            "offline",
			"os_type":           "CentOS",
			"os_version":        "8",
			"web_server":        "apache",
			"web_server_version": "2.4.6",
			"last_heartbeat":    time.Now().Add(-2 * time.Hour),
			"created_at":        time.Now().AddDate(0, 0, -5),
		},
	}

	response.Data(c, http.StatusOK, servers)
}

// GetCertificatesTestMode 测试模式获取证书列表
func GetCertificatesTestMode(c *gin.Context) {
	certificates := []gin.H{
		{
			"id":         1,
			"domain":     "example.com",
			"alt_domains": `["www.example.com", "api.example.com"]`,
			"status":     "issued",
			"issued_at":  time.Now().AddDate(0, 0, -30),
			"expires_at": time.Now().AddDate(0, 2, 0),
			"auto_renew": true,
			"created_at": time.Now().AddDate(0, 0, -30),
		},
		{
			"id":         2,
			"domain":     "test.example.com",
			"alt_domains": `[]`,
			"status":     "pending",
			"issued_at":  nil,
			"expires_at": nil,
			"auto_renew": true,
			"created_at": time.Now().Add(-1 * time.Hour),
		},
		{
			"id":         3,
			"domain":     "old.example.com",
			"alt_domains": `[]`,
			"status":     "expired",
			"issued_at":  time.Now().AddDate(-1, 0, 0),
			"expires_at": time.Now().AddDate(0, 0, -10),
			"auto_renew": false,
			"created_at": time.Now().AddDate(-1, 0, 0),
		},
	}

	response.Data(c, http.StatusOK, certificates)
}

// GetDashboardTestMode 测试模式获取仪表板数据
func GetDashboardTestMode(c *gin.Context) {
	dashboardData := gin.H{
		"total_certificates":    3,
		"issued_certificates":   1,
		"pending_certificates":  1,
		"expired_certificates":  1,
		"expiring_certificates": 0,
		"total_servers":         2,
		"online_servers":        1,
		"offline_servers":       1,
		"total_users":           2,
		"active_users":          2,
		"system_uptime":         "5m30s",
		"last_update":           time.Now(),
	}

	response.Data(c, http.StatusOK, dashboardData)
}
