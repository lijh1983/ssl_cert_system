package services

import (
	"errors"
	"ssl-cert-system/internal/config"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/repositories"
	"ssl-cert-system/internal/utils/jwt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// AuthService 认证服务
type AuthService struct {
	userRepo repositories.UserRepository
	config   *config.Config
}

// NewAuthService 创建认证服务实例
func NewAuthService() *AuthService {
	cfg, _ := config.Load() // 在实际应用中应该处理错误
	return &AuthService{
		userRepo: repositories.NewUserRepository(database.GetDB()),
		config:   cfg,
	}
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

// Login 用户登录
func (s *AuthService) Login(emailOrUsername, password string) (*LoginResponse, error) {
	// 查找用户 - 支持用户名或邮箱登录
	var user *models.User
	var err error

	// 先尝试用户名查找
	user, err = s.userRepo.FindByUsername(emailOrUsername)
	if err != nil {
		// 如果用户名查找失败，尝试邮箱查找
		user, err = s.userRepo.FindByEmail(emailOrUsername)
		if err != nil {
			return nil, errors.New("invalid username or password")
		}
	}

	// 检查用户是否激活
	if !user.IsActive {
		return nil, errors.New("user account is disabled")
	}

	// 验证密码
	if !s.verifyPassword(password, user.Password) {
		return nil, errors.New("invalid username or password")
	}

	// 生成JWT token
	token, err := s.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	// 更新最后登录时间
	now := time.Now()
	user.LastLogin = &now
	s.userRepo.Update(user)

	// 清除密码字段
	user.Password = ""

	return &LoginResponse{
		Token: token,
		User:  user,
	}, nil
}

// Register 用户注册
func (s *AuthService) Register(username, email, password string) (*models.User, error) {
	// 检查用户名是否已存在
	if _, err := s.userRepo.FindByUsername(username); err == nil {
		return nil, errors.New("username already exists")
	}

	// 检查邮箱是否已存在
	if _, err := s.userRepo.FindByEmail(email); err == nil {
		return nil, errors.New("email already exists")
	}

	// 加密密码
	hashedPassword, err := s.hashPassword(password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// 创建用户
	user := &models.User{
		Username: username,
		Email:    email,
		Password: hashedPassword,
		IsAdmin:  false,
		IsActive: true,
	}

	createdUser, err := s.userRepo.Create(user)
	if err != nil {
		return nil, errors.New("failed to create user")
	}

	// 清除密码字段
	createdUser.Password = ""

	return createdUser, nil
}

// GenerateToken 生成JWT token
func (s *AuthService) GenerateToken(userID uint, username string, isAdmin bool) (string, error) {
	return jwt.GenerateToken(userID, username, isAdmin, s.config.JWT.Secret, s.config.JWT.ExpiresIn)
}

// hashPassword 加密密码
func (s *AuthService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// verifyPassword 验证密码
func (s *AuthService) verifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
