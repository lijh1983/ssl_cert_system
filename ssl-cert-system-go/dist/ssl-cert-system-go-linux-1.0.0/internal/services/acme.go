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
	client      *lego.Client
	config      *config.ACMEConfig
	storagePath string
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

	// 设置HTTP-01挑战
	err = client.Challenge.SetHTTP01Provider(http01.NewProviderServer("", "80"))
	if err != nil {
		return nil, fmt.Errorf("failed to set HTTP-01 provider: %w", err)
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
		"storage", storagePath)

	return &ACMEService{
		client:      client,
		config:      &cfg.ACME,
		storagePath: storagePath,
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
