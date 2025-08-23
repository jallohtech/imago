# Deployment Guide

This document outlines the deployment process for the IMAGO Media Search application using GitHub Actions, AWS Fargate (backend), and AWS Amplify (frontend).

## Prerequisites

### AWS Resources Required

1. **ECR Repository** for backend Docker images
2. **ECS Cluster** with Fargate capacity
3. **ECS Task Definition** for backend service
4. **ECS Service** running on the cluster
5. **AWS Amplify App** for frontend hosting
6. **IAM Roles** with appropriate permissions

### GitHub Secrets Required

Add these secrets to your GitHub repository settings:

```
AWS_ACCESS_KEY_ID          # AWS access key for deployments
AWS_SECRET_ACCESS_KEY      # AWS secret access key
AMPLIFY_APP_ID            # AWS Amplify application ID
NEXT_PUBLIC_API_URL       # Backend API URL for frontend
SNYK_TOKEN               # Optional: Snyk security scanning token
```

## Deployment Workflows

### 1. Continuous Integration (`ci.yml`)
- Triggers on push/PR to main branches
- Runs tests, linting, and builds for both backend and frontend
- Ensures code quality before deployment

### 2. Backend Deployment (`deploy-backend.yml`)
- Triggers on push to main branch when backend code changes
- Builds Docker image and pushes to ECR
- Updates ECS service with new image
- Deploys to AWS Fargate

### 3. Frontend Deployment (`deploy-frontend.yml`)
- Triggers on push to main branch when frontend code changes
- Builds Next.js application
- Deploys to AWS Amplify

### 4. Security Scanning (`security-scan.yml`)
- Runs weekly and on code changes
- Scans dependencies for vulnerabilities
- Scans Docker images with Trivy
- Uploads results to GitHub Security tab

## AWS Infrastructure Setup

### Backend (Fargate)

1. Create ECR repository:
   ```bash
   aws ecr create-repository --repository-name imago-media-search-backend
   ```

2. Create ECS cluster:
   ```bash
   aws ecs create-cluster --cluster-name imago-media-search-cluster --capacity-providers FARGATE
   ```

3. Create task definition (example):
   ```json
   {
     "family": "imago-media-search-backend-task",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "imago-media-search-backend",
         "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/imago-media-search-backend:latest",
         "portMappings": [{"containerPort": 3000}],
         "environment": [
           {"name": "NODE_ENV", "value": "production"},
           {"name": "PORT", "value": "3000"},
           {"name": "ELASTICSEARCH_NODE", "value": "https://5.75.227.63:9200"},
           {"name": "ELASTICSEARCH_USERNAME", "value": "elastic"},
           {"name": "ELASTICSEARCH_PASSWORD", "value": "rQQtbktwzFqAJS1h8YjP"}
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/imago-media-search-backend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

4. Create ECS service:
   ```bash
   aws ecs create-service \
     --cluster imago-media-search-cluster \
     --service-name imago-media-search-backend-service \
     --task-definition imago-media-search-backend-task \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
   ```

### Frontend (Amplify)

1. Create Amplify app:
   ```bash
   aws amplify create-app --name imago-media-search-frontend
   ```

2. Connect to GitHub repository and configure build settings in Amplify Console

## Environment Variables

### Backend
- `NODE_ENV=production`
- `PORT=3000`
- `ELASTICSEARCH_NODE=https://5.75.227.63:9200`
- `ELASTICSEARCH_USERNAME=elastic`
- `ELASTICSEARCH_PASSWORD=rQQtbktwzFqAJS1h8YjP`

### Frontend
- `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
- `NEXT_PUBLIC_APP_NAME=IMAGO Media Search`

## Monitoring and Health Checks

- Backend includes health check endpoint at `/health`
- Docker health checks configured for container monitoring
- ECS service health checks ensure service availability
- CloudWatch logs capture application logs

## Security Considerations

- Non-root user in Docker container
- Security scanning with Trivy and Snyk
- Dependency vulnerability checks
- AWS IAM roles with minimal required permissions
- Environment variables for sensitive configuration

## Manual Deployment

If needed, you can deploy manually:

### Backend
```bash
cd backend
docker build -t imago-backend .
docker tag imago-backend:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/imago-media-search-backend:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/imago-media-search-backend:latest
aws ecs update-service --cluster imago-media-search-cluster --service imago-media-search-backend-service --force-new-deployment
```

### Frontend
```bash
cd frontend
npm run build
# Upload to Amplify via console or CLI
```

## Troubleshooting

- Check GitHub Actions logs for deployment issues
- Monitor ECS service events for backend deployment problems
- Use Amplify console logs for frontend deployment issues
- Verify environment variables are set correctly
- Ensure AWS credentials have required permissions