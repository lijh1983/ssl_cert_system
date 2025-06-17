package router

import (
	"ssl-cert-system/internal/config"
	"ssl-cert-system/internal/handlers"
	"ssl-cert-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Setup 设置路由
func Setup(db *gorm.DB, cfg *config.Config) *gin.Engine {
	// 设置Gin模式
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// 基础中间件
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.Security())

	// 健康检查
	r.GET("/health", handlers.HealthCheck)
	r.GET("/api/health", handlers.HealthCheck)

	// API路由组
	api := r.Group("/api")
	{
		// 认证路由
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register)
			auth.POST("/refresh", handlers.RefreshToken)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.Auth(cfg.JWT.Secret))
		{
			// 用户路由
			users := protected.Group("/users")
			{
				users.GET("", handlers.GetUsers)
				users.GET("/:id", handlers.GetUser)
				users.PUT("/:id", handlers.UpdateUser)
				users.DELETE("/:id", handlers.DeleteUser)
			}

			// 服务器路由
			servers := protected.Group("/servers")
			{
				servers.GET("", handlers.GetServers)
				servers.POST("", handlers.CreateServer)
				servers.GET("/:id", handlers.GetServer)
				servers.PUT("/:id", handlers.UpdateServer)
				servers.DELETE("/:id", handlers.DeleteServer)
				servers.POST("/:id/heartbeat", handlers.ServerHeartbeat)
			}

			// 证书路由
			certificates := protected.Group("/certificates")
			{
				certificates.GET("", handlers.GetCertificates)
				certificates.POST("", handlers.CreateCertificate)
				certificates.GET("/:id", handlers.GetCertificate)
				certificates.PUT("/:id", handlers.UpdateCertificate)
				certificates.DELETE("/:id", handlers.DeleteCertificate)
				certificates.POST("/:id/verify", handlers.VerifyDomain)
				certificates.POST("/:id/renew", handlers.RenewCertificate)
				certificates.GET("/:id/download", handlers.DownloadCertificate)
			}

			// 监控路由
			monitors := protected.Group("/monitors")
			{
				monitors.GET("/dashboard", handlers.GetDashboard)
				monitors.GET("/certificates", handlers.GetCertificateMonitor)
				monitors.GET("/servers", handlers.GetServerMonitor)
				monitors.GET("/health", handlers.GetSystemHealth)
				monitors.GET("/alerts", handlers.GetAlerts)
			}
		}
	}

	// API根路径
	api.GET("", handlers.APIInfo)

	return r
}
