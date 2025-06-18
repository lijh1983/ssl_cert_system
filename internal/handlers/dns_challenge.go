package handlers

import (
	"net/http"
	"ssl-cert-system/internal/services"
	"ssl-cert-system/internal/utils/response"

	"github.com/gin-gonic/gin"
)

// GetChallengeType 获取当前挑战类型
func GetChallengeType(c *gin.Context) {
	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	challengeType := certService.GetChallengeType()
	
	response.Success(c, http.StatusOK, "Challenge type retrieved", gin.H{
		"challenge_type": challengeType,
	})
}

// GetDNSChallenge 获取指定域名的DNS挑战信息
func GetDNSChallenge(c *gin.Context) {
	domain := c.Param("domain")
	if domain == "" {
		response.Error(c, http.StatusBadRequest, "Domain parameter is required")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	challenge, err := certService.GetDNSChallenge(domain)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "DNS challenge retrieved", challenge)
}

// GetAllDNSChallenges 获取所有DNS挑战信息
func GetAllDNSChallenges(c *gin.Context) {
	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	challenges, err := certService.GetAllDNSChallenges()
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "DNS challenges retrieved", challenges)
}

// GetDNSInstructions 获取DNS配置说明
func GetDNSInstructions(c *gin.Context) {
	domain := c.Param("domain")
	if domain == "" {
		response.Error(c, http.StatusBadRequest, "Domain parameter is required")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	instructions, err := certService.GetDNSInstructions(domain)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "DNS instructions retrieved", gin.H{
		"domain":       domain,
		"instructions": instructions,
	})
}

// VerifyDNSRecord 验证DNS记录
func VerifyDNSRecord(c *gin.Context) {
	domain := c.Param("domain")
	if domain == "" {
		response.Error(c, http.StatusBadRequest, "Domain parameter is required")
		return
	}

	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	verified, err := certService.VerifyDNSRecord(domain)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if verified {
		response.Success(c, http.StatusOK, "DNS record verified successfully", gin.H{
			"domain":   domain,
			"verified": true,
		})
	} else {
		response.Error(c, http.StatusBadRequest, "DNS record verification failed - please check your DNS configuration")
	}
}

// DNSChallengeStatus DNS挑战状态响应
type DNSChallengeStatus struct {
	ChallengeType string                           `json:"challenge_type"`
	Challenges    map[string]*services.DNSChallenge `json:"challenges,omitempty"`
	Message       string                           `json:"message"`
}

// GetDNSChallengeStatus 获取DNS挑战状态
func GetDNSChallengeStatus(c *gin.Context) {
	certService, err := services.NewCertificateService()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize certificate service")
		return
	}

	challengeType := certService.GetChallengeType()
	
	status := &DNSChallengeStatus{
		ChallengeType: challengeType,
	}

	if challengeType == "dns-01" {
		challenges, err := certService.GetAllDNSChallenges()
		if err != nil {
			status.Message = "Failed to retrieve DNS challenges: " + err.Error()
		} else {
			status.Challenges = challenges
			if len(challenges) == 0 {
				status.Message = "No active DNS challenges found"
			} else {
				status.Message = "DNS challenges retrieved successfully"
			}
		}
	} else {
		status.Message = "DNS challenges are not available for " + challengeType + " challenge type"
	}

	response.Success(c, http.StatusOK, "DNS challenge status retrieved", status)
}
