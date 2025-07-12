#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 Testing Docker-ready production build...');

// Step 1: Clean build directory
console.log('1. Cleaning build directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Step 2: Build frontend (with timeout and better error handling)
console.log('2. Building frontend...');
try {
  execSync('npx vite build --outDir dist/public', { 
    stdio: 'inherit',
    timeout: 300000, // 5 minutes timeout
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 3: Build backend server
console.log('3. Building backend server...');
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:vite', { 
    stdio: 'inherit' 
  });
  console.log('✅ Backend server build completed');
} catch (error) {
  console.error('❌ Backend server build failed:', error.message);
  process.exit(1);
}

// Step 4: Build production server
console.log('4. Building production server...');
try {
  execSync('npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/production.js --external:vite', { 
    stdio: 'inherit' 
  });
  console.log('✅ Production server build completed');
} catch (error) {
  console.error('❌ Production server build failed:', error.message);
  process.exit(1);
}

// Step 5: Verify all required files exist
console.log('5. Verifying build artifacts...');
const requiredFiles = [
  'dist/index.js',
  'dist/production.js',
  'dist/public/index.html',
  'dist/public/assets'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Step 6: Check file sizes
console.log('6. Checking build sizes...');
try {
  const stats = fs.statSync('dist/production.js');
  console.log(`  Production server: ${Math.round(stats.size / 1024)}KB`);
  
  const htmlStats = fs.statSync('dist/public/index.html');
  console.log(`  Frontend HTML: ${Math.round(htmlStats.size / 1024)}KB`);
  
  const assetsDir = fs.readdirSync('dist/public/assets');
  console.log(`  Frontend assets: ${assetsDir.length} files`);
} catch (error) {
  console.log('  ⚠️  Could not check file sizes:', error.message);
}

if (allFilesExist) {
  console.log('✅ All build artifacts present');
  console.log('🎉 Production build ready for Docker deployment!');
  console.log('');
  console.log('Next steps:');
  console.log('  docker build -t your-name/peggwatch .');
  console.log('  docker run -p 5000:5000 your-name/peggwatch');
} else {
  console.log('❌ Build incomplete - missing required files');
  process.exit(1);
}