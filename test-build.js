#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Testing production build process...');

// Step 1: Clean any existing build
console.log('1. Cleaning existing build...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Step 2: Build frontend
console.log('2. Building frontend...');
try {
  execSync('npx vite build --outDir dist/public --mode production', { 
    stdio: 'inherit',
    timeout: 120000 // 2 minutes timeout
  });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 3: Build backend
console.log('3. Building backend...');
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { 
    stdio: 'inherit' 
  });
  console.log('✅ Backend build completed');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

// Step 4: Verify build structure
console.log('4. Verifying build structure...');
const expectedFiles = [
  'dist/index.js',
  'dist/public/index.html',
  'dist/public/assets'
];

let allFilesExist = true;
expectedFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('✅ Build structure verified');
} else {
  console.log('❌ Build structure incomplete');
  process.exit(1);
}

// Step 5: Test production server startup
console.log('5. Testing production server startup...');
try {
  const child = execSync('timeout 5 node dist/index.js', { 
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Production server started successfully');
} catch (error) {
  if (error.status === 124) {
    console.log('✅ Production server started (timeout reached as expected)');
  } else {
    console.error('❌ Production server failed:', error.message);
    process.exit(1);
  }
}

console.log('🎉 Build test completed successfully!');