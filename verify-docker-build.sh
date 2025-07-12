#!/bin/bash

# Docker build verification script
set -e

echo "🔍 Verifying Docker production build..."

# Check if required build files exist
echo "1. Checking build files..."
if [ -f "dist/production.js" ]; then
    echo "  ✅ Production server: $(du -h dist/production.js | cut -f1)"
else
    echo "  ❌ Production server missing - run build first"
    exit 1
fi

if [ -f "server/utils.ts" ]; then
    echo "  ✅ Utility functions: server/utils.ts"
else
    echo "  ❌ Utility functions missing"
    exit 1
fi

# Check if Vite is excluded from production bundle
echo "2. Checking Vite exclusions..."
if grep -q "vite\|@replit.*vite" dist/production.js; then
    echo "  ❌ Vite dependencies found in production bundle"
    exit 1
else
    echo "  ✅ No Vite dependencies in production bundle"
fi

# Check Docker configuration
echo "3. Checking Docker configuration..."
if [ -f "Dockerfile" ]; then
    echo "  ✅ Dockerfile exists"
    if grep -q "node dist/production.js" Dockerfile; then
        echo "  ✅ Dockerfile uses production server"
    else
        echo "  ❌ Dockerfile not configured for production server"
        exit 1
    fi
else
    echo "  ❌ Dockerfile missing"
    exit 1
fi

# Check if Docker can build (dry run)
echo "4. Testing Docker build (dry run)..."
docker build --no-cache -t peggwatch-test . > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Docker build successful"
    docker rmi peggwatch-test > /dev/null 2>&1
else
    echo "  ❌ Docker build failed"
    exit 1
fi

echo ""
echo "🎉 Docker production build verification PASSED!"
echo ""
echo "Ready for:"
echo "  - docker build -t your-username/peggwatch ."
echo "  - docker run -p 5000:5000 your-username/peggwatch"
echo "  - docker push your-username/peggwatch"