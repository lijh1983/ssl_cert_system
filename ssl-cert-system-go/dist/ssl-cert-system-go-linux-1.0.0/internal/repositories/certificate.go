package repositories

import (
	"ssl-cert-system/internal/models"
	"time"

	"gorm.io/gorm"
)

// CertificateRepository 证书仓库接口
type CertificateRepository interface {
	Create(cert *models.Certificate) (*models.Certificate, error)
	FindByID(id uint) (*models.Certificate, error)
	FindByDomain(domain string) (*models.Certificate, error)
	FindByUserID(userID uint) ([]*models.Certificate, error)
	FindAll() ([]*models.Certificate, error)
	FindExpiring(days int) ([]*models.Certificate, error)
	FindExpired() ([]*models.Certificate, error)
	Update(cert *models.Certificate) (*models.Certificate, error)
	UpdateByID(id uint, updates map[string]interface{}) error
	Delete(id uint) error
	Count() (int64, error)
	CountByStatus(status string) (int64, error)
	CountExpiring(days int) (int64, error)
	CountExpired() (int64, error)
}

// certificateRepository 证书仓库实现
type certificateRepository struct {
	db *gorm.DB
}

// NewCertificateRepository 创建证书仓库实例
func NewCertificateRepository(db *gorm.DB) CertificateRepository {
	return &certificateRepository{db: db}
}

// Create 创建证书
func (r *certificateRepository) Create(cert *models.Certificate) (*models.Certificate, error) {
	if err := r.db.Create(cert).Error; err != nil {
		return nil, err
	}
	return cert, nil
}

// FindByID 根据ID查找证书
func (r *certificateRepository) FindByID(id uint) (*models.Certificate, error) {
	var cert models.Certificate
	if err := r.db.Preload("User").Preload("Server").First(&cert, id).Error; err != nil {
		return nil, err
	}
	return &cert, nil
}

// FindByDomain 根据域名查找证书
func (r *certificateRepository) FindByDomain(domain string) (*models.Certificate, error) {
	var cert models.Certificate
	if err := r.db.Where("domain = ?", domain).First(&cert).Error; err != nil {
		return nil, err
	}
	return &cert, nil
}

// FindByUserID 根据用户ID查找证书
func (r *certificateRepository) FindByUserID(userID uint) ([]*models.Certificate, error) {
	var certs []*models.Certificate
	if err := r.db.Where("user_id = ?", userID).
		Preload("Server").
		Order("created_at DESC").
		Find(&certs).Error; err != nil {
		return nil, err
	}
	return certs, nil
}

// FindAll 查找所有证书
func (r *certificateRepository) FindAll() ([]*models.Certificate, error) {
	var certs []*models.Certificate
	if err := r.db.Preload("User").Preload("Server").
		Order("created_at DESC").
		Find(&certs).Error; err != nil {
		return nil, err
	}
	return certs, nil
}

// FindExpiring 查找即将过期的证书
func (r *certificateRepository) FindExpiring(days int) ([]*models.Certificate, error) {
	var certs []*models.Certificate
	expiryDate := time.Now().AddDate(0, 0, days)
	
	if err := r.db.Where("status = ? AND expires_at <= ? AND expires_at > ?", 
		"issued", expiryDate, time.Now()).
		Find(&certs).Error; err != nil {
		return nil, err
	}
	return certs, nil
}

// FindExpired 查找已过期的证书
func (r *certificateRepository) FindExpired() ([]*models.Certificate, error) {
	var certs []*models.Certificate
	if err := r.db.Where("expires_at < ?", time.Now()).
		Find(&certs).Error; err != nil {
		return nil, err
	}
	return certs, nil
}

// Update 更新证书
func (r *certificateRepository) Update(cert *models.Certificate) (*models.Certificate, error) {
	if err := r.db.Save(cert).Error; err != nil {
		return nil, err
	}
	return cert, nil
}

// UpdateByID 根据ID更新证书
func (r *certificateRepository) UpdateByID(id uint, updates map[string]interface{}) error {
	return r.db.Model(&models.Certificate{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除证书（软删除）
func (r *certificateRepository) Delete(id uint) error {
	return r.db.Delete(&models.Certificate{}, id).Error
}

// Count 统计证书总数
func (r *certificateRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&models.Certificate{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CountByStatus 根据状态统计证书数量
func (r *certificateRepository) CountByStatus(status string) (int64, error) {
	var count int64
	if err := r.db.Model(&models.Certificate{}).
		Where("status = ?", status).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CountExpiring 统计即将过期的证书数量
func (r *certificateRepository) CountExpiring(days int) (int64, error) {
	var count int64
	expiryDate := time.Now().AddDate(0, 0, days)
	
	if err := r.db.Model(&models.Certificate{}).
		Where("status = ? AND expires_at <= ? AND expires_at > ?", 
			"issued", expiryDate, time.Now()).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CountExpired 统计已过期的证书数量
func (r *certificateRepository) CountExpired() (int64, error) {
	var count int64
	if err := r.db.Model(&models.Certificate{}).
		Where("expires_at < ?", time.Now()).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
