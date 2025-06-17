package models

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Email     string         `gorm:"uniqueIndex;size:100;not null" json:"email"`
	Password  string         `gorm:"size:255;not null" json:"-"`
	IsAdmin   bool           `gorm:"default:false" json:"is_admin"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	APIKey    *string        `gorm:"uniqueIndex;size:255" json:"api_key,omitempty"`
	LastLogin *time.Time     `json:"last_login,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// 关联关系
	Servers      []Server      `gorm:"foreignKey:UserID" json:"servers,omitempty"`
	Certificates []Certificate `gorm:"foreignKey:UserID" json:"certificates,omitempty"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

// BeforeCreate 创建前钩子
func (u *User) BeforeCreate(tx *gorm.DB) error {
	// 这里可以添加创建前的逻辑，比如密码加密
	return nil
}

// BeforeUpdate 更新前钩子
func (u *User) BeforeUpdate(tx *gorm.DB) error {
	// 这里可以添加更新前的逻辑
	return nil
}
