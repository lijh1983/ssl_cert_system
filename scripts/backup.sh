#!/bin/bash

# SSL证书管理系统 - 备份脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="ssl-cert-system"
APP_DIR="/opt/ssl-cert-system"
BACKUP_DIR="/opt/backups/ssl-cert-system"
DB_NAME="ssl_cert_system"
DB_USER="ssl_manager"

# 从环境变量或配置文件读取数据库密码
if [ -f "$APP_DIR/.env" ]; then
    DB_PASSWORD=$(grep "^DB_PASSWORD=" "$APP_DIR/.env" | cut -d'=' -f2)
fi

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查备份依赖..."
    
    # 检查mysqldump
    if ! command -v mysqldump &> /dev/null; then
        log_error "mysqldump未安装"
        exit 1
    fi
    
    # 检查tar
    if ! command -v tar &> /dev/null; then
        log_error "tar未安装"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建备份目录
create_backup_dir() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    CURRENT_BACKUP_DIR="$BACKUP_DIR/$timestamp"
    
    log_info "创建备份目录: $CURRENT_BACKUP_DIR"
    
    sudo mkdir -p "$CURRENT_BACKUP_DIR"
    sudo chown $USER:$USER "$CURRENT_BACKUP_DIR"
    
    log_success "备份目录创建完成"
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."
    
    local db_backup_file="$CURRENT_BACKUP_DIR/database.sql"
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "数据库密码未配置"
        exit 1
    fi
    
    # 备份数据库
    mysqldump -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        "$DB_NAME" > "$db_backup_file"
    
    # 压缩数据库备份
    gzip "$db_backup_file"
    
    local backup_size=$(du -h "$db_backup_file.gz" | cut -f1)
    log_success "数据库备份完成 (大小: $backup_size)"
}

# 备份应用文件
backup_application() {
    log_info "备份应用文件..."
    
    local app_backup_file="$CURRENT_BACKUP_DIR/application.tar.gz"
    
    # 创建应用文件备份（排除不必要的文件）
    tar -czf "$app_backup_file" \
        -C "$(dirname $APP_DIR)" \
        --exclude="$(basename $APP_DIR)/logs/*" \
        --exclude="$(basename $APP_DIR)/.git" \
        --exclude="$(basename $APP_DIR)/node_modules" \
        --exclude="$(basename $APP_DIR)/frontend/node_modules" \
        --exclude="$(basename $APP_DIR)/frontend/dist" \
        "$(basename $APP_DIR)"
    
    local backup_size=$(du -h "$app_backup_file" | cut -f1)
    log_success "应用文件备份完成 (大小: $backup_size)"
}

# 备份SSL证书
backup_certificates() {
    log_info "备份SSL证书..."
    
    local cert_dir="$APP_DIR/storage/certs"
    local cert_backup_file="$CURRENT_BACKUP_DIR/certificates.tar.gz"
    
    if [ -d "$cert_dir" ] && [ "$(ls -A $cert_dir)" ]; then
        tar -czf "$cert_backup_file" -C "$APP_DIR/storage" certs
        
        local backup_size=$(du -h "$cert_backup_file" | cut -f1)
        log_success "SSL证书备份完成 (大小: $backup_size)"
    else
        log_warning "证书目录为空，跳过证书备份"
    fi
}

# 备份配置文件
backup_configs() {
    log_info "备份配置文件..."
    
    local config_backup_dir="$CURRENT_BACKUP_DIR/configs"
    mkdir -p "$config_backup_dir"
    
    # 备份应用配置
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "$config_backup_dir/"
        log_success "应用配置文件已备份"
    fi
    
    # 备份Nginx配置
    if [ -f "/etc/nginx/sites-available/ssl-cert-system" ]; then
        sudo cp "/etc/nginx/sites-available/ssl-cert-system" "$config_backup_dir/"
        sudo chown $USER:$USER "$config_backup_dir/ssl-cert-system"
        log_success "Nginx配置文件已备份"
    fi
    
    # 备份systemd服务文件
    if [ -f "/etc/systemd/system/ssl-cert-system.service" ]; then
        sudo cp "/etc/systemd/system/ssl-cert-system.service" "$config_backup_dir/"
        sudo chown $USER:$USER "$config_backup_dir/ssl-cert-system.service"
        log_success "systemd服务文件已备份"
    fi
}

# 创建备份信息文件
create_backup_info() {
    log_info "创建备份信息文件..."
    
    local info_file="$CURRENT_BACKUP_DIR/backup_info.txt"
    
    cat > "$info_file" << EOF
SSL证书管理系统备份信息
========================

备份时间: $(date '+%Y-%m-%d %H:%M:%S')
备份目录: $CURRENT_BACKUP_DIR
主机名: $(hostname)
操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || uname -s)

应用信息:
- 应用目录: $APP_DIR
- 数据库名: $DB_NAME
- 数据库用户: $DB_USER

备份内容:
- 数据库: database.sql.gz
- 应用文件: application.tar.gz
- SSL证书: certificates.tar.gz (如果存在)
- 配置文件: configs/

备份文件大小:
$(du -sh "$CURRENT_BACKUP_DIR"/* 2>/dev/null || echo "无文件")

恢复说明:
1. 恢复数据库: gunzip -c database.sql.gz | mysql -u $DB_USER -p $DB_NAME
2. 恢复应用: tar -xzf application.tar.gz -C /opt/
3. 恢复证书: tar -xzf certificates.tar.gz -C $APP_DIR/storage/
4. 恢复配置: 手动复制configs/目录下的文件到对应位置
EOF
    
    log_success "备份信息文件创建完成"
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份..."
    
    local keep_days=${BACKUP_KEEP_DAYS:-30}
    
    # 删除超过指定天数的备份
    find "$BACKUP_DIR" -type d -name "20*" -mtime +$keep_days -exec rm -rf {} \; 2>/dev/null || true
    
    # 显示当前备份数量
    local backup_count=$(find "$BACKUP_DIR" -type d -name "20*" | wc -l)
    log_success "清理完成，当前保留 $backup_count 个备份"
}

# 验证备份
verify_backup() {
    log_info "验证备份完整性..."
    
    local errors=0
    
    # 检查数据库备份
    if [ -f "$CURRENT_BACKUP_DIR/database.sql.gz" ]; then
        if gunzip -t "$CURRENT_BACKUP_DIR/database.sql.gz" 2>/dev/null; then
            log_success "数据库备份文件完整"
        else
            log_error "数据库备份文件损坏"
            errors=$((errors + 1))
        fi
    fi
    
    # 检查应用备份
    if [ -f "$CURRENT_BACKUP_DIR/application.tar.gz" ]; then
        if tar -tzf "$CURRENT_BACKUP_DIR/application.tar.gz" >/dev/null 2>&1; then
            log_success "应用备份文件完整"
        else
            log_error "应用备份文件损坏"
            errors=$((errors + 1))
        fi
    fi
    
    # 检查证书备份
    if [ -f "$CURRENT_BACKUP_DIR/certificates.tar.gz" ]; then
        if tar -tzf "$CURRENT_BACKUP_DIR/certificates.tar.gz" >/dev/null 2>&1; then
            log_success "证书备份文件完整"
        else
            log_error "证书备份文件损坏"
            errors=$((errors + 1))
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "备份验证通过"
        return 0
    else
        log_error "备份验证失败，发现 $errors 个错误"
        return 1
    fi
}

# 显示备份摘要
show_backup_summary() {
    local total_size=$(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)
    
    echo
    log_success "备份完成！"
    echo
    echo "📊 备份摘要："
    echo "  备份目录: $CURRENT_BACKUP_DIR"
    echo "  总大小: $total_size"
    echo "  备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo
    echo "📁 备份内容："
    ls -la "$CURRENT_BACKUP_DIR"
    echo
    echo "🔧 恢复命令："
    echo "  查看备份信息: cat $CURRENT_BACKUP_DIR/backup_info.txt"
    echo "  恢复数据库: gunzip -c $CURRENT_BACKUP_DIR/database.sql.gz | mysql -u $DB_USER -p $DB_NAME"
}

# 主函数
main() {
    echo "💾 开始备份SSL证书管理系统..."
    echo
    
    check_dependencies
    create_backup_dir
    backup_database
    backup_application
    backup_certificates
    backup_configs
    create_backup_info
    
    if verify_backup; then
        cleanup_old_backups
        show_backup_summary
    else
        log_error "备份验证失败，请检查备份文件"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
