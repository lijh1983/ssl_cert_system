package services

import (
	"errors"
	"fmt"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/repositories"
	"ssl-cert-system/internal/utils/logger"
	"time"

	"github.com/google/uuid"
)

// ServerService 服务器服务
type ServerService struct {
	serverRepo repositories.ServerRepository
}

// NewServerService 创建服务器服务实例
func NewServerService() *ServerService {
	return &ServerService{
		serverRepo: repositories.NewServerRepository(database.GetDB()),
	}
}

// CreateServerRequest 创建服务器请求
type CreateServerRequest struct {
	Hostname         string `json:"hostname" binding:"required"`
	IPAddress        string `json:"ip_address"`
	OSType           string `json:"os_type"`
	OSVersion        string `json:"os_version"`
	WebServer        string `json:"web_server"`
	WebServerVersion string `json:"web_server_version"`
	AutoDeploy       bool   `json:"auto_deploy"`
}

// CreateServer 创建服务器
func (s *ServerService) CreateServer(userID uint, req *CreateServerRequest) (*models.Server, error) {
	logger.Info("Creating server",
		"user_id", userID,
		"hostname", req.Hostname,
		"ip_address", req.IPAddress)

	// 检查主机名是否已存在
	if _, err := s.serverRepo.FindByHostname(req.Hostname); err == nil {
		return nil, errors.New("server with this hostname already exists")
	}

	// 生成UUID
	serverUUID := uuid.New().String()

	// 创建服务器记录
	server := &models.Server{
		UserID:           userID,
		UUID:             serverUUID,
		Hostname:         req.Hostname,
		IPAddress:        req.IPAddress,
		OSType:           req.OSType,
		OSVersion:        req.OSVersion,
		WebServer:        req.WebServer,
		WebServerVersion: req.WebServerVersion,
		Status:           "offline",
		AutoDeploy:       req.AutoDeploy,
	}

	createdServer, err := s.serverRepo.Create(server)
	if err != nil {
		logger.Error("Failed to create server",
			"hostname", req.Hostname,
			"error", err)
		return nil, fmt.Errorf("failed to create server: %w", err)
	}

	logger.Info("Server created successfully",
		"server_id", createdServer.ID,
		"hostname", createdServer.Hostname,
		"uuid", createdServer.UUID)

	return createdServer, nil
}

// GetServers 获取服务器列表
func (s *ServerService) GetServers(userID uint) ([]*models.Server, error) {
	return s.serverRepo.FindByUserID(userID)
}

// GetServerByID 根据ID获取服务器
func (s *ServerService) GetServerByID(id uint, userID uint) (*models.Server, error) {
	server, err := s.serverRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// 检查权限
	if server.UserID != userID {
		return nil, errors.New("access denied")
	}

	return server, nil
}

// GetServerByUUID 根据UUID获取服务器
func (s *ServerService) GetServerByUUID(uuid string) (*models.Server, error) {
	return s.serverRepo.FindByUUID(uuid)
}

// UpdateServer 更新服务器
func (s *ServerService) UpdateServer(id uint, userID uint, updateData map[string]interface{}) (*models.Server, error) {
	// 验证权限
	server, err := s.GetServerByID(id, userID)
	if err != nil {
		return nil, err
	}

	// 检查主机名唯一性
	if hostname, exists := updateData["hostname"]; exists {
		if hostnameStr, ok := hostname.(string); ok && hostnameStr != server.Hostname {
			if _, err := s.serverRepo.FindByHostname(hostnameStr); err == nil {
				return nil, errors.New("hostname already exists")
			}
		}
	}

	// 更新服务器
	updatedServer, err := s.serverRepo.UpdateByID(id, updateData)
	if err != nil {
		return nil, fmt.Errorf("failed to update server: %w", err)
	}

	logger.Info("Server updated successfully",
		"server_id", id,
		"hostname", updatedServer.Hostname)

	return updatedServer, nil
}

// DeleteServer 删除服务器
func (s *ServerService) DeleteServer(id uint, userID uint) error {
	// 验证权限
	server, err := s.GetServerByID(id, userID)
	if err != nil {
		return err
	}

	// 检查是否有关联的证书
	certCount, err := s.serverRepo.CountCertificates(id)
	if err != nil {
		return fmt.Errorf("failed to check certificates: %w", err)
	}

	if certCount > 0 {
		return errors.New("cannot delete server with associated certificates")
	}

	err = s.serverRepo.Delete(id)
	if err != nil {
		return fmt.Errorf("failed to delete server: %w", err)
	}

	logger.Info("Server deleted successfully",
		"server_id", id,
		"hostname", server.Hostname)

	return nil
}

// HeartbeatRequest 心跳请求
type HeartbeatRequest struct {
	OSType           string `json:"os_type"`
	OSVersion        string `json:"os_version"`
	WebServer        string `json:"web_server"`
	WebServerVersion string `json:"web_server_version"`
	IPAddress        string `json:"ip_address"`
}

// UpdateHeartbeat 更新服务器心跳
func (s *ServerService) UpdateHeartbeat(id uint, req *HeartbeatRequest) error {
	server, err := s.serverRepo.FindByID(id)
	if err != nil {
		return fmt.Errorf("server not found: %w", err)
	}

	// 更新心跳时间和状态
	now := time.Now()
	updateData := map[string]interface{}{
		"last_heartbeat": &now,
		"status":         "online",
	}

	// 更新系统信息（如果提供）
	if req.OSType != "" {
		updateData["os_type"] = req.OSType
	}
	if req.OSVersion != "" {
		updateData["os_version"] = req.OSVersion
	}
	if req.WebServer != "" {
		updateData["web_server"] = req.WebServer
	}
	if req.WebServerVersion != "" {
		updateData["web_server_version"] = req.WebServerVersion
	}
	if req.IPAddress != "" {
		updateData["ip_address"] = req.IPAddress
	}

	_, err = s.serverRepo.UpdateByID(id, updateData)
	if err != nil {
		return fmt.Errorf("failed to update heartbeat: %w", err)
	}

	logger.Debug("Server heartbeat updated",
		"server_id", id,
		"hostname", server.Hostname)

	return nil
}

// CheckOfflineServers 检查离线服务器
func (s *ServerService) CheckOfflineServers() error {
	logger.Info("Checking offline servers")

	servers, err := s.serverRepo.FindAll()
	if err != nil {
		return fmt.Errorf("failed to get servers: %w", err)
	}

	offlineCount := 0
	for _, server := range servers {
		if !server.IsOnline() && server.Status != "offline" {
			// 更新状态为离线
			_, err := s.serverRepo.UpdateByID(server.ID, map[string]interface{}{
				"status": "offline",
			})
			if err != nil {
				logger.Error("Failed to update server status to offline",
					"server_id", server.ID,
					"hostname", server.Hostname,
					"error", err)
			} else {
				logger.Info("Server marked as offline",
					"server_id", server.ID,
					"hostname", server.Hostname)
				offlineCount++
			}
		}
	}

	logger.Info("Offline servers check completed",
		"total_servers", len(servers),
		"marked_offline", offlineCount)

	return nil
}

// GetServerStats 获取服务器统计信息
func (s *ServerService) GetServerStats() (map[string]interface{}, error) {
	totalCount, err := s.serverRepo.Count()
	if err != nil {
		return nil, err
	}

	onlineCount, err := s.serverRepo.CountByStatus("online")
	if err != nil {
		return nil, err
	}

	offlineCount, err := s.serverRepo.CountByStatus("offline")
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_servers":   totalCount,
		"online_servers":  onlineCount,
		"offline_servers": offlineCount,
	}, nil
}
