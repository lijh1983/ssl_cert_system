package services

import (
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/repositories"
	"ssl-cert-system/internal/utils/logger"
	"time"
)

// CertificateService 证书服务
type CertificateService struct {
	certRepo repositories.CertificateRepository
	acmeService *ACMEService
}

// NewCertificateService 创建证书服务实例
func NewCertificateService() (*CertificateService, error) {
	acmeService, err := NewACMEService()
	if err != nil {
		return nil, fmt.Errorf("failed to create ACME service: %w", err)
	}

	return &CertificateService{
		certRepo: repositories.NewCertificateRepository(database.GetDB()),
		acmeService: acmeService,
	}, nil
}

// CreateCertificateRequest 创建证书请求
type CreateCertificateRequest struct {
	Domain     string   `json:"domain" binding:"required"`
	AltDomains []string `json:"alt_domains"`
	ServerID   *uint    `json:"server_id"`
	AutoRenew  bool     `json:"auto_renew"`
	RenewDays  int      `json:"renew_days"`
}

// CreateCertificate 创建证书
func (s *CertificateService) CreateCertificate(userID uint, req *CreateCertificateRequest) (*models.Certificate, error) {
	logger.Info("Creating certificate",
		"user_id", userID,
		"domain", req.Domain,
		"alt_domains", req.AltDomains)

	// 检查域名是否已存在
	if _, err := s.certRepo.FindByDomain(req.Domain); err == nil {
		return nil, errors.New("certificate for this domain already exists")
	}

	// 序列化备用域名
	altDomainsJSON := ""
	if len(req.AltDomains) > 0 {
		altDomainsBytes, _ := json.Marshal(req.AltDomains)
		altDomainsJSON = string(altDomainsBytes)
	}

	// 设置默认值
	renewDays := req.RenewDays
	if renewDays <= 0 {
		renewDays = 30
	}

	// 创建证书记录
	cert := &models.Certificate{
		UserID:     userID,
		ServerID:   req.ServerID,
		Domain:     req.Domain,
		AltDomains: altDomainsJSON,
		Status:     "pending",
		AutoRenew:  req.AutoRenew,
		RenewDays:  renewDays,
	}

	// 保存到数据库
	createdCert, err := s.certRepo.Create(cert)
	if err != nil {
		logger.Error("Failed to create certificate record",
			"domain", req.Domain,
			"error", err)
		return nil, fmt.Errorf("failed to create certificate record: %w", err)
	}

	// 异步申请证书
	go s.issueCertificateAsync(createdCert.ID, req.Domain, req.AltDomains)

	return createdCert, nil
}

// issueCertificateAsync 异步申请证书
func (s *CertificateService) issueCertificateAsync(certID uint, domain string, altDomains []string) {
	logger.Info("Starting async certificate issuance",
		"cert_id", certID,
		"domain", domain)

	// 申请证书
	result, err := s.acmeService.IssueCertificate(domain, altDomains)
	if err != nil {
		logger.Error("Failed to issue certificate",
			"cert_id", certID,
			"domain", domain,
			"error", err)

		// 更新状态为错误
		s.certRepo.UpdateByID(certID, map[string]interface{}{
			"status":     "error",
			"last_error": err.Error(),
		})
		return
	}

	// 解析证书信息
	certInfo, err := s.parseCertificateInfo(result.Certificate)
	if err != nil {
		logger.Error("Failed to parse certificate info",
			"cert_id", certID,
			"domain", domain,
			"error", err)

		s.certRepo.UpdateByID(certID, map[string]interface{}{
			"status":     "error",
			"last_error": err.Error(),
		})
		return
	}

	// 更新证书信息
	nextRenewAt := certInfo.ExpiresAt.AddDate(0, 0, -30) // 提前30天续期

	updateData := map[string]interface{}{
		"status":            "issued",
		"certificate_path":  result.CertificatePath,
		"private_key_path":  result.PrivateKeyPath,
		"chain_path":        result.ChainPath,
		"issued_at":         &certInfo.IssuedAt,
		"expires_at":        &certInfo.ExpiresAt,
		"next_renew_at":     &nextRenewAt,
		"last_error":        "",
	}

	if err := s.certRepo.UpdateByID(certID, updateData); err != nil {
		logger.Error("Failed to update certificate record",
			"cert_id", certID,
			"error", err)
		return
	}

	logger.Info("Certificate issued and updated successfully",
		"cert_id", certID,
		"domain", domain,
		"expires_at", certInfo.ExpiresAt)
}

// CertificateInfo 证书信息
type CertificateInfo struct {
	IssuedAt  time.Time
	ExpiresAt time.Time
	Subject   string
	Issuer    string
}

// parseCertificateInfo 解析证书信息
func (s *CertificateService) parseCertificateInfo(certPEM []byte) (*CertificateInfo, error) {
	block, _ := pem.Decode(certPEM)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	return &CertificateInfo{
		IssuedAt:  cert.NotBefore,
		ExpiresAt: cert.NotAfter,
		Subject:   cert.Subject.String(),
		Issuer:    cert.Issuer.String(),
	}, nil
}

// GetCertificates 获取证书列表
func (s *CertificateService) GetCertificates(userID uint) ([]*models.Certificate, error) {
	return s.certRepo.FindByUserID(userID)
}

// GetCertificateByID 根据ID获取证书
func (s *CertificateService) GetCertificateByID(id uint, userID uint) (*models.Certificate, error) {
	cert, err := s.certRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// 检查权限
	if cert.UserID != userID {
		return nil, errors.New("access denied")
	}

	return cert, nil
}

// RenewCertificate 续期证书
func (s *CertificateService) RenewCertificate(id uint, userID uint) error {
	cert, err := s.GetCertificateByID(id, userID)
	if err != nil {
		return err
	}

	if cert.Status != "issued" {
		return errors.New("certificate is not in issued status")
	}

	logger.Info("Starting certificate renewal",
		"cert_id", id,
		"domain", cert.Domain)

	// 异步续期证书
	go s.renewCertificateAsync(cert)

	return nil
}

// renewCertificateAsync 异步续期证书
func (s *CertificateService) renewCertificateAsync(cert *models.Certificate) {
	// 解析备用域名
	var altDomains []string
	if cert.AltDomains != "" {
		json.Unmarshal([]byte(cert.AltDomains), &altDomains)
	}

	// 续期证书
	result, err := s.acmeService.IssueCertificate(cert.Domain, altDomains)
	if err != nil {
		logger.Error("Failed to renew certificate",
			"cert_id", cert.ID,
			"domain", cert.Domain,
			"error", err)

		// 增加续期尝试次数
		s.certRepo.UpdateByID(cert.ID, map[string]interface{}{
			"renew_attempts": cert.RenewAttempts + 1,
			"last_error":     err.Error(),
		})
		return
	}

	// 解析证书信息
	certInfo, err := s.parseCertificateInfo(result.Certificate)
	if err != nil {
		logger.Error("Failed to parse renewed certificate info",
			"cert_id", cert.ID,
			"error", err)
		return
	}

	// 更新证书信息
	now := time.Now()
	nextRenewAt := certInfo.ExpiresAt.AddDate(0, 0, -cert.RenewDays)

	updateData := map[string]interface{}{
		"certificate_path": result.CertificatePath,
		"private_key_path": result.PrivateKeyPath,
		"chain_path":       result.ChainPath,
		"issued_at":        &certInfo.IssuedAt,
		"expires_at":       &certInfo.ExpiresAt,
		"last_renew_at":    &now,
		"next_renew_at":    &nextRenewAt,
		"renew_attempts":   0,
		"last_error":       "",
	}

	if err := s.certRepo.UpdateByID(cert.ID, updateData); err != nil {
		logger.Error("Failed to update renewed certificate record",
			"cert_id", cert.ID,
			"error", err)
		return
	}

	logger.Info("Certificate renewed successfully",
		"cert_id", cert.ID,
		"domain", cert.Domain,
		"expires_at", certInfo.ExpiresAt)
}

// DeleteCertificate 删除证书
func (s *CertificateService) DeleteCertificate(id uint, userID uint) error {
	cert, err := s.GetCertificateByID(id, userID)
	if err != nil {
		return err
	}

	return s.certRepo.Delete(cert.ID)
}

// CheckExpiringCertificates 检查即将过期的证书
func (s *CertificateService) CheckExpiringCertificates() error {
	logger.Info("Checking expiring certificates")

	certs, err := s.certRepo.FindExpiring(30) // 30天内过期
	if err != nil {
		return fmt.Errorf("failed to find expiring certificates: %w", err)
	}

	logger.Info("Found expiring certificates", "count", len(certs))

	for _, cert := range certs {
		if cert.ShouldRenew() {
			logger.Info("Auto-renewing certificate",
				"cert_id", cert.ID,
				"domain", cert.Domain,
				"expires_at", cert.ExpiresAt)

			go s.renewCertificateAsync(cert)
		}
	}

	return nil
}

// GetChallengeType 获取当前挑战类型
func (s *CertificateService) GetChallengeType() string {
	return s.acmeService.GetChallengeType()
}

// GetDNSChallenge 获取DNS挑战信息
func (s *CertificateService) GetDNSChallenge(domain string) (*DNSChallenge, error) {
	return s.acmeService.GetDNSChallenge(domain)
}

// GetAllDNSChallenges 获取所有DNS挑战信息
func (s *CertificateService) GetAllDNSChallenges() (map[string]*DNSChallenge, error) {
	return s.acmeService.GetAllDNSChallenges()
}

// GetDNSInstructions 获取DNS配置说明
func (s *CertificateService) GetDNSInstructions(domain string) (string, error) {
	return s.acmeService.GetDNSInstructions(domain)
}

// VerifyDNSRecord 验证DNS记录
func (s *CertificateService) VerifyDNSRecord(domain string) (bool, error) {
	return s.acmeService.VerifyDNSRecord(domain)
}
