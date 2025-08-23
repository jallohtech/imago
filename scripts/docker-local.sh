#!/bin/bash

# IMAGO Media Search - Local Development Script
# Backend: Docker container, Frontend: Local Node.js server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Function to check if Node.js is available
check_node() {
    if ! command -v node > /dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    print_success "Node.js $(node --version) is available"
}

# Function to check if npm is available
check_npm() {
    if ! command -v npm > /dev/null 2>&1; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    print_success "npm $(npm --version) is available"
}

# Function to install frontend dependencies
install_frontend_deps() {
    if [ ! -d "frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    else
        print_status "Frontend dependencies already installed"
    fi
}

# Function to start backend with Docker
start_backend() {
    print_status "Starting backend with Docker..."
    
    # Use docker-compose or docker compose based on availability
    if command -v docker-compose > /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    $COMPOSE_CMD up --build -d backend
    print_success "Backend started with Docker"
}

# Function to start frontend with npm
start_frontend() {
    print_status "Starting frontend with npm..."
    cd frontend
    
    # Create .env.local if it doesn't exist
    if [ ! -f ".env.local" ]; then
        print_status "Creating frontend .env.local file..."
        cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=IMAGO Media Search
EOF
        print_success "Created .env.local file"
    fi
    
    # Start frontend in background
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    print_success "Frontend started (PID: $FRONTEND_PID)"
    print_status "Frontend logs: tail -f frontend.log"
}

# Function to stop backend
stop_backend() {
    print_status "Stopping backend..."
    
    if command -v docker-compose > /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    $COMPOSE_CMD down
    print_success "Backend stopped"
}

# Function to stop frontend
stop_frontend() {
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        print_status "Stopping frontend (PID: $FRONTEND_PID)..."
        
        # Kill the process and its children
        pkill -P $FRONTEND_PID > /dev/null 2>&1 || true
        kill $FRONTEND_PID > /dev/null 2>&1 || true
        
        rm -f frontend.pid
        print_success "Frontend stopped"
    else
        print_warning "Frontend PID file not found, trying to kill any Node.js dev processes..."
        pkill -f "next dev" > /dev/null 2>&1 || true
        print_success "Attempted to stop frontend processes"
    fi
}

# Function to build and start services
start_services() {
    check_node
    check_npm
    install_frontend_deps
    start_backend
    start_frontend
    
    print_success "Services started successfully"
    print_status "Backend running at: http://localhost:3001"
    print_status "Frontend running at: http://localhost:3000"
}

# Function to stop services
stop_services() {
    stop_frontend
    stop_backend
}

# Function to show logs
show_logs() {
    if [ "$1" = "backend" ]; then
        print_status "Showing backend logs..."
        if command -v docker-compose > /dev/null 2>&1; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        $COMPOSE_CMD logs -f backend
    elif [ "$1" = "frontend" ]; then
        print_status "Showing frontend logs..."
        if [ -f "frontend.log" ]; then
            tail -f frontend.log
        else
            print_error "Frontend log file not found. Is the frontend running?"
        fi
    else
        print_status "Showing logs for all services..."
        print_status "Backend logs:"
        if command -v docker-compose > /dev/null 2>&1; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        $COMPOSE_CMD logs --tail=20 backend
        print_status ""
        print_status "Frontend logs (last 20 lines):"
        if [ -f "frontend.log" ]; then
            tail -20 frontend.log
        else
            print_error "Frontend log file not found"
        fi
        print_status ""
        print_status "To follow logs in real-time:"
        print_status "  Backend:  $0 logs backend"
        print_status "  Frontend: $0 logs frontend"
    fi
}

# Function to run health checks
health_check() {
    print_status "Running health checks..."
    
    # Check backend health
    print_status "Checking backend health..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            print_success "Backend is healthy"
            break
        else
            if [ $i -eq 30 ]; then
                print_error "Backend health check failed after 30 attempts"
                return 1
            fi
            print_status "Waiting for backend to be ready... (attempt $i/30)"
            sleep 2
        fi
    done
    
    # Check frontend health
    print_status "Checking frontend health..."
    for i in {1..30}; do
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            print_success "Frontend is healthy"
            break
        else
            if [ $i -eq 30 ]; then
                print_error "Frontend health check failed after 30 attempts"
                return 1
            fi
            print_status "Waiting for frontend to be ready... (attempt $i/30)"
            sleep 2
        fi
    done
    
    print_success "All services are healthy!"
}

# Function to clean up Docker resources
cleanup() {
    print_status "Cleaning up resources..."
    
    stop_services
    
    # Clean up Docker resources
    if command -v docker-compose > /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    $COMPOSE_CMD down --volumes --remove-orphans
    docker system prune -f
    
    # Clean up frontend files
    rm -f frontend.log frontend.pid
    
    print_success "Cleanup completed"
}

# Function to show service status
status() {
    print_status "Service status:"
    
    # Backend status
    if command -v docker-compose > /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    print_status "Backend (Docker):"
    $COMPOSE_CMD ps
    
    # Frontend status
    print_status ""
    print_status "Frontend (Node.js):"
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_success "Frontend running (PID: $FRONTEND_PID)"
        else
            print_error "Frontend PID file exists but process not running"
        fi
    else
        print_warning "Frontend not started with this script"
    fi
}

# Function to restart services
restart() {
    print_status "Restarting services..."
    stop_services
    sleep 2
    start_services
}

# Function to show help
show_help() {
    echo "IMAGO Media Search - Local Development Script"
    echo "Backend: Docker container, Frontend: Local Node.js server"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Build and start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  logs      Show logs for all services"
    echo "  logs [SERVICE]  Show logs for specific service (backend/frontend)"
    echo "  health    Run health checks"
    echo "  cleanup   Stop services and clean up resources"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start all services"
    echo "  $0 logs backend         # Show backend logs"
    echo "  $0 logs frontend        # Show frontend logs"
    echo "  $0 health               # Check if services are healthy"
    echo ""
    echo "Prerequisites:"
    echo "  - Docker and Docker Compose"
    echo "  - Node.js 18+ and npm"
    echo ""
}

# Main script logic
main() {
    case "${1:-start}" in
        start)
            check_docker
            check_docker_compose
            start_services
            print_status "Waiting for services to be ready..."
            sleep 10
            health_check
            ;;
        stop)
            stop_services
            ;;
        restart)
            check_docker
            restart
            ;;
        status)
            status
            ;;
        logs)
            show_logs $2
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"