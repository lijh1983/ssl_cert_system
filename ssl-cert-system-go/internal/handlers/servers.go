package handlers

import (
	"net/http"
	"ssl-cert-system/internal/services"
	"ssl-cert-system/internal/utils/response"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetServers 获取服务器列表
func GetServers(c *gin.Context) {
	userID := c.GetUint("user_id")

	serverService := services.NewServerService()
	servers, err := serverService.GetServers(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Data(c, http.StatusOK, servers)
}

// CreateServer 创建服务器
func CreateServer(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req services.CreateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	serverService := services.NewServerService()
	server, err := serverService.CreateServer(userID, &req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "Server created successfully", server)
}

// GetServer 获取单个服务器
func GetServer(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid server ID")
		return
	}

	serverService := services.NewServerService()
	server, err := serverService.GetServerByID(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Server not found")
		return
	}

	response.Data(c, http.StatusOK, server)
}

// UpdateServer 更新服务器
func UpdateServer(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid server ID")
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	serverService := services.NewServerService()
	server, err := serverService.UpdateServer(uint(id), userID, updateData)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Server updated successfully", server)
}

// DeleteServer 删除服务器
func DeleteServer(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid server ID")
		return
	}

	serverService := services.NewServerService()
	err = serverService.DeleteServer(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Server deleted successfully", nil)
}

// ServerHeartbeat 服务器心跳
func ServerHeartbeat(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid server ID")
		return
	}

	var req services.HeartbeatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	serverService := services.NewServerService()
	err = serverService.UpdateHeartbeat(uint(id), &req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Heartbeat received", nil)
}
