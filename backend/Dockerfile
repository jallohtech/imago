# Multi-stage build for production-ready Node.js application
FROM node:20-alpine AS base

# Install security updates and curl for health checks
RUN apk update && apk add --no-cache curl && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Development dependencies stage
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install security updates and curl for health checks
RUN apk update && apk add --no-cache curl && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port (changed from 3000 to 3001)
EXPOSE 3001

# Add health check (changed port from 3000 to 3001)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/main"]