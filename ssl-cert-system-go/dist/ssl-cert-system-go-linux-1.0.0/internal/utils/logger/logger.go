package logger

import (
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

var log *logrus.Logger

// Init 初始化日志系统
func Init(level string) {
	log = logrus.New()
	
	// 设置日志格式
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02 15:04:05",
	})
	
	// 设置输出
	log.SetOutput(os.Stdout)
	
	// 设置日志级别
	switch strings.ToLower(level) {
	case "debug":
		log.SetLevel(logrus.DebugLevel)
	case "info":
		log.SetLevel(logrus.InfoLevel)
	case "warn", "warning":
		log.SetLevel(logrus.WarnLevel)
	case "error":
		log.SetLevel(logrus.ErrorLevel)
	case "fatal":
		log.SetLevel(logrus.FatalLevel)
	default:
		log.SetLevel(logrus.InfoLevel)
	}
}

// Debug 调试日志
func Debug(msg string, fields ...interface{}) {
	log.WithFields(parseFields(fields...)).Debug(msg)
}

// Info 信息日志
func Info(msg string, fields ...interface{}) {
	log.WithFields(parseFields(fields...)).Info(msg)
}

// Warn 警告日志
func Warn(msg string, fields ...interface{}) {
	log.WithFields(parseFields(fields...)).Warn(msg)
}

// Error 错误日志
func Error(msg string, fields ...interface{}) {
	log.WithFields(parseFields(fields...)).Error(msg)
}

// Fatal 致命错误日志
func Fatal(msg string, fields ...interface{}) {
	log.WithFields(parseFields(fields...)).Fatal(msg)
}

// parseFields 解析字段参数
func parseFields(fields ...interface{}) logrus.Fields {
	result := make(logrus.Fields)
	
	for i := 0; i < len(fields); i += 2 {
		if i+1 < len(fields) {
			if key, ok := fields[i].(string); ok {
				result[key] = fields[i+1]
			}
		}
	}
	
	return result
}

// GetLogger 获取日志实例
func GetLogger() *logrus.Logger {
	return log
}
