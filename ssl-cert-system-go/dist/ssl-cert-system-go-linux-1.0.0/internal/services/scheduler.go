package services

import (
	"errors"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/repositories"
	"ssl-cert-system/internal/utils/logger"
	"time"

	"github.com/robfig/cron/v3"
)

// SchedulerService 定时任务服务
type SchedulerService struct {
	cron     *cron.Cron
	certRepo repositories.CertificateRepository
	certSvc  *CertificateService
	running  bool
}

// NewSchedulerService 创建定时任务服务实例
func NewSchedulerService() (*SchedulerService, error) {
	certSvc, err := NewCertificateService()
	if err != nil {
		return nil, err
	}

	return &SchedulerService{
		cron:     cron.New(cron.WithSeconds()),
		certRepo: repositories.NewCertificateRepository(database.GetDB()),
		certSvc:  certSvc,
		running:  false,
	}, nil
}

// Start 启动定时任务服务
func (s *SchedulerService) Start() error {
	if s.running {
		logger.Warn("Scheduler service is already running")
		return nil
	}

	logger.Info("Starting scheduler service...")

	// 每天凌晨2点检查证书状态
	_, err := s.cron.AddFunc("0 0 2 * * *", s.checkCertificatesStatus)
	if err != nil {
		return err
	}

	// 每天凌晨3点执行自动续期
	_, err = s.cron.AddFunc("0 0 3 * * *", s.autoRenewCertificates)
	if err != nil {
		return err
	}

	// 每小时清理过期的临时文件
	_, err = s.cron.AddFunc("0 0 * * * *", s.cleanupExpiredFiles)
	if err != nil {
		return err
	}

	// 每天凌晨4点更新证书状态统计
	_, err = s.cron.AddFunc("0 0 4 * * *", s.updateCertificateStats)
	if err != nil {
		return err
	}

	// 启动定时任务
	s.cron.Start()
	s.running = true

	logger.Info("Scheduler service started successfully")
	return nil
}

// Stop 停止定时任务服务
func (s *SchedulerService) Stop() {
	if !s.running {
		logger.Warn("Scheduler service is not running")
		return
	}

	logger.Info("Stopping scheduler service...")
	
	ctx := s.cron.Stop()
	select {
	case <-ctx.Done():
		logger.Info("Scheduler service stopped gracefully")
	case <-time.After(30 * time.Second):
		logger.Warn("Scheduler service stop timeout")
	}
	
	s.running = false
}

// IsRunning 检查定时任务服务是否运行中
func (s *SchedulerService) IsRunning() bool {
	return s.running
}

// checkCertificatesStatus 检查证书状态
func (s *SchedulerService) checkCertificatesStatus() {
	logger.Info("Starting certificate status check")

	// 检查即将过期的证书
	if err := s.certSvc.CheckExpiringCertificates(); err != nil {
		logger.Error("Failed to check expiring certificates", "error", err)
	}

	// 更新已过期证书的状态
	expiredCerts, err := s.certRepo.FindExpired()
	if err != nil {
		logger.Error("Failed to find expired certificates", "error", err)
		return
	}

	for _, cert := range expiredCerts {
		if cert.Status != "expired" {
			err := s.certRepo.UpdateByID(cert.ID, map[string]interface{}{
				"status": "expired",
			})
			if err != nil {
				logger.Error("Failed to update expired certificate status",
					"cert_id", cert.ID,
					"domain", cert.Domain,
					"error", err)
			} else {
				logger.Info("Updated certificate status to expired",
					"cert_id", cert.ID,
					"domain", cert.Domain)
			}
		}
	}

	logger.Info("Certificate status check completed",
		"expired_count", len(expiredCerts))
}

// autoRenewCertificates 自动续期证书
func (s *SchedulerService) autoRenewCertificates() {
	logger.Info("Starting automatic certificate renewal")

	// 查找需要续期的证书
	expiringCerts, err := s.certRepo.FindExpiring(30) // 30天内过期
	if err != nil {
		logger.Error("Failed to find expiring certificates", "error", err)
		return
	}

	renewCount := 0
	for _, cert := range expiringCerts {
		if cert.ShouldRenew() {
			logger.Info("Auto-renewing certificate",
				"cert_id", cert.ID,
				"domain", cert.Domain,
				"expires_at", cert.ExpiresAt)

			// 异步续期证书
			go func(certID uint, userID uint) {
				if err := s.certSvc.RenewCertificate(certID, userID); err != nil {
					logger.Error("Failed to auto-renew certificate",
						"cert_id", certID,
						"error", err)
				}
			}(cert.ID, cert.UserID)

			renewCount++
		}
	}

	logger.Info("Automatic certificate renewal completed",
		"total_expiring", len(expiringCerts),
		"renewed_count", renewCount)
}

// cleanupExpiredFiles 清理过期文件
func (s *SchedulerService) cleanupExpiredFiles() {
	logger.Info("Starting cleanup of expired files")

	// 创建文件服务
	fileService, err := NewFileService()
	if err != nil {
		logger.Error("Failed to create file service", "error", err)
		return
	}

	// 清理临时文件
	if err := fileService.CleanupTempFiles(); err != nil {
		logger.Error("Failed to cleanup temp files", "error", err)
	}

	// 获取所有现有证书的域名
	allCerts, err := s.certRepo.FindAll()
	if err != nil {
		logger.Error("Failed to get certificates for cleanup", "error", err)
		return
	}

	existingDomains := make([]string, 0, len(allCerts))
	for _, cert := range allCerts {
		existingDomains = append(existingDomains, cert.Domain)
	}

	// 清理已删除证书的文件
	if err := fileService.CleanupDeletedCertificates(existingDomains); err != nil {
		logger.Error("Failed to cleanup deleted certificate files", "error", err)
	}

	logger.Info("Cleanup of expired files completed")
}

// updateCertificateStats 更新证书统计信息
func (s *SchedulerService) updateCertificateStats() {
	logger.Info("Starting certificate statistics update")

	// 统计各种状态的证书数量
	totalCount, _ := s.certRepo.Count()
	issuedCount, _ := s.certRepo.CountByStatus("issued")
	pendingCount, _ := s.certRepo.CountByStatus("pending")
	errorCount, _ := s.certRepo.CountByStatus("error")
	expiredCount, _ := s.certRepo.CountExpired()
	expiringCount, _ := s.certRepo.CountExpiring(30)

	logger.Info("Certificate statistics updated",
		"total", totalCount,
		"issued", issuedCount,
		"pending", pendingCount,
		"error", errorCount,
		"expired", expiredCount,
		"expiring_30_days", expiringCount)
}

// RunTask 手动执行任务
func (s *SchedulerService) RunTask(taskName string) error {
	logger.Info("Manually running task", "task", taskName)

	switch taskName {
	case "check_certificates":
		s.checkCertificatesStatus()
	case "auto_renew":
		s.autoRenewCertificates()
	case "cleanup_files":
		s.cleanupExpiredFiles()
	case "update_stats":
		s.updateCertificateStats()
	default:
		logger.Error("Unknown task name", "task", taskName)
		return errors.New("unknown task name: " + taskName)
	}

	logger.Info("Task completed", "task", taskName)
	return nil
}

// GetTaskStatus 获取任务状态
func (s *SchedulerService) GetTaskStatus() map[string]interface{} {
	entries := s.cron.Entries()
	
	return map[string]interface{}{
		"running":    s.running,
		"task_count": len(entries),
		"next_runs":  s.getNextRuns(entries),
	}
}

// getNextRuns 获取下次运行时间
func (s *SchedulerService) getNextRuns(entries []cron.Entry) map[string]time.Time {
	nextRuns := make(map[string]time.Time)
	
	if len(entries) >= 4 {
		nextRuns["check_certificates"] = entries[0].Next
		nextRuns["auto_renew"] = entries[1].Next
		nextRuns["cleanup_files"] = entries[2].Next
		nextRuns["update_stats"] = entries[3].Next
	}
	
	return nextRuns
}
