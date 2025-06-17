package models

import (
	"time"

	"gorm.io/gorm"
)

// Server 服务器模型
type Server struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	UserID           uint           `gorm:"not null;index" json:"user_id"`
	UUID             string         `gorm:"uniqueIndex;size:36;not null" json:"uuid"`
	Hostname         string         `gorm:"size:255;not null" json:"hostname"`
	IPAddress        string         `gorm:"size:45" json:"ip_address"`
	OSType           string         `gorm:"size:50" json:"os_type"`
	OSVersion        string         `gorm:"size:100" json:"os_version"`
	WebServer        string         `gorm:"size:50" json:"web_server"`
	WebServerVersion string         `gorm:"size:50" json:"web_server_version"`
	Status           string         `gorm:"size:20;default:'offline'" json:"status"` // online, offline, error
	AutoDeploy       bool           `gorm:"default:false" json:"auto_deploy"`
	LastHeartbeat    *time.Time     `json:"last_heartbeat"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// 关联关系
	User         User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Certificates []Certificate `gorm:"foreignKey:ServerID" json:"certificates,omitempty"`
}

// TableName 指定表名
func (Server) TableName() string {
	return "servers"
}

// IsOnline 检查服务器是否在线
func (s *Server) IsOnline() bool {
	if s.LastHeartbeat == nil {
		return false
	}
	// 如果超过5分钟没有心跳，认为离线
	return time.Since(*s.LastHeartbeat) < 5*time.Minute
}

// UpdateHeartbeat 更新心跳时间
func (s *Server) UpdateHeartbeat() {
	now := time.Now()
	s.LastHeartbeat = &now
	s.Status = "online"
}
