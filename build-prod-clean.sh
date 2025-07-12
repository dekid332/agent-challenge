#!/bin/bash

# Clean production build script for Docker
set -e

echo "🔧 Building PEGG WATCH for Docker production..."

# Clean build directory
rm -rf dist/
mkdir -p dist/

# Build production server (no Vite dependency)
echo "1. Building production server..."
npx esbuild server/production.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/production.js \
  --external:vite \
  --external:@replit/vite-plugin-cartographer \
  --external:@replit/vite-plugin-runtime-error-modal \
  --external:@vitejs/plugin-react \
  --external:@tailwindcss/vite

# Check if production server was built successfully
if [ -f "dist/production.js" ]; then
  echo "  ✅ Production server built: $(du -h dist/production.js | cut -f1)"
else
  echo "  ❌ Production server build failed"
  exit 1
fi

# Build frontend (this may take a while)
echo "2. Building frontend..."
NODE_ENV=production npx vite build --outDir dist/public --mode production

# Check if frontend was built successfully
if [ -f "dist/public/index.html" ]; then
  echo "  ✅ Frontend HTML built: $(du -h dist/public/index.html | cut -f1)"
else
  echo "  ❌ Frontend HTML build failed"
  exit 1
fi

if [ -d "dist/public/assets" ]; then
  echo "  ✅ Frontend assets: $(ls dist/public/assets | wc -l) files"
else
  echo "  ❌ Frontend assets missing"
  exit 1
fi

echo "3. Verifying build structure..."
echo "  📁 dist/"
echo "    ├── production.js ($(du -h dist/production.js | cut -f1))"
echo "    └── public/"
echo "        ├── index.html ($(du -h dist/public/index.html | cut -f1))"
echo "        └── assets/ ($(ls dist/public/assets | wc -l) files)"

echo "✅ Docker production build completed successfully!"
echo ""
echo "Test with:"
echo "  cd dist && node production.js"
echo ""
echo "Docker build:"
echo "  docker build -t peggwatch ."
echo "  docker run -p 5000:5000 peggwatch"