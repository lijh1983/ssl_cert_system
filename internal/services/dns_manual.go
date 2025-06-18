package services

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net"
	"ssl-cert-system/internal/utils/logger"
	"strings"
	"time"
)

// ManualDNSProvider 手动DNS验证提供商
type ManualDNSProvider struct {
	challenges map[string]*DNSChallenge
}

// DNSChallenge DNS挑战信息
type DNSChallenge struct {
	Domain    string    `json:"domain"`
	Token     string    `json:"token"`
	KeyAuth   string    `json:"key_auth"`
	Value     string    `json:"value"`
	FQDN      string    `json:"fqdn"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"` // pending, verified, failed
}

// NewManualDNSProvider 创建手动DNS验证提供商
func NewManualDNSProvider() *ManualDNSProvider {
	return &ManualDNSProvider{
		challenges: make(map[string]*DNSChallenge),
	}
}

// Present 展示DNS挑战
func (p *ManualDNSProvider) Present(domain, token, keyAuth string) error {
	logger.Info("DNS-01 challenge presented",
		"domain", domain,
		"token", token[:10]+"...")

	// 计算TXT记录值 (ACME DNS-01 challenge)
	// 使用SHA256哈希keyAuth并进行base64编码
	hash := sha256.Sum256([]byte(keyAuth))
	value := base64.RawURLEncoding.EncodeToString(hash[:])
	fqdn := "_acme-challenge." + domain

	// 存储挑战信息
	challengeInfo := &DNSChallenge{
		Domain:    domain,
		Token:     token,
		KeyAuth:   keyAuth,
		Value:     value,
		FQDN:      fqdn,
		CreatedAt: time.Now(),
		Status:    "pending",
	}

	p.challenges[domain] = challengeInfo

	logger.Info("DNS challenge created",
		"domain", domain,
		"fqdn", fqdn,
		"value", value)

	// 这里不需要实际创建DNS记录，而是等待用户手动添加
	return nil
}

// CleanUp 清理DNS挑战
func (p *ManualDNSProvider) CleanUp(domain, token, keyAuth string) error {
	logger.Info("DNS-01 challenge cleanup",
		"domain", domain,
		"token", token[:10]+"...")

	// 从内存中移除挑战信息
	delete(p.challenges, domain)

	logger.Info("DNS challenge cleaned up", "domain", domain)
	return nil
}

// GetChallenge 获取域名的DNS挑战信息
func (p *ManualDNSProvider) GetChallenge(domain string) (*DNSChallenge, error) {
	challenge, exists := p.challenges[domain]
	if !exists {
		return nil, fmt.Errorf("no DNS challenge found for domain: %s", domain)
	}
	return challenge, nil
}

// GetAllChallenges 获取所有DNS挑战信息
func (p *ManualDNSProvider) GetAllChallenges() map[string]*DNSChallenge {
	return p.challenges
}

// MarkChallengeVerified 标记挑战为已验证
func (p *ManualDNSProvider) MarkChallengeVerified(domain string) error {
	challenge, exists := p.challenges[domain]
	if !exists {
		return fmt.Errorf("no DNS challenge found for domain: %s", domain)
	}
	
	challenge.Status = "verified"
	logger.Info("DNS challenge marked as verified", "domain", domain)
	return nil
}

// MarkChallengeFailed 标记挑战为失败
func (p *ManualDNSProvider) MarkChallengeFailed(domain string) error {
	challenge, exists := p.challenges[domain]
	if !exists {
		return fmt.Errorf("no DNS challenge found for domain: %s", domain)
	}
	
	challenge.Status = "failed"
	logger.Info("DNS challenge marked as failed", "domain", domain)
	return nil
}

// Timeout 返回DNS传播超时时间
func (p *ManualDNSProvider) Timeout() (timeout, interval time.Duration) {
	// DNS传播通常需要几分钟到几小时
	// 这里设置较长的超时时间，因为是手动验证
	return 30 * time.Minute, 30 * time.Second
}

// Sequential 返回是否需要顺序处理挑战
func (p *ManualDNSProvider) Sequential() bool {
	// 手动DNS验证可以并行处理
	return false
}

// GetDNSInstructions 获取DNS配置说明
func (p *ManualDNSProvider) GetDNSInstructions(domain string) (string, error) {
	challenge, exists := p.challenges[domain]
	if !exists {
		return "", fmt.Errorf("no DNS challenge found for domain: %s", domain)
	}

	instructions := fmt.Sprintf(`
请在您的DNS管理面板中添加以下TXT记录：

记录类型: TXT
记录名称: %s
记录值: %s

配置示例：
1. 登录您的DNS服务商管理面板
2. 找到域名 %s 的DNS设置
3. 添加新的TXT记录：
   - 主机记录/名称: %s
   - 记录类型: TXT
   - 记录值: %s
   - TTL: 600 (或默认值)

注意事项：
- DNS记录生效可能需要几分钟到几小时
- 请确保记录值完全正确，包括引号
- 配置完成后，点击"验证DNS记录"按钮进行验证
`, challenge.FQDN, challenge.Value, domain, 
   challenge.FQDN, challenge.Value)

	return instructions, nil
}

// VerifyDNSRecord 验证DNS记录是否已正确配置
func (p *ManualDNSProvider) VerifyDNSRecord(domain string) (bool, error) {
	challenge, exists := p.challenges[domain]
	if !exists {
		return false, fmt.Errorf("no DNS challenge found for domain: %s", domain)
	}

	// 使用lego的DNS验证功能
	verified, err := challenge.DNS01CheckRecord(challenge.FQDN, challenge.Value)
	if err != nil {
		logger.Error("DNS record verification failed",
			"domain", domain,
			"fqdn", challenge.FQDN,
			"error", err)
		return false, fmt.Errorf("DNS verification failed: %w", err)
	}

	if verified {
		p.MarkChallengeVerified(domain)
		logger.Info("DNS record verified successfully",
			"domain", domain,
			"fqdn", challenge.FQDN)
	} else {
		logger.Warn("DNS record not found or incorrect",
			"domain", domain,
			"fqdn", challenge.FQDN,
			"expected_value", challenge.Value)
	}

	return verified, nil
}

// DNS01CheckRecord 检查DNS TXT记录
func (c *DNSChallenge) DNS01CheckRecord(fqdn, value string) (bool, error) {
	// 查询DNS TXT记录
	txtRecords, err := net.LookupTXT(fqdn)
	if err != nil {
		return false, fmt.Errorf("DNS lookup failed: %w", err)
	}

	// 检查是否包含期望的值
	for _, record := range txtRecords {
		if strings.TrimSpace(record) == strings.TrimSpace(value) {
			return true, nil
		}
	}

	return false, fmt.Errorf("expected TXT record value not found")
}
