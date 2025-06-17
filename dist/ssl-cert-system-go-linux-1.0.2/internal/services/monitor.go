package services

import (
	"fmt"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/repositories"
	"ssl-cert-system/internal/utils/logger"
	"time"
)

var startTime = time.Now()

// MonitorService 监控服务
type MonitorService struct {
	certRepo   repositories.CertificateRepository
	serverRepo repositories.ServerRepository
	userRepo   repositories.UserRepository
}

// NewMonitorService 创建监控服务实例
func NewMonitorService() *MonitorService {
	return &MonitorService{
		certRepo:   repositories.NewCertificateRepository(database.GetDB()),
		serverRepo: repositories.NewServerRepository(database.GetDB()),
		userRepo:   repositories.NewUserRepository(database.GetDB()),
	}
}

// DashboardStats 仪表板统计数据
type DashboardStats struct {
	// 证书统计
	TotalCertificates    int64 `json:"total_certificates"`
	IssuedCertificates   int64 `json:"issued_certificates"`
	PendingCertificates  int64 `json:"pending_certificates"`
	ErrorCertificates    int64 `json:"error_certificates"`
	ExpiredCertificates  int64 `json:"expired_certificates"`
	ExpiringCertificates int64 `json:"expiring_certificates"`

	// 服务器统计
	TotalServers   int64 `json:"total_servers"`
	OnlineServers  int64 `json:"online_servers"`
	OfflineServers int64 `json:"offline_servers"`

	// 用户统计
	TotalUsers  int64 `json:"total_users"`
	ActiveUsers int64 `json:"active_users"`

	// 系统统计
	SystemUptime string    `json:"system_uptime"`
	LastUpdate   time.Time `json:"last_update"`
}

// GetDashboardStats 获取仪表板统计数据
func (s *MonitorService) GetDashboardStats() (*DashboardStats, error) {
	logger.Info("Collecting dashboard statistics")

	stats := &DashboardStats{
		LastUpdate: time.Now(),
	}

	// 证书统计
	var err error
	stats.TotalCertificates, err = s.certRepo.Count()
	if err != nil {
		logger.Error("Failed to get total certificates count", "error", err)
		return nil, err
	}

	stats.IssuedCertificates, err = s.certRepo.CountByStatus("issued")
	if err != nil {
		logger.Error("Failed to get issued certificates count", "error", err)
	}

	stats.PendingCertificates, err = s.certRepo.CountByStatus("pending")
	if err != nil {
		logger.Error("Failed to get pending certificates count", "error", err)
	}

	stats.ErrorCertificates, err = s.certRepo.CountByStatus("error")
	if err != nil {
		logger.Error("Failed to get error certificates count", "error", err)
	}

	stats.ExpiredCertificates, err = s.certRepo.CountExpired()
	if err != nil {
		logger.Error("Failed to get expired certificates count", "error", err)
	}

	stats.ExpiringCertificates, err = s.certRepo.CountExpiring(30)
	if err != nil {
		logger.Error("Failed to get expiring certificates count", "error", err)
	}

	// 服务器统计
	stats.TotalServers, err = s.serverRepo.Count()
	if err != nil {
		logger.Error("Failed to get total servers count", "error", err)
	}

	stats.OnlineServers, err = s.serverRepo.CountByStatus("online")
	if err != nil {
		logger.Error("Failed to get online servers count", "error", err)
	}

	stats.OfflineServers, err = s.serverRepo.CountByStatus("offline")
	if err != nil {
		logger.Error("Failed to get offline servers count", "error", err)
	}

	// 用户统计
	stats.TotalUsers, err = s.userRepo.Count()
	if err != nil {
		logger.Error("Failed to get total users count", "error", err)
	}

	// TODO: 实现活跃用户统计
	stats.ActiveUsers = stats.TotalUsers

	// 系统运行时间
	stats.SystemUptime = time.Since(startTime).String()

	logger.Info("Dashboard statistics collected successfully",
		"total_certificates", stats.TotalCertificates,
		"total_servers", stats.TotalServers,
		"total_users", stats.TotalUsers)

	return stats, nil
}

// CertificateMonitorData 证书监控数据
type CertificateMonitorData struct {
	ID          uint      `json:"id"`
	Domain      string    `json:"domain"`
	Status      string    `json:"status"`
	IssuedAt    *time.Time `json:"issued_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	DaysLeft    int       `json:"days_left"`
	AutoRenew   bool      `json:"auto_renew"`
	LastError   string    `json:"last_error,omitempty"`
	ServerName  string    `json:"server_name,omitempty"`
	UserName    string    `json:"user_name,omitempty"`
}

// GetCertificateMonitorData 获取证书监控数据
func (s *MonitorService) GetCertificateMonitorData(userID *uint) ([]*CertificateMonitorData, error) {
	var certs []*models.Certificate
	var err error

	if userID != nil {
		// 获取特定用户的证书
		certs, err = s.certRepo.FindByUserID(*userID)
	} else {
		// 获取所有证书（管理员视图）
		certs, err = s.certRepo.FindAll()
	}

	if err != nil {
		return nil, err
	}

	monitorData := make([]*CertificateMonitorData, 0, len(certs))
	for _, cert := range certs {
		data := &CertificateMonitorData{
			ID:        cert.ID,
			Domain:    cert.Domain,
			Status:    cert.Status,
			IssuedAt:  cert.IssuedAt,
			ExpiresAt: cert.ExpiresAt,
			AutoRenew: cert.AutoRenew,
			LastError: cert.LastError,
		}

		// 计算剩余天数
		if cert.ExpiresAt != nil {
			data.DaysLeft = cert.DaysUntilExpiry()
		}

		// 添加服务器信息
		if cert.Server != nil {
			data.ServerName = cert.Server.Hostname
		}

		// 添加用户信息
		if cert.User.Username != "" {
			data.UserName = cert.User.Username
		}

		monitorData = append(monitorData, data)
	}

	return monitorData, nil
}

// ServerMonitorData 服务器监控数据
type ServerMonitorData struct {
	ID               uint       `json:"id"`
	Hostname         string     `json:"hostname"`
	IPAddress        string     `json:"ip_address"`
	Status           string     `json:"status"`
	OSType           string     `json:"os_type"`
	WebServer        string     `json:"web_server"`
	LastHeartbeat    *time.Time `json:"last_heartbeat"`
	CertificateCount int64      `json:"certificate_count"`
	UserName         string     `json:"user_name,omitempty"`
}

// GetServerMonitorData 获取服务器监控数据
func (s *MonitorService) GetServerMonitorData(userID *uint) ([]*ServerMonitorData, error) {
	var servers []*models.Server
	var err error

	if userID != nil {
		// 获取特定用户的服务器
		servers, err = s.serverRepo.FindByUserID(*userID)
	} else {
		// 获取所有服务器（管理员视图）
		servers, err = s.serverRepo.FindAll()
	}

	if err != nil {
		return nil, err
	}

	monitorData := make([]*ServerMonitorData, 0, len(servers))
	for _, server := range servers {
		// 获取服务器关联的证书数量
		certCount, _ := s.serverRepo.CountCertificates(server.ID)

		data := &ServerMonitorData{
			ID:               server.ID,
			Hostname:         server.Hostname,
			IPAddress:        server.IPAddress,
			Status:           server.Status,
			OSType:           server.OSType,
			WebServer:        server.WebServer,
			LastHeartbeat:    server.LastHeartbeat,
			CertificateCount: certCount,
		}

		// 添加用户信息
		if server.User.Username != "" {
			data.UserName = server.User.Username
		}

		monitorData = append(monitorData, data)
	}

	return monitorData, nil
}

// SystemHealthData 系统健康数据
type SystemHealthData struct {
	DatabaseStatus   string    `json:"database_status"`
	SchedulerStatus  string    `json:"scheduler_status"`
	ACMEServiceStatus string   `json:"acme_service_status"`
	LastHealthCheck  time.Time `json:"last_health_check"`
	Uptime          string    `json:"uptime"`
	MemoryUsage     string    `json:"memory_usage"`
	GoroutineCount  int       `json:"goroutine_count"`
}

// GetSystemHealth 获取系统健康状态
func (s *MonitorService) GetSystemHealth() (*SystemHealthData, error) {
	health := &SystemHealthData{
		LastHealthCheck: time.Now(),
		Uptime:         time.Since(startTime).String(),
	}

	// 检查数据库状态
	if db := database.GetDB(); db != nil {
		sqlDB, err := db.DB()
		if err != nil || sqlDB.Ping() != nil {
			health.DatabaseStatus = "error"
		} else {
			health.DatabaseStatus = "healthy"
		}
	} else {
		health.DatabaseStatus = "disconnected"
	}

	// 检查定时任务状态
	// TODO: 实现定时任务状态检查
	health.SchedulerStatus = "running"

	// 检查ACME服务状态
	// TODO: 实现ACME服务状态检查
	health.ACMEServiceStatus = "ready"

	// TODO: 添加内存使用和goroutine统计
	health.MemoryUsage = "N/A"
	health.GoroutineCount = 0

	return health, nil
}

// AlertData 告警数据
type AlertData struct {
	Type        string    `json:"type"`
	Level       string    `json:"level"`
	Message     string    `json:"message"`
	Timestamp   time.Time `json:"timestamp"`
	ResourceID  uint      `json:"resource_id,omitempty"`
	ResourceType string   `json:"resource_type,omitempty"`
}

// GetAlerts 获取系统告警
func (s *MonitorService) GetAlerts() ([]*AlertData, error) {
	alerts := make([]*AlertData, 0)

	// 检查即将过期的证书
	expiringCerts, err := s.certRepo.FindExpiring(7) // 7天内过期
	if err == nil {
		for _, cert := range expiringCerts {
			alerts = append(alerts, &AlertData{
				Type:         "certificate_expiring",
				Level:        "warning",
				Message:      fmt.Sprintf("Certificate for %s will expire in %d days", cert.Domain, cert.DaysUntilExpiry()),
				Timestamp:    time.Now(),
				ResourceID:   cert.ID,
				ResourceType: "certificate",
			})
		}
	}

	// 检查已过期的证书
	expiredCerts, err := s.certRepo.FindExpired()
	if err == nil {
		for _, cert := range expiredCerts {
			if cert.Status != "expired" {
				alerts = append(alerts, &AlertData{
					Type:         "certificate_expired",
					Level:        "error",
					Message:      fmt.Sprintf("Certificate for %s has expired", cert.Domain),
					Timestamp:    time.Now(),
					ResourceID:   cert.ID,
					ResourceType: "certificate",
				})
			}
		}
	}

	// 检查离线服务器
	offlineServers, err := s.serverRepo.FindAll()
	if err == nil {
		for _, server := range offlineServers {
			if !server.IsOnline() {
				alerts = append(alerts, &AlertData{
					Type:         "server_offline",
					Level:        "warning",
					Message:      fmt.Sprintf("Server %s is offline", server.Hostname),
					Timestamp:    time.Now(),
					ResourceID:   server.ID,
					ResourceType: "server",
				})
			}
		}
	}

	return alerts, nil
}
