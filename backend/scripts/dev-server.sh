#\!/bin/bash

# SSL Certificate Management System - Development Server Script
# This script provides stable development server management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-3000}
NODE_ENV=${NODE_ENV:-development}
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$BACKEND_DIR/.dev-server.pid"
LOG_FILE="$BACKEND_DIR/logs/dev-server.log"

# Ensure logs directory exists
mkdir -p "$BACKEND_DIR/logs"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to check if server is running
is_server_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the server
start_server() {
    if is_server_running; then
        print_warning "Development server is already running (PID: $(cat $PID_FILE))"
        return 0
    fi

    print_status "Starting SSL Certificate Management System development server..."
    
    cd "$BACKEND_DIR"
    
    # Check if dependencies are installed
    if [ \! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Start the server in background
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    local server_pid=$\!
    
    # Save PID
    echo "$server_pid" > "$PID_FILE"
    
    # Wait a moment and check if server started successfully
    sleep 5

    # Check if the process is still running
    if ps -p "$server_pid" > /dev/null 2>&1; then
        print_success "Development server started successfully\!"
        print_success "PID: $server_pid"
        print_success "Port: $PORT"
        print_success "Environment: $NODE_ENV"
        print_success "Health check: http://localhost:$PORT/health"
        print_success "API docs: http://localhost:$PORT/api"
        print_status "Log file: $LOG_FILE"
        print_status "Use './scripts/dev-server.sh stop' to stop the server"
    else
        print_error "Failed to start development server"
        print_error "Check the log file: $LOG_FILE"
        return 1
    fi
}

# Function to stop the server
stop_server() {
    if \! is_server_running; then
        print_warning "Development server is not running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    print_status "Stopping development server (PID: $pid)..."
    
    # Try graceful shutdown first
    kill -TERM "$pid" 2>/dev/null || true
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        print_warning "Forcing server shutdown..."
        kill -KILL "$pid" 2>/dev/null || true
    fi
    
    rm -f "$PID_FILE"
    print_success "Development server stopped"
}

# Function to restart the server
restart_server() {
    print_status "Restarting development server..."
    stop_server
    sleep 2
    start_server
}

# Function to show server status
show_status() {
    if is_server_running; then
        local pid=$(cat "$PID_FILE")
        print_success "Development server is running (PID: $pid)"
        print_status "Port: $PORT"
        print_status "Environment: $NODE_ENV"
        print_status "Health check: http://localhost:$PORT/health"
        
        # Test health endpoint
        if command -v curl >/dev/null 2>&1; then
            print_status "Testing health endpoint..."
            if curl -s -f "http://localhost:$PORT/health" >/dev/null; then
                print_success "Health check passed ✓"
            else
                print_error "Health check failed ✗"
            fi
        fi
    else
        print_warning "Development server is not running"
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        print_status "Showing development server logs (last 50 lines):"
        echo "----------------------------------------"
        tail -n 50 "$LOG_FILE"
        echo "----------------------------------------"
        print_status "Use 'tail -f $LOG_FILE' to follow logs in real-time"
    else
        print_warning "Log file not found: $LOG_FILE"
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the development server"
        echo "  stop    - Stop the development server"
        echo "  restart - Restart the development server"
        echo "  status  - Show server status and health"
        echo "  logs    - Show recent server logs"
        exit 1
        ;;
esac
