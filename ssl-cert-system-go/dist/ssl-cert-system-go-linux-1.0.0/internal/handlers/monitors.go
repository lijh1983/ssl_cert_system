package handlers

import (
	"net/http"
	"ssl-cert-system/internal/services"
	"ssl-cert-system/internal/utils/response"

	"github.com/gin-gonic/gin"
)

// GetDashboard 获取仪表板数据
func GetDashboard(c *gin.Context) {
	monitorService := services.NewMonitorService()

	dashboardStats, err := monitorService.GetDashboardStats()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get dashboard stats: "+err.Error())
		return
	}

	response.Data(c, http.StatusOK, dashboardStats)
}

// GetCertificateMonitor 获取证书监控数据
func GetCertificateMonitor(c *gin.Context) {
	userID := c.GetUint("user_id")
	isAdmin := c.GetBool("is_admin")

	monitorService := services.NewMonitorService()

	var monitorData []*services.CertificateMonitorData
	var err error

	if isAdmin {
		// 管理员可以查看所有证书
		monitorData, err = monitorService.GetCertificateMonitorData(nil)
	} else {
		// 普通用户只能查看自己的证书
		monitorData, err = monitorService.GetCertificateMonitorData(&userID)
	}

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get certificate monitor data: "+err.Error())
		return
	}

	response.Data(c, http.StatusOK, monitorData)
}

// GetServerMonitor 获取服务器监控数据
func GetServerMonitor(c *gin.Context) {
	userID := c.GetUint("user_id")
	isAdmin := c.GetBool("is_admin")

	monitorService := services.NewMonitorService()

	var monitorData []*services.ServerMonitorData
	var err error

	if isAdmin {
		// 管理员可以查看所有服务器
		monitorData, err = monitorService.GetServerMonitorData(nil)
	} else {
		// 普通用户只能查看自己的服务器
		monitorData, err = monitorService.GetServerMonitorData(&userID)
	}

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get server monitor data: "+err.Error())
		return
	}

	response.Data(c, http.StatusOK, monitorData)
}

// GetSystemHealth 获取系统健康状态
func GetSystemHealth(c *gin.Context) {
	monitorService := services.NewMonitorService()

	healthData, err := monitorService.GetSystemHealth()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get system health: "+err.Error())
		return
	}

	response.Data(c, http.StatusOK, healthData)
}

// GetAlerts 获取系统告警
func GetAlerts(c *gin.Context) {
	monitorService := services.NewMonitorService()

	alerts, err := monitorService.GetAlerts()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get alerts: "+err.Error())
		return
	}

	response.Data(c, http.StatusOK, alerts)
}
