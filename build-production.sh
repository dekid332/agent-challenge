#!/bin/bash

# Production build script for PEGG WATCH
# This script creates a Docker-ready production build

set -e

echo "🔧 Building PEGG WATCH for production..."

# Step 1: Clean existing build
echo "1. Cleaning build directory..."
rm -rf dist/

# Step 2: Build frontend with optimizations
echo "2. Building frontend (this may take a few minutes)..."
NODE_ENV=production npx vite build --outDir dist/public --mode production

# Step 3: Build backend servers
echo "3. Building backend servers..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:vite
npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/production.js --external:vite

# Step 4: Verify build structure
echo "4. Verifying build structure..."
if [ -f "dist/index.js" ]; then
    echo "  ✅ Backend server: $(du -h dist/index.js | cut -f1)"
else
    echo "  ❌ Backend server missing"
    exit 1
fi

if [ -f "dist/production.js" ]; then
    echo "  ✅ Production server: $(du -h dist/production.js | cut -f1)"
else
    echo "  ❌ Production server missing"
    exit 1
fi

if [ -f "dist/public/index.html" ]; then
    echo "  ✅ Frontend HTML: $(du -h dist/public/index.html | cut -f1)"
else
    echo "  ❌ Frontend HTML missing"
    exit 1
fi

if [ -d "dist/public/assets" ]; then
    echo "  ✅ Frontend assets: $(ls dist/public/assets | wc -l) files"
else
    echo "  ❌ Frontend assets missing"
    exit 1
fi

# Step 5: Create a test script
echo "5. Creating production test script..."
cat > dist/test-production.js << 'EOF'
// Test script for production build
import { spawn } from 'child_process';

console.log('🚀 Testing production server...');

const server = spawn('node', ['production.js'], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit'
});

// Test for 10 seconds
setTimeout(() => {
  console.log('✅ Production server test completed');
  server.kill('SIGTERM');
}, 10000);

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
EOF

echo "✅ Production build completed successfully!"
echo ""
echo "Build summary:"
echo "  - Frontend: dist/public/"
echo "  - Backend: dist/index.js"
echo "  - Production: dist/production.js"
echo ""
echo "Docker commands:"
echo "  docker build -t peggwatch ."
echo "  docker run -p 5000:5000 peggwatch"
echo ""
echo "Local test:"
echo "  cd dist && node test-production.js"