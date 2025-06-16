#!/usr/bin/env bash

# SSL证书自动化管理系统客户端脚本
# 基于httpsok.sh设计，用于收集服务器信息、证书信息，与服务端API交互
# 实现证书下载与部署功能

# 版本信息
VERSION="1.0.0"
PROJECT_NAME="ssl_cert_client"
PROJECT_ENTRY="ssl_cert_client.sh"

# 目录配置
PROJECT_HOME="$HOME/.ssl_cert_client"
PROJECT_BACKUPS="$PROJECT_HOME/backups"
PROJECT_LOGS="$PROJECT_HOME/logs"
PROJECT_CONFIG="$PROJECT_HOME/config"
PROJECT_CERTS="$PROJECT_HOME/certs"

# 日志文件
LOG_FILE="$PROJECT_LOGS/client.log"

# 配置文件
CONFIG_FILE="$PROJECT_CONFIG/config.conf"
SERVER_UUID_FILE="$PROJECT_CONFIG/server_uuid"
API_TOKEN_FILE="$PROJECT_CONFIG/api_token"

# API配置
API_BASE_URL="https://api.example.com/v1"
API_TIMEOUT=30

# Web服务器配置
NGINX_BIN="nginx"
APACHE_BIN="apache2ctl"

# 全局变量
SERVER_UUID=""
API_TOKEN=""
DEBUG=0
QUIET=0

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 工具函数
# ==========================================

# 日志函数
_log() {
  local level="$1"
  local msg="$2"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  
  # 确保日志目录存在
  mkdir -p "$PROJECT_LOGS"
  
  echo "$timestamp [$level] $msg" >> "$LOG_FILE"
  
  if [ "$QUIET" -eq 0 ]; then
    case "$level" in
      "ERROR")
        echo -e "${RED}$timestamp [$level] $msg${NC}" >&2
        ;;
      "WARNING")
        echo -e "${YELLOW}$timestamp [$level] $msg${NC}" >&2
        ;;
      "SUCCESS")
        echo -e "${GREEN}$timestamp [$level] $msg${NC}"
        ;;
      "INFO")
        echo -e "$timestamp [$level] $msg"
        ;;
      "DEBUG")
        if [ "$DEBUG" -eq 1 ]; then
          echo -e "${BLUE}$timestamp [$level] $msg${NC}"
        fi
        ;;
    esac
  fi
}

_debug() {
  _log "DEBUG" "$1"
}

_info() {
  _log "INFO" "$1"
}

_warn() {
  _log "WARNING" "$1"
}

_error() {
  _log "ERROR" "$1"
}

_success() {
  _log "SUCCESS" "$1"
}

# 检查命令是否存在
_exists() {
  cmd="$1"
  if [ -z "$cmd" ]; then
    _error "Usage: _exists cmd"
    return 1
  fi
  
  if type "$cmd" > /dev/null 2>&1; then
    return 0
  fi
  return 1
}

# 生成随机字符串
_random_string() {
  local length=${1:-32}
  tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c "$length"
}

# 生成UUID
_generate_uuid() {
  if _exists "uuidgen"; then
    uuidgen
  else
    _random_string 32
  fi
}

# 获取服务器UUID
_get_server_uuid() {
  if [ -f "$SERVER_UUID_FILE" ]; then
    SERVER_UUID=$(cat "$SERVER_UUID_FILE")
  else
    # 生成新的UUID
    SERVER_UUID=$(_generate_uuid)
    mkdir -p "$PROJECT_CONFIG"
    echo "$SERVER_UUID" > "$SERVER_UUID_FILE"
  fi
  
  _debug "Server UUID: $SERVER_UUID"
  return 0
}

# 获取API令牌
_get_api_token() {
  if [ -f "$API_TOKEN_FILE" ]; then
    API_TOKEN=$(cat "$API_TOKEN_FILE")
  else
    _error "API token not found. Please register the server first."
    return 1
  fi
  
  _debug "API Token: $API_TOKEN"
  return 0
}

# 保存API令牌
_save_api_token() {
  local token="$1"
  mkdir -p "$PROJECT_CONFIG"
  echo "$token" > "$API_TOKEN_FILE"
  API_TOKEN="$token"
  _debug "API Token saved: $token"
}

# 初始化配置
_init_config() {
  # 创建必要的目录
  mkdir -p "$PROJECT_HOME"
  mkdir -p "$PROJECT_BACKUPS"
  mkdir -p "$PROJECT_LOGS"
  mkdir -p "$PROJECT_CONFIG"
  mkdir -p "$PROJECT_CERTS"
  
  # 创建配置文件（如果不存在）
  if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << EOF
# SSL证书自动化管理系统客户端配置
API_BASE_URL="$API_BASE_URL"
API_TIMEOUT=$API_TIMEOUT
DEBUG=$DEBUG
QUIET=$QUIET
EOF
  fi
  
  # 加载配置
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
  fi
  
  # 获取服务器UUID
  _get_server_uuid
  
  return 0
}

# API通信函数
# ==========================================

# 发送HTTP请求
_http_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local url="${API_BASE_URL}${endpoint}"
  
  _debug "HTTP Request: $method $url"
  
  local headers=()
  headers+=("-H" "Content-Type: application/json")
  
  if [ -n "$API_TOKEN" ]; then
    headers+=("-H" "Authorization: Bearer $API_TOKEN")
  fi
  
  local curl_opts=()
  curl_opts+=("-s")
  curl_opts+=("-X" "$method")
  curl_opts+=("${headers[@]}")
  curl_opts+=("--connect-timeout" "$API_TIMEOUT")
  
  if [ -n "$data" ]; then
    curl_opts+=("-d" "$data")
    _debug "Request data: $data"
  fi
  
  local response
  response=$(curl "${curl_opts[@]}" "$url" 2>&1)
  local ret=$?
  
  if [ $ret -ne 0 ]; then
    _error "HTTP request failed: $response"
    return $ret
  fi
  
  _debug "Response: $response"
  echo "$response"
  return 0
}

# 服务器注册
register_server() {
  _info "Registering server..."
  
  # 收集服务器信息
  local server_info
  server_info=$(collect_server_info)
  
  # 发送注册请求
  local response
  response=$(_http_request "POST" "/servers/register" "$server_info")
  local ret=$?
  
  if [ $ret -ne 0 ]; then
    _error "Server registration failed"
    return $ret
  fi
  
  # 解析响应
  local token
  token=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$token" ]; then
    _error "Failed to get API token from response"
    return 1
  fi
  
  # 保存API令牌
  _save_api_token "$token"
  
  _success "Server registered successfully"
  return 0
}

# 发送心跳
send_heartbeat() {
  _debug "Sending heartbeat..."
  
  # 获取API令牌
  _get_api_token || return 1
  
  # 收集系统信息
  local system_info
  system_info=$(collect_system_info)
  
  # 发送心跳请求
  local response
  response=$(_http_request "POST" "/servers/heartbeat" "{\"uuid\":\"$SERVER_UUID\",\"system_info\":$system_info}")
  local ret=$?
  
  if [ $ret -ne 0 ]; then
    _error "Heartbeat failed"
    return $ret
  fi
  
  _debug "Heartbeat sent successfully"
  return 0
}

# 同步证书信息
sync_certificates() {
  _info "Syncing certificates..."
  
  # 获取API令牌
  _get_api_token || return 1
  
  # 扫描证书
  local certificates
  certificates=$(scan_certificates)
  
  # 发送证书信息
  local response
  response=$(_http_request "POST" "/certificates/sync" "{\"uuid\":\"$SERVER_UUID\",\"certificates\":$certificates}")
  local ret=$?
  
  if [ $ret -ne 0 ]; then
    _error "Certificate sync failed"
    return $ret
  fi
  
  _success "Certificates synced successfully"
  return 0
}

# 下载证书
download_certificate() {
  local cert_id="$1"
  local output_dir="$2"
  
  _info "Downloading certificate $cert_id..."
  
  # 获取API令牌
  _get_api_token || return 1
  
  # 创建输出目录
  mkdir -p "$output_dir"
  
  # 发送下载请求
  local response
  response=$(_http_request "GET" "/certificates/$cert_id/download" "")
  local ret=$?
  
  if [ $ret -ne 0 ]; then
    _error "Certificate download failed"
    return $ret
  fi
  
  # 解析响应
  local cert_data
  cert_data=$(echo "$response" | grep -o '"cert_data":"[^"]*"' | cut -d'"' -f4)
  local key_data
  key_data=$(echo "$response" | grep -o '"key_data":"[^"]*"' | cut -d'"' -f4)
  local ca_data
  ca_data=$(echo "$response" | grep -o '"ca_data":"[^"]*"' | cut -d'"' -f4)
  local fullchain_data
  fullchain_data=$(echo "$response" | grep -o '"fullchain_data":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$cert_data" ] || [ -z "$key_data" ]; then
    _error "Invalid certificate data in response"
    return 1
  fi
  
  # 保存证书文件
  echo "$cert_data" | base64 -d > "$output_dir/cert.pem"
  echo "$key_data" | base64 -d > "$output_dir/key.pem"
  
  if [ -n "$ca_data" ]; then
    echo "$ca_data" | base64 -d > "$output_dir/ca.pem"
  fi
  
  if [ -n "$fullchain_data" ]; then
    echo "$fullchain_data" | base64 -d > "$output_dir/fullchain.pem"
  fi
  
  _success "Certificate downloaded to $output_dir"
  return 0
}

# 部署证书
deploy_certificate() {
  local cert_id="$1"
  local deploy_path="$2"
  local config_path="$3"
  local web_server="$4"
  
  _info "Deploying certificate $cert_id..."
  
  # 获取API令牌
  _get_api_token || return 1
  
  # 下载证书到临时目录
  local temp_dir
  temp_dir="$PROJECT_CERTS/$cert_id"
  download_certificate "$cert_id" "$temp_dir" || return 1
  
  # 备份原有证书
  if [ -f "$deploy_path/cert.pem" ]; then
    local backup_dir
    backup_dir="$PROJECT_BACKUPS/$(date +%Y%m%d%H%M%S)"
    mkdir -p "$backup_dir"
    cp "$deploy_path/cert.pem" "$backup_dir/"
    cp "$deploy_path/key.pem" "$backup_dir/" 2>/dev/null || true
    cp "$deploy_path/ca.pem" "$backup_dir/" 2>/dev/null || true
    cp "$deploy_path/fullchain.pem" "$backup_dir/" 2>/dev/null || true
    _info "Original certificates backed up to $backup_dir"
  fi
  
  # 创建部署目录
  mkdir -p "$deploy_path"
  
  # 复制证书文件
  cp "$temp_dir/cert.pem" "$deploy_path/"
  cp "$temp_dir/key.pem" "$deploy_path/"
  cp "$temp_dir/ca.pem" "$deploy_path/" 2>/dev/null || true
  cp "$temp_dir/fullchain.pem" "$deploy_path/" 2>/dev/null || true
  
  # 设置权限
  chmod 644 "$deploy_path/cert.pem"
  chmod 600 "$deploy_path/key.pem"
  chmod 644 "$deploy_path/ca.pem" 2>/dev/null || true
  chmod 644 "$deploy_path/fullchain.pem" 2>/dev/null || true
  
  # 重载Web服务器
  local reload_result
  reload_result=$(reload_web_server "$web_server")
  local ret=$?
  
  if [ $ret -ne 0 ]; then
    _error "Failed to reload web server: $reload_result"
    return $ret
  fi
  
  # 报告部署结果
  local response
  response=$(_http_request "POST" "/certificates/$cert_id/deploy" "{\"uuid\":\"$SERVER_UUID\",\"status\":\"success\",\"deploy_path\":\"$deploy_path\"}")
  
  _success "Certificate deployed successfully"
  return 0
}

# 重载Web服务器
reload_web_server() {
  local web_server="$1"
  
  _info "Reloading $web_server..."
  
  case "$web_server" in
    "nginx")
      if ! _exists "$NGINX_BIN"; then
        _error "Nginx not found"
        return 1
      fi
      "$NGINX_BIN" -t && "$NGINX_BIN" -s reload
      ;;
    "apache")
      if ! _exists "$APACHE_BIN"; then
        _error "Apache not found"
        return 1
      fi
      "$APACHE_BIN" configtest && "$APACHE_BIN" graceful
      ;;
    *)
      _error "Unsupported web server: $web_server"
      return 1
      ;;
  esac
  
  local ret=$?
  if [ $ret -ne 0 ]; then
    _error "Failed to reload $web_server"
    return $ret
  fi
  
  _success "$web_server reloaded successfully"
  return 0
}

# 信息收集函数
# ==========================================

# 收集服务器信息
collect_server_info() {
  _debug "Collecting server information..."
  
  # 获取主机名
  local hostname
  hostname=$(hostname -f 2>/dev/null || hostname)
  
  # 获取IP地址
  local ip_address
  ip_address=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [ -z "$ip_address" ]; then
    ip_address=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1)
  fi
  
  # 获取操作系统类型
  local os_type
  if [ -f /etc/os-release ]; then
    os_type=$(grep -oP '(?<=^ID=).+' /etc/os-release | tr -d '"')
  elif [ -f /etc/redhat-release ]; then
    os_type="rhel"
  elif [ -f /etc/debian_version ]; then
    os_type="debian"
  else
    os_type="unknown"
  fi
  
  # 获取操作系统版本
  local os_version
  if [ -f /etc/os-release ]; then
    os_version=$(grep -oP '(?<=^VERSION_ID=).+' /etc/os-release | tr -d '"')
  elif [ -f /etc/redhat-release ]; then
    os_version=$(cat /etc/redhat-release | grep -oP '\d+\.\d+')
  elif [ -f /etc/debian_version ]; then
    os_version=$(cat /etc/debian_version)
  else
    os_version="unknown"
  fi
  
  # 检测Web服务器
  local web_server=""
  local web_server_version=""
  
  # 检测Nginx
  if _exists "$NGINX_BIN"; then
    web_server="nginx"
    web_server_version=$("$NGINX_BIN" -v 2>&1 | grep -oP '(?<=nginx/)\d+\.\d+\.\d+')
  # 检测Apache
  elif _exists "$APACHE_BIN"; then
    web_server="apache"
    web_server_version=$("$APACHE_BIN" -v 2>&1 | grep -oP '(?<=Apache/)\d+\.\d+\.\d+')
  fi
  
  # 收集系统信息
  local system_info
  system_info=$(collect_system_info)
  
  # 构建JSON
  cat << EOF
{
  "uuid": "$SERVER_UUID",
  "hostname": "$hostname",
  "ip_address": "$ip_address",
  "os_type": "$os_type",
  "os_version": "$os_version",
  "web_server": "$web_server",
  "web_server_version": "$web_server_version",
  "system_info": $system_info
}
EOF
}

# 收集系统信息
collect_system_info() {
  _debug "Collecting system information..."
  
  # 获取CPU信息
  local cpu_count
  cpu_count=$(grep -c "^processor" /proc/cpuinfo 2>/dev/null || echo "1")
  local cpu_model
  cpu_model=$(grep "model name" /proc/cpuinfo 2>/dev/null | head -n1 | cut -d':' -f2 | xargs)
  
  # 获取内存信息
  local mem_total
  mem_total=$(grep "MemTotal" /proc/meminfo 2>/dev/null | awk '{print $2}')
  local mem_free
  mem_free=$(grep "MemFree" /proc/meminfo 2>/dev/null | awk '{print $2}')
  
  # 获取磁盘信息
  local disk_total
  disk_total=$(df -k / | tail -n1 | awk '{print $2}')
  local disk_free
  disk_free=$(df -k / | tail -n1 | awk '{print $4}')
  
  # 构建JSON
  cat << EOF
{
  "cpu": {
    "count": $cpu_count,
    "model": "$cpu_model"
  },
  "memory": {
    "total": $mem_total,
    "free": $mem_free
  },
  "disk": {
    "total": $disk_total,
    "free": $disk_free
  }
}
EOF
}

# 扫描证书
scan_certificates() {
  _debug "Scanning certificates..."
  
  local certificates="[]"
  
  # 检测Web服务器类型
  if _exists "$NGINX_BIN"; then
    certificates=$(scan_nginx_certificates)
  elif _exists "$APACHE_BIN"; then
    certificates=$(scan_apache_certificates)
  else
    _warn "No supported web server found"
  fi
  
  echo "$certificates"
}

# 扫描Nginx证书
scan_nginx_certificates() {
  _debug "Scanning Nginx certificates..."
  
  # 查找Nginx配置文件
  local nginx_conf
  nginx_conf=$("$NGINX_BIN" -t 2>&1 | grep -oP '(?<=configuration file )[^\s]+' | head -n1)
  
  if [ -z "$nginx_conf" ]; then
    # 尝试常见位置
    for conf in /etc/nginx/nginx.conf /usr/local/nginx/conf/nginx.conf /usr/local/etc/nginx/nginx.conf; do
      if [ -f "$conf" ]; then
        nginx_conf="$conf"
        break
      fi
    done
  fi
  
  if [ -z "$nginx_conf" ] || [ ! -f "$nginx_conf" ]; then
    _warn "Nginx configuration file not found"
    return 1
  fi
  
  _debug "Found Nginx configuration file: $nginx_conf"
  
  # 查找包含的配置文件
  local include_dirs
  include_dirs=$(grep -oP '(?<=include )[^;]+' "$nginx_conf" | grep -v "\*")
  
  # 查找SSL证书配置
  local cert_files=()
  local key_files=()
  local domains=()
  
  # 处理主配置文件
  process_nginx_config "$nginx_conf" cert_files key_files domains
  
  # 处理包含的配置文件
  for include in $include_dirs; do
    if [ -d "$include" ]; then
      for conf in "$include"/*.conf; do
        if [ -f "$conf" ]; then
          process_nginx_config "$conf" cert_files key_files domains
        fi
      done
    elif [ -f "$include" ]; then
      process_nginx_config "$include" cert_files key_files domains
    fi
  done
  
  # 构建证书JSON数组
  local certs_json="["
  local first=true
  
  for i in "${!cert_files[@]}"; do
    if [ -f "${cert_files[$i]}" ] && [ -f "${key_files[$i]}" ]; then
      local cert_info
      cert_info=$(get_certificate_info "${cert_files[$i]}" "${key_files[$i]}" "${domains[$i]}")
      
      if [ -n "$cert_info" ]; then
        if [ "$first" = true ]; then
          first=false
        else
          certs_json+=","
        fi
        certs_json+="$cert_info"
      fi
    fi
  done
  
  certs_json+="]"
  echo "$certs_json"
}

# 处理Nginx配置文件
process_nginx_config() {
  local config_file="$1"
  local -n cert_files="$2"
  local -n key_files="$3"
  local -n domains="$4"
  
  _debug "Processing Nginx config: $config_file"
  
  # 查找SSL证书和密钥
  local server_blocks
  server_blocks=$(awk '/server\s*{/,/}/' "$config_file")
  
  while read -r line; do
    if [[ "$line" =~ ssl_certificate[[:space:]]+([^;]+) ]]; then
      local cert_file="${BASH_REMATCH[1]}"
      cert_files+=("$cert_file")
      _debug "Found certificate: $cert_file"
    fi
    
    if [[ "$line" =~ ssl_certificate_key[[:space:]]+([^;]+) ]]; then
      local key_file="${BASH_REMATCH[1]}"
      key_files+=("$key_file")
      _debug "Found key: $key_file"
    fi
    
    if [[ "$line" =~ server_name[[:space:]]+([^;]+) ]]; then
      local domain="${BASH_REMATCH[1]}"
      # 取第一个域名
      domain=$(echo "$domain" | awk '{print $1}')
      domains+=("$domain")
      _debug "Found domain: $domain"
    fi
  done <<< "$server_blocks"
}

# 扫描Apache证书
scan_apache_certificates() {
  _debug "Scanning Apache certificates..."
  
  # 查找Apache配置文件
  local apache_conf
  apache_conf=$("$APACHE_BIN" -t -D DUMP_INCLUDES 2>/dev/null | grep -oP '(?<=\()\S+\.conf(?=\))' | head -n1)
  
  if [ -z "$apache_conf" ]; then
    # 尝试常见位置
    for conf in /etc/apache2/apache2.conf /etc/httpd/conf/httpd.conf; do
      if [ -f "$conf" ]; then
        apache_conf="$conf"
        break
      fi
    done
  fi
  
  if [ -z "$apache_conf" ] || [ ! -f "$apache_conf" ]; then
    _warn "Apache configuration file not found"
    return 1
  fi
  
  _debug "Found Apache configuration file: $apache_conf"
  
  # 查找包含的配置文件
  local include_dirs
  include_dirs=$(grep -oP '(?<=Include )[^\s]+' "$apache_conf" 2>/dev/null)
  
  # 查找SSL证书配置
  local cert_files=()
  local key_files=()
  local domains=()
  
  # 处理主配置文件
  process_apache_config "$apache_conf" cert_files key_files domains
  
  # 处理包含的配置文件
  for include in $include_dirs; do
    if [ -d "$include" ]; then
      for conf in "$include"/*.conf; do
        if [ -f "$conf" ]; then
          process_apache_config "$conf" cert_files key_files domains
        fi
      done
    elif [ -f "$include" ]; then
      process_apache_config "$include" cert_files key_files domains
    fi
  done
  
  # 构建证书JSON数组
  local certs_json="["
  local first=true
  
  for i in "${!cert_files[@]}"; do
    if [ -f "${cert_files[$i]}" ] && [ -f "${key_files[$i]}" ]; then
      local cert_info
      cert_info=$(get_certificate_info "${cert_files[$i]}" "${key_files[$i]}" "${domains[$i]}")
      
      if [ -n "$cert_info" ]; then
        if [ "$first" = true ]; then
          first=false
        else
          certs_json+=","
        fi
        certs_json+="$cert_info"
      fi
    fi
  done
  
  certs_json+="]"
  echo "$certs_json"
}

# 处理Apache配置文件
process_apache_config() {
  local config_file="$1"
  local -n cert_files="$2"
  local -n key_files="$3"
  local -n domains="$4"
  
  _debug "Processing Apache config: $config_file"
  
  # 查找SSL证书和密钥
  while read -r line; do
    if [[ "$line" =~ SSLCertificateFile[[:space:]]+([^[:space:]]+) ]]; then
      local cert_file="${BASH_REMATCH[1]}"
      cert_files+=("$cert_file")
      _debug "Found certificate: $cert_file"
    fi
    
    if [[ "$line" =~ SSLCertificateKeyFile[[:space:]]+([^[:space:]]+) ]]; then
      local key_file="${BASH_REMATCH[1]}"
      key_files+=("$key_file")
      _debug "Found key: $key_file"
    fi
    
    if [[ "$line" =~ ServerName[[:space:]]+([^[:space:]]+) ]]; then
      local domain="${BASH_REMATCH[1]}"
      domains+=("$domain")
      _debug "Found domain: $domain"
    fi
  done < "$config_file"
}

# 获取证书信息
get_certificate_info() {
  local cert_file="$1"
  local key_file="$2"
  local domain="$3"
  
  _debug "Getting certificate info for $cert_file"
  
  # 检查证书文件是否存在
  if [ ! -f "$cert_file" ]; then
    _warn "Certificate file not found: $cert_file"
    return 1
  fi
  
  # 使用openssl获取证书信息
  local cert_text
  cert_text=$(openssl x509 -in "$cert_file" -noout -text 2>/dev/null)
  if [ $? -ne 0 ]; then
    _warn "Failed to parse certificate: $cert_file"
    return 1
  fi
  
  # 获取证书主题
  local subject
  subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/^subject=//i')
  
  # 获取证书颁发者
  local issuer
  issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/^issuer=//i')
  
  # 获取证书有效期
  local valid_from
  valid_from=$(openssl x509 -in "$cert_file" -noout -startdate 2>/dev/null | sed 's/^notBefore=//i')
  local valid_to
  valid_to=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | sed 's/^notAfter=//i')
  
  # 转换日期格式
  valid_from=$(date -d "$valid_from" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
  valid_to=$(date -d "$valid_to" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
  
  # 计算剩余天数
  local days_remaining
  days_remaining=$(( ($(date -d "$valid_to" +%s) - $(date +%s)) / 86400 ))
  
  # 获取SAN扩展
  local alt_domains=""
  local san
  san=$(openssl x509 -in "$cert_file" -noout -ext subjectAltName 2>/dev/null)
  if [ $? -eq 0 ] && [[ "$san" =~ DNS: ]]; then
    alt_domains=$(echo "$san" | grep -oP '(?<=DNS:)[^,\s]+' | tr '\n' ',' | sed 's/,$//')
  fi
  
  # 如果没有指定域名，尝试从证书中提取
  if [ -z "$domain" ]; then
    domain=$(echo "$subject" | grep -oP '(?<=CN=)[^,/]+' | head -n1)
  fi
  
  # 构建JSON
  cat << EOF
{
  "domain": "$domain",
  "alt_domains": "$alt_domains",
  "issuer": "$issuer",
  "valid_from": "$valid_from",
  "valid_to": "$valid_to",
  "days_remaining": $days_remaining,
  "cert_path": "$cert_file",
  "key_path": "$key_file"
}
EOF
}

# 主函数
# ==========================================

# 显示帮助信息
show_help() {
  cat << EOF
SSL证书自动化管理系统客户端 v$VERSION

用法: $0 [选项] 命令

命令:
  register                  注册服务器
  heartbeat                 发送心跳
  sync                      同步证书信息
  download <cert_id> <dir>  下载证书
  deploy <cert_id> <path> <config> <web_server>  部署证书
  help                      显示帮助信息

选项:
  -d, --debug               启用调试模式
  -q, --quiet               安静模式，不输出信息
  -h, --help                显示帮助信息
  -v, --version             显示版本信息

示例:
  $0 register               注册服务器
  $0 sync                   同步证书信息
  $0 deploy 123 /etc/ssl/example.com /etc/nginx/sites-enabled/example.conf nginx  部署证书
EOF
}

# 显示版本信息
show_version() {
  echo "$PROJECT_NAME v$VERSION"
}

# 解析命令行参数
parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      -v|--version)
        show_version
        exit 0
        ;;
      -d|--debug)
        DEBUG=1
        shift
        ;;
      -q|--quiet)
        QUIET=1
        shift
        ;;
      register|heartbeat|sync|download|deploy|help)
        COMMAND="$1"
        shift
        break
        ;;
      *)
        _error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
  
  # 处理命令参数
  case "$COMMAND" in
    register)
      # 无额外参数
      ;;
    heartbeat)
      # 无额外参数
      ;;
    sync)
      # 无额外参数
      ;;
    download)
      CERT_ID="$1"
      OUTPUT_DIR="$2"
      if [ -z "$CERT_ID" ] || [ -z "$OUTPUT_DIR" ]; then
        _error "Missing required arguments for download command"
        show_help
        exit 1
      fi
      shift 2
      ;;
    deploy)
      CERT_ID="$1"
      DEPLOY_PATH="$2"
      CONFIG_PATH="$3"
      WEB_SERVER="$4"
      if [ -z "$CERT_ID" ] || [ -z "$DEPLOY_PATH" ] || [ -z "$WEB_SERVER" ]; then
        _error "Missing required arguments for deploy command"
        show_help
        exit 1
      fi
      shift 4
      ;;
    help)
      show_help
      exit 0
      ;;
    *)
      _error "No command specified"
      show_help
      exit 1
      ;;
  esac
}

# 主函数
main() {
  # 初始化配置
  _init_config
  
  # 解析命令行参数
  parse_args "$@"
  
  # 执行命令
  case "$COMMAND" in
    register)
      register_server
      ;;
    heartbeat)
      send_heartbeat
      ;;
    sync)
      sync_certificates
      ;;
    download)
      download_certificate "$CERT_ID" "$OUTPUT_DIR"
      ;;
    deploy)
      deploy_certificate "$CERT_ID" "$DEPLOY_PATH" "$CONFIG_PATH" "$WEB_SERVER"
      ;;
  esac
  
  return $?
}

# 执行主函数
main "$@"
