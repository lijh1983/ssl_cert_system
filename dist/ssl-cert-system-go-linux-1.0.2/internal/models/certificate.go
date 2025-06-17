package models

import (
	"time"

	"gorm.io/gorm"
)

// Certificate 证书模型
type Certificate struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	UserID           uint           `gorm:"not null;index" json:"user_id"`
	ServerID         *uint          `gorm:"index" json:"server_id,omitempty"`
	Domain           string         `gorm:"size:255;not null" json:"domain"`
	AltDomains       string         `gorm:"type:text" json:"alt_domains"` // JSON数组字符串
	Status           string         `gorm:"size:20;default:'pending'" json:"status"` // pending, issued, expired, revoked, error
	CertificatePath  string         `gorm:"size:500" json:"certificate_path"`
	PrivateKeyPath   string         `gorm:"size:500" json:"private_key_path"`
	ChainPath        string         `gorm:"size:500" json:"chain_path"`
	IssuedAt         *time.Time     `json:"issued_at"`
	ExpiresAt        *time.Time     `json:"expires_at"`
	AutoRenew        bool           `gorm:"default:true" json:"auto_renew"`
	RenewDays        int            `gorm:"default:30" json:"renew_days"`
	LastRenewAt      *time.Time     `json:"last_renew_at"`
	NextRenewAt      *time.Time     `json:"next_renew_at"`
	RenewAttempts    int            `gorm:"default:0" json:"renew_attempts"`
	LastError        string         `gorm:"type:text" json:"last_error"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// 关联关系
	User   User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Server *Server `gorm:"foreignKey:ServerID" json:"server,omitempty"`
}

// TableName 指定表名
func (Certificate) TableName() string {
	return "certificates"
}

// IsExpired 检查证书是否已过期
func (c *Certificate) IsExpired() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*c.ExpiresAt)
}

// IsExpiringSoon 检查证书是否即将过期
func (c *Certificate) IsExpiringSoon() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Until(*c.ExpiresAt) <= time.Duration(c.RenewDays)*24*time.Hour
}

// DaysUntilExpiry 获取距离过期的天数
func (c *Certificate) DaysUntilExpiry() int {
	if c.ExpiresAt == nil {
		return -1
	}
	duration := time.Until(*c.ExpiresAt)
	return int(duration.Hours() / 24)
}

// ShouldRenew 检查是否应该续期
func (c *Certificate) ShouldRenew() bool {
	return c.AutoRenew && c.IsExpiringSoon() && c.Status == "issued"
}
