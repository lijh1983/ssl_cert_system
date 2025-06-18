package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config 应用配置结构
type Config struct {
	Environment string         `json:"environment"`
	Server      ServerConfig   `json:"server"`
	Database    DatabaseConfig `json:"database"`
	JWT         JWTConfig      `json:"jwt"`
	ACME        ACMEConfig     `json:"acme"`
	LogLevel    string         `json:"log_level"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port            string        `json:"port"`
	ReadTimeout     time.Duration `json:"read_timeout"`
	WriteTimeout    time.Duration `json:"write_timeout"`
	IdleTimeout     time.Duration `json:"idle_timeout"`
	ShutdownTimeout time.Duration `json:"shutdown_timeout"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host            string `json:"host"`
	Port            string `json:"port"`
	Name            string `json:"name"`
	User            string `json:"user"`
	Password        string `json:"password"`
	MaxOpenConns    int    `json:"max_open_conns"`
	MaxIdleConns    int    `json:"max_idle_conns"`
	ConnMaxLifetime time.Duration `json:"conn_max_lifetime"`
}

// JWTConfig JWT配置
type JWTConfig struct {
	Secret    string        `json:"secret"`
	ExpiresIn time.Duration `json:"expires_in"`
}

// ACMEConfig ACME配置
type ACMEConfig struct {
	Server           string `json:"server"`
	Email            string `json:"email"`
	StoragePath      string `json:"storage_path"`
	ChallengeType    string `json:"challenge_type"`    // http-01 或 dns-01
	HTTPPort         string `json:"http_port"`         // HTTP-01验证端口
	DNSPropagationWait int  `json:"dns_propagation_wait"` // DNS传播等待时间(秒)
}

// Load 加载配置
func Load() (*Config, error) {
	cfg := &Config{
		Environment: getEnv("NODE_ENV", "development"),
		Server: ServerConfig{
			Port:            getEnv("PORT", "3001"),
			ReadTimeout:     30 * time.Second,
			WriteTimeout:    30 * time.Second,
			IdleTimeout:     60 * time.Second,
			ShutdownTimeout: 10 * time.Second,
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "3306"),
			Name:            getEnv("DB_NAME", "ssl_cert_system"),
			User:            getEnv("DB_USER", "ssl_manager"),
			Password:        getEnv("DB_PASSWORD", ""),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 10),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: time.Hour,
		},
		JWT: JWTConfig{
			Secret:    getEnv("JWT_SECRET", "your_jwt_secret_key_here"),
			ExpiresIn: 24 * time.Hour,
		},
		ACME: ACMEConfig{
			Server:             getEnv("ACME_SERVER", "https://acme-v02.api.letsencrypt.org/directory"),
			Email:              getEnv("ACME_EMAIL", ""),
			StoragePath:        getEnv("ACME_STORAGE_PATH", "./storage/certs"),
			ChallengeType:      getEnv("ACME_CHALLENGE_TYPE", "http-01"),
			HTTPPort:           getEnv("ACME_HTTP_PORT", "80"),
			DNSPropagationWait: getEnvInt("ACME_DNS_PROPAGATION_WAIT", 300), // 5分钟默认等待
		},
		LogLevel: getEnv("LOG_LEVEL", "info"),
	}

	// 验证必要配置（测试模式跳过）
	if os.Getenv("NODE_ENV") != "test" {
		if cfg.Database.Password == "" {
			return nil, fmt.Errorf("database password is required")
		}

		if cfg.ACME.Email == "" {
			return nil, fmt.Errorf("ACME email is required")
		}
	}

	return cfg, nil
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt 获取整数类型的环境变量，如果不存在或无效则返回默认值
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}


