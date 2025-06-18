package services

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"fmt"
	"os"
	"path/filepath"
	"ssl-cert-system/internal/config"
	"ssl-cert-system/internal/utils/logger"

	"github.com/go-acme/lego/v4/certificate"
	"github.com/go-acme/lego/v4/challenge/http01"
	"github.com/go-acme/lego/v4/lego"
	"github.com/go-acme/lego/v4/registration"
)

// ACMEService ACME服务
type ACMEService struct {
	client         *lego.Client
	config         *config.ACMEConfig
	storagePath    string
	dnsProvider    *ManualDNSProvider
	challengeType  string
}

// ACMEUser ACME用户实现
type ACMEUser struct {
	Email        string
	Registration *registration.Resource
	key          crypto.PrivateKey
}

// GetEmail 获取邮箱
func (u *ACMEUser) GetEmail() string {
	return u.Email
}

// GetRegistration 获取注册信息
func (u *ACMEUser) GetRegistration() *registration.Resource {
	return u.Registration
}

// GetPrivateKey 获取私钥
func (u *ACMEUser) GetPrivateKey() crypto.PrivateKey {
	return u.key
}

// CertificateResult 证书结果
type CertificateResult struct {
	Domain         string `json:"domain"`
	Certificate    []byte `json:"certificate"`
	PrivateKey     []byte `json:"private_key"`
	IssuerCert     []byte `json:"issuer_cert"`
	CertURL        string `json:"cert_url"`
	StableURL      string `json:"stable_url"`
	CertificatePath string `json:"certificate_path"`
	PrivateKeyPath  string `json:"private_key_path"`
	ChainPath       string `json:"chain_path"`
}

// NewACMEService 创建ACME服务实例
func NewACMEService() (*ACMEService, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// 确保存储目录存在
	storagePath := cfg.ACME.StoragePath
	if err := os.MkdirAll(storagePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	// 创建ACME用户
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate private key: %w", err)
	}

	user := &ACMEUser{
		Email: cfg.ACME.Email,
		key:   privateKey,
	}

	// 创建ACME配置
	acmeConfig := lego.NewConfig(user)
	acmeConfig.CADirURL = cfg.ACME.Server

	// 创建ACME客户端
	client, err := lego.NewClient(acmeConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create ACME client: %w", err)
	}

	// 根据配置设置挑战类型
	var dnsProvider *ManualDNSProvider
	challengeType := cfg.ACME.ChallengeType

	switch challengeType {
	case "dns-01":
		// 设置DNS-01手动验证
		dnsProvider = NewManualDNSProvider()
		err = client.Challenge.SetDNS01Provider(dnsProvider)
		if err != nil {
			return nil, fmt.Errorf("failed to set DNS-01 provider: %w", err)
		}
		logger.Info("DNS-01 challenge provider configured")

	case "http-01":
		// 设置HTTP-01挑战
		httpPort := cfg.ACME.HTTPPort
		if httpPort == "" {
			httpPort = "80"
		}
		err = client.Challenge.SetHTTP01Provider(http01.NewProviderServer("", httpPort))
		if err != nil {
			return nil, fmt.Errorf("failed to set HTTP-01 provider: %w", err)
		}
		logger.Info("HTTP-01 challenge provider configured", "port", httpPort)

	default:
		// 默认使用HTTP-01
		challengeType = "http-01"
		err = client.Challenge.SetHTTP01Provider(http01.NewProviderServer("", "80"))
		if err != nil {
			return nil, fmt.Errorf("failed to set HTTP-01 provider: %w", err)
		}
		logger.Info("HTTP-01 challenge provider configured (default)")
	}

	// 注册用户
	reg, err := client.Registration.Register(registration.RegisterOptions{TermsOfServiceAgreed: true})
	if err != nil {
		return nil, fmt.Errorf("failed to register user: %w", err)
	}
	user.Registration = reg

	logger.Info("ACME service initialized successfully",
		"server", cfg.ACME.Server,
		"email", cfg.ACME.Email,
		"storage", storagePath,
		"challenge_type", challengeType)

	return &ACMEService{
		client:        client,
		config:        &cfg.ACME,
		storagePath:   storagePath,
		dnsProvider:   dnsProvider,
		challengeType: challengeType,
	}, nil
}

// IssueCertificate 申请证书
func (s *ACMEService) IssueCertificate(domain string, altDomains []string) (*CertificateResult, error) {
	logger.Info("Starting certificate issuance",
		"domain", domain,
		"alt_domains", altDomains)

	// 构建域名列表
	domains := append([]string{domain}, altDomains...)

	// 申请证书
	request := certificate.ObtainRequest{
		Domains: domains,
		Bundle:  true,
	}

	certificates, err := s.client.Certificate.Obtain(request)
	if err != nil {
		logger.Error("Failed to obtain certificate",
			"domain", domain,
			"error", err)
		return nil, fmt.Errorf("failed to obtain certificate: %w", err)
	}

	// 保存证书文件
	result, err := s.saveCertificateFiles(domain, certificates)
	if err != nil {
		logger.Error("Failed to save certificate files",
			"domain", domain,
			"error", err)
		return nil, fmt.Errorf("failed to save certificate files: %w", err)
	}

	logger.Info("Certificate issued successfully",
		"domain", domain,
		"cert_url", certificates.CertURL,
		"stable_url", certificates.CertStableURL)

	return result, nil
}

// RenewCertificate 续期证书
func (s *ACMEService) RenewCertificate(domain string, certURL string) (*CertificateResult, error) {
	logger.Info("Starting certificate renewal",
		"domain", domain,
		"cert_url", certURL)

	// 加载现有证书
	certPath := filepath.Join(s.storagePath, domain, "cert.pem")
	keyPath := filepath.Join(s.storagePath, domain, "key.pem")

	_, err := os.ReadFile(certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate file: %w", err)
	}

	_, err = os.ReadFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key file: %w", err)
	}

	// 续期证书 - 使用Obtain方法重新申请
	// 解析域名信息
	// TODO: 从证书中解析域名信息
	domains := []string{domain}

	request := certificate.ObtainRequest{
		Domains: domains,
		Bundle:  true,
	}

	certificates, err := s.client.Certificate.Obtain(request)
	if err != nil {
		logger.Error("Failed to renew certificate",
			"domain", domain,
			"error", err)
		return nil, fmt.Errorf("failed to renew certificate: %w", err)
	}

	// 保存续期后的证书文件
	result, err := s.saveCertificateFiles(domain, certificates)
	if err != nil {
		return nil, fmt.Errorf("failed to save renewed certificate files: %w", err)
	}

	logger.Info("Certificate renewed successfully",
		"domain", domain,
		"cert_url", certificates.CertURL)

	return result, nil
}

// saveCertificateFiles 保存证书文件
func (s *ACMEService) saveCertificateFiles(domain string, certificates *certificate.Resource) (*CertificateResult, error) {
	// 创建域名目录
	domainDir := filepath.Join(s.storagePath, domain)
	if err := os.MkdirAll(domainDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create domain directory: %w", err)
	}

	// 文件路径
	certPath := filepath.Join(domainDir, "cert.pem")
	keyPath := filepath.Join(domainDir, "key.pem")
	chainPath := filepath.Join(domainDir, "chain.pem")

	// 保存证书文件
	if err := os.WriteFile(certPath, certificates.Certificate, 0644); err != nil {
		return nil, fmt.Errorf("failed to write certificate file: %w", err)
	}

	// 保存私钥文件
	if err := os.WriteFile(keyPath, certificates.PrivateKey, 0600); err != nil {
		return nil, fmt.Errorf("failed to write private key file: %w", err)
	}

	// 保存证书链文件
	if err := os.WriteFile(chainPath, certificates.IssuerCertificate, 0644); err != nil {
		return nil, fmt.Errorf("failed to write chain file: %w", err)
	}

	return &CertificateResult{
		Domain:          domain,
		Certificate:     certificates.Certificate,
		PrivateKey:      certificates.PrivateKey,
		IssuerCert:      certificates.IssuerCertificate,
		CertURL:         certificates.CertURL,
		StableURL:       certificates.CertStableURL,
		CertificatePath: certPath,
		PrivateKeyPath:  keyPath,
		ChainPath:       chainPath,
	}, nil
}

// GetChallengeType 获取当前挑战类型
func (s *ACMEService) GetChallengeType() string {
	return s.challengeType
}

// GetDNSChallenge 获取DNS挑战信息 (仅DNS-01验证)
func (s *ACMEService) GetDNSChallenge(domain string) (*DNSChallenge, error) {
	if s.challengeType != "dns-01" {
		return nil, fmt.Errorf("DNS challenges are only available for dns-01 challenge type")
	}

	if s.dnsProvider == nil {
		return nil, fmt.Errorf("DNS provider not initialized")
	}

	return s.dnsProvider.GetChallenge(domain)
}

// GetAllDNSChallenges 获取所有DNS挑战信息 (仅DNS-01验证)
func (s *ACMEService) GetAllDNSChallenges() (map[string]*DNSChallenge, error) {
	if s.challengeType != "dns-01" {
		return nil, fmt.Errorf("DNS challenges are only available for dns-01 challenge type")
	}

	if s.dnsProvider == nil {
		return nil, fmt.Errorf("DNS provider not initialized")
	}

	return s.dnsProvider.GetAllChallenges(), nil
}

// GetDNSInstructions 获取DNS配置说明 (仅DNS-01验证)
func (s *ACMEService) GetDNSInstructions(domain string) (string, error) {
	if s.challengeType != "dns-01" {
		return "", fmt.Errorf("DNS instructions are only available for dns-01 challenge type")
	}

	if s.dnsProvider == nil {
		return "", fmt.Errorf("DNS provider not initialized")
	}

	return s.dnsProvider.GetDNSInstructions(domain)
}

// VerifyDNSRecord 验证DNS记录 (仅DNS-01验证)
func (s *ACMEService) VerifyDNSRecord(domain string) (bool, error) {
	if s.challengeType != "dns-01" {
		return false, fmt.Errorf("DNS verification is only available for dns-01 challenge type")
	}

	if s.dnsProvider == nil {
		return false, fmt.Errorf("DNS provider not initialized")
	}

	return s.dnsProvider.VerifyDNSRecord(domain)
}
