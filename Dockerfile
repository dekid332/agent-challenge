FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Nosana compatibility
RUN apk add --no-cache git curl dumb-init

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies first (needed for build)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build the frontend
RUN NODE_ENV=production npx vite build --outDir dist/public --mode production

# Build the production server (no Vite dependency)
RUN npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/production.js --external:vite --external:@replit/vite-plugin-cartographer --external:@replit/vite-plugin-runtime-error-modal --external:@vitejs/plugin-react --external:@tailwindcss/vite

# Remove dev dependencies after build
RUN npm prune --omit=dev

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

# Start the application (production mode)
CMD ["node", "dist/production.js"]