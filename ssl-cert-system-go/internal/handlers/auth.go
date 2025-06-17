package handlers

import (
	"net/http"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/services"
	"ssl-cert-system/internal/utils/response"

	"github.com/gin-gonic/gin"
)

// LoginRequest 登录请求结构
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest 注册请求结构
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginResponse 登录响应结构
type LoginResponse struct {
	Token string      `json:"token"`
	User  *models.User `json:"user"`
}

// Login 用户登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	authService := services.NewAuthService()
	loginResp, err := authService.Login(req.Username, req.Password)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, err.Error())
		return
	}

	response.Data(c, http.StatusOK, loginResp)
}

// Register 用户注册
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	authService := services.NewAuthService()
	user, err := authService.Register(req.Username, req.Email, req.Password)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "User registered successfully", user)
}

// RefreshToken 刷新令牌
func RefreshToken(c *gin.Context) {
	// 从当前token中获取用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Invalid token")
		return
	}

	username, _ := c.Get("username")
	isAdmin, _ := c.Get("is_admin")

	authService := services.NewAuthService()
	token, err := authService.GenerateToken(userID.(uint), username.(string), isAdmin.(bool))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	response.Data(c, http.StatusOK, gin.H{"token": token})
}
