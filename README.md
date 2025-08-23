# IMAGO Media Search

A modern search application for IMAGO's extensive media collection, built with NestJS (backend) and Next.js (frontend).

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd imago-media-search
   ```

2. **Prerequisites:**
   - Docker and Docker Compose (for backend)
   - Node.js 18+ and npm (for frontend)

3. **Start development environment:**
   
   **On Linux/macOS:**
   ```bash
   ./scripts/docker-local.sh start
   ```
   
   **On Windows:**
   ```cmd
   scripts\docker-local.bat start
   ```

   This will:
   - Start the backend in a Docker container
   - Start the frontend with Node.js locally
   - Automatically install frontend dependencies
   - Create environment files if needed

4. **Access the applications:**
   - Frontend: http://localhost:3000 (Next.js dev server)
   - Backend API: http://localhost:3001 (Docker container)
   - Backend Health Check: http://localhost:3001/health
   - API Documentation: http://localhost:3001/api (Swagger)

### Docker Script Commands

The Docker script provides several useful commands:

```bash
# Start all services
./scripts/docker-local.sh start

# Stop all services
./scripts/docker-local.sh stop

# Restart services
./scripts/docker-local.sh restart

# View service status
./scripts/docker-local.sh status

# View logs (all services)
./scripts/docker-local.sh logs

# View logs for specific service
./scripts/docker-local.sh logs backend
./scripts/docker-local.sh logs frontend

# Run health checks
./scripts/docker-local.sh health

# Clean up Docker resources
./scripts/docker-local.sh cleanup

# Show help
./scripts/docker-local.sh help
```

## Manual Development Setup

If you prefer to run services manually:

### Backend Setup (Docker)
```bash
cd backend
docker build -t imago-backend .
docker run -p 3001:3000 -e NODE_ENV=development -e ELASTICSEARCH_NODE=https://5.75.227.63:9200 -e ELASTICSEARCH_USERNAME=elastic -e ELASTICSEARCH_PASSWORD=rQQtbktwzFqAJS1h8YjP imago-backend
```

### Frontend Setup (Local Node.js)
```bash
cd frontend
npm install
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_APP_NAME=IMAGO Media Search
npm run dev
```

## Architecture

### Backend (NestJS)
- **Framework:** NestJS with TypeScript
- **Database:** Elasticsearch (IMAGO's instance)
- **Features:** 
  - Full-text search with faceted filtering
  - Advanced query sanitization
  - Comprehensive error handling
  - Health checks and monitoring
  - Swagger API documentation

### Frontend (Next.js)
- **Framework:** Next.js 15 with TypeScript
- **Styling:** Tailwind CSS
- **Features:**
  - Responsive design
  - Real-time search with pagination
  - Image optimization
  - Modern UI components

## Environment Variables

### Backend
```env
NODE_ENV=development
PORT=3000
ELASTICSEARCH_NODE=https://5.75.227.63:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=rQQtbktwzFqAJS1h8YjP
ELASTICSEARCH_INDEX=imago
BASE_IMAGE_URL=https://www.imago-images.de
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=IMAGO Media Search
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/search` - Search media items
- `GET /api/search/media/:id` - Get specific media item
- `GET /api/search/fields` - Get searchable fields info
- `GET /api` - Swagger documentation

## Testing

### Run all tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Linting and Type Checking
```bash
# Backend
cd backend
npm run lint
npx tsc --noEmit

# Frontend
cd frontend
npm run lint
npx tsc --noEmit
```

## Production Deployment

This application is designed for deployment on AWS:

- **Backend:** AWS Fargate (containerized)
- **Frontend:** AWS Amplify
- **CI/CD:** GitHub Actions

See [DEPLOYMENT.md](./.github/DEPLOYMENT.md) for detailed deployment instructions.

## Development

### Project Structure
```
├── backend/                 # NestJS API (Docker for production)
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── dto/            # Data transfer objects
│   │   └── types/          # TypeScript types
│   └── Dockerfile          # Production container
├── frontend/               # Next.js application (Amplify for production)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   └── .env.local         # Local environment (auto-created)
├── scripts/               # Development scripts
├── docker-compose.yml     # Backend Docker setup
└── .github/              # CI/CD workflows
```

### Key Features

#### Backend
- **Search Service:** Advanced Elasticsearch integration with query building
- **Data Processing:** Text cleaning and enhancement for better search results
- **Error Handling:** Comprehensive error handling with appropriate HTTP status codes
- **Security:** Query sanitization and input validation
- **Monitoring:** Health checks and structured logging

#### Frontend
- **Search Interface:** Real-time search with debouncing
- **Filtering:** Advanced filters for photographers, dates, and dimensions
- **Pagination:** Efficient pagination for large result sets
- **Image Handling:** Optimized image loading with Next.js Image component
- **Responsive Design:** Mobile-first responsive design

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.