package repositories

import (
	"ssl-cert-system/internal/models"

	"gorm.io/gorm"
)

// ServerRepository 服务器仓库接口
type ServerRepository interface {
	Create(server *models.Server) (*models.Server, error)
	FindByID(id uint) (*models.Server, error)
	FindByUUID(uuid string) (*models.Server, error)
	FindByHostname(hostname string) (*models.Server, error)
	FindByUserID(userID uint) ([]*models.Server, error)
	FindAll() ([]*models.Server, error)
	Update(server *models.Server) (*models.Server, error)
	UpdateByID(id uint, updates map[string]interface{}) (*models.Server, error)
	Delete(id uint) error
	Count() (int64, error)
	CountByStatus(status string) (int64, error)
	CountCertificates(serverID uint) (int64, error)
}

// serverRepository 服务器仓库实现
type serverRepository struct {
	db *gorm.DB
}

// NewServerRepository 创建服务器仓库实例
func NewServerRepository(db *gorm.DB) ServerRepository {
	return &serverRepository{db: db}
}

// Create 创建服务器
func (r *serverRepository) Create(server *models.Server) (*models.Server, error) {
	if err := r.db.Create(server).Error; err != nil {
		return nil, err
	}
	return server, nil
}

// FindByID 根据ID查找服务器
func (r *serverRepository) FindByID(id uint) (*models.Server, error) {
	var server models.Server
	if err := r.db.Preload("User").Preload("Certificates").First(&server, id).Error; err != nil {
		return nil, err
	}
	return &server, nil
}

// FindByUUID 根据UUID查找服务器
func (r *serverRepository) FindByUUID(uuid string) (*models.Server, error) {
	var server models.Server
	if err := r.db.Where("uuid = ?", uuid).First(&server).Error; err != nil {
		return nil, err
	}
	return &server, nil
}

// FindByHostname 根据主机名查找服务器
func (r *serverRepository) FindByHostname(hostname string) (*models.Server, error) {
	var server models.Server
	if err := r.db.Where("hostname = ?", hostname).First(&server).Error; err != nil {
		return nil, err
	}
	return &server, nil
}

// FindByUserID 根据用户ID查找服务器
func (r *serverRepository) FindByUserID(userID uint) ([]*models.Server, error) {
	var servers []*models.Server
	if err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&servers).Error; err != nil {
		return nil, err
	}
	return servers, nil
}

// FindAll 查找所有服务器
func (r *serverRepository) FindAll() ([]*models.Server, error) {
	var servers []*models.Server
	if err := r.db.Preload("User").
		Order("created_at DESC").
		Find(&servers).Error; err != nil {
		return nil, err
	}
	return servers, nil
}

// Update 更新服务器
func (r *serverRepository) Update(server *models.Server) (*models.Server, error) {
	if err := r.db.Save(server).Error; err != nil {
		return nil, err
	}
	return server, nil
}

// UpdateByID 根据ID更新服务器
func (r *serverRepository) UpdateByID(id uint, updates map[string]interface{}) (*models.Server, error) {
	var server models.Server
	if err := r.db.Model(&server).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	
	// 重新查询更新后的服务器
	if err := r.db.First(&server, id).Error; err != nil {
		return nil, err
	}
	
	return &server, nil
}

// Delete 删除服务器（软删除）
func (r *serverRepository) Delete(id uint) error {
	return r.db.Delete(&models.Server{}, id).Error
}

// Count 统计服务器总数
func (r *serverRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&models.Server{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CountByStatus 根据状态统计服务器数量
func (r *serverRepository) CountByStatus(status string) (int64, error) {
	var count int64
	if err := r.db.Model(&models.Server{}).
		Where("status = ?", status).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CountCertificates 统计服务器关联的证书数量
func (r *serverRepository) CountCertificates(serverID uint) (int64, error) {
	var count int64
	if err := r.db.Model(&models.Certificate{}).
		Where("server_id = ?", serverID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
