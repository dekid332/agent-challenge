FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Nosana compatibility
RUN apk add --no-cache git curl dumb-init

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user for security (Nosana requirement)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S peggwatch -u 1001 -G nodejs

# Change ownership and set permissions
RUN chown -R peggwatch:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER peggwatch

# Expose port (Nosana requirement)
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check for Nosana platform
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]