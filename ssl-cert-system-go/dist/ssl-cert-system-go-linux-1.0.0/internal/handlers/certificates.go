package handlers

import (
	"fmt"
	"net/http"
	"ssl-cert-system/internal/services"
	"ssl-cert-system/internal/utils/response"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetCertificates 获取证书列表
func GetCertificates(c *gin.Context) {
	userID := c.GetUint("user_id")

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	certificates, err := certService.GetCertificates(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Data(c, http.StatusOK, certificates)
}

// CreateCertificate 创建证书
func CreateCertificate(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req services.CreateCertificateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	certificate, err := certService.CreateCertificate(userID, &req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "Certificate creation started", certificate)
}

// GetCertificate 获取单个证书
func GetCertificate(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	certificate, err := certService.GetCertificateByID(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Certificate not found")
		return
	}

	response.Data(c, http.StatusOK, certificate)
}

// UpdateCertificate 更新证书
func UpdateCertificate(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	// 验证用户权限
	_, err = certService.GetCertificateByID(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Certificate not found")
		return
	}

	// TODO: 实现证书更新逻辑
	response.Success(c, http.StatusOK, "Certificate updated successfully", nil)
}

// DeleteCertificate 删除证书
func DeleteCertificate(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	err = certService.DeleteCertificate(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Certificate deleted successfully", nil)
}

// VerifyDomain 验证域名
func VerifyDomain(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	// 验证用户权限
	_, err = certService.GetCertificateByID(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Certificate not found")
		return
	}

	// TODO: 实现域名验证逻辑
	response.Success(c, http.StatusOK, "Domain verification started", nil)
}

// RenewCertificate 续期证书
func RenewCertificate(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	err = certService.RenewCertificate(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Certificate renewal started", nil)
}

// DownloadCertificate 下载证书
func DownloadCertificate(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	certificate, err := certService.GetCertificateByID(uint(id), userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Certificate not found")
		return
	}

	if certificate.Status != "issued" {
		response.Error(c, http.StatusBadRequest, "Certificate is not issued yet")
		return
	}

	// 检查是否请求ZIP格式
	format := c.Query("format")
	if format == "zip" {
		// 创建ZIP文件并下载
		fileService, err := services.NewFileService()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Failed to initialize file service")
			return
		}

		zipPath, err := fileService.CreateCertificateZip(certificate.Domain)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Failed to create certificate ZIP: "+err.Error())
			return
		}

		// 设置下载头
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s-certificates.zip", certificate.Domain))
		c.Header("Content-Type", "application/zip")
		c.File(zipPath)
		return
	}

	// 返回证书文件信息（默认行为）
	fileService, err := services.NewFileService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize file service")
		return
	}

	files, err := fileService.GetCertificateFiles(certificate.Domain)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to get certificate files: "+err.Error())
		return
	}

	response.Data(c, http.StatusOK, files)
}
