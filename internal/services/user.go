package services

import (
	"errors"
	"ssl-cert-system/internal/database"
	"ssl-cert-system/internal/models"
	"ssl-cert-system/internal/repositories"

	"golang.org/x/crypto/bcrypt"
)

// UserService 用户服务
type UserService struct {
	userRepo repositories.UserRepository
}

// NewUserService 创建用户服务实例
func NewUserService() *UserService {
	return &UserService{
		userRepo: repositories.NewUserRepository(database.GetDB()),
	}
}

// GetUsers 获取用户列表
func (s *UserService) GetUsers() ([]*models.User, error) {
	return s.userRepo.FindAll()
}

// GetUserByID 根据ID获取用户
func (s *UserService) GetUserByID(id uint) (*models.User, error) {
	return s.userRepo.FindByID(id)
}

// UpdateUser 更新用户
func (s *UserService) UpdateUser(id uint, updateData map[string]interface{}) (*models.User, error) {
	// 获取现有用户
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// 处理密码更新
	if password, exists := updateData["password"]; exists {
		if passwordStr, ok := password.(string); ok && passwordStr != "" {
			hashedPassword, err := s.hashPassword(passwordStr)
			if err != nil {
				return nil, errors.New("failed to hash password")
			}
			updateData["password"] = hashedPassword
		} else {
			delete(updateData, "password") // 如果密码为空，则不更新
		}
	}

	// 检查用户名唯一性
	if username, exists := updateData["username"]; exists {
		if usernameStr, ok := username.(string); ok && usernameStr != user.Username {
			if _, err := s.userRepo.FindByUsername(usernameStr); err == nil {
				return nil, errors.New("username already exists")
			}
		}
	}

	// 检查邮箱唯一性
	if email, exists := updateData["email"]; exists {
		if emailStr, ok := email.(string); ok && emailStr != user.Email {
			if _, err := s.userRepo.FindByEmail(emailStr); err == nil {
				return nil, errors.New("email already exists")
			}
		}
	}

	// 更新用户
	updatedUser, err := s.userRepo.UpdateByID(id, updateData)
	if err != nil {
		return nil, errors.New("failed to update user")
	}

	// 清除密码字段
	updatedUser.Password = ""

	return updatedUser, nil
}

// DeleteUser 删除用户
func (s *UserService) DeleteUser(id uint) error {
	// 检查用户是否存在
	_, err := s.userRepo.FindByID(id)
	if err != nil {
		return errors.New("user not found")
	}

	// 软删除用户
	return s.userRepo.Delete(id)
}

// hashPassword 加密密码
func (s *UserService) hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
