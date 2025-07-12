// Quick test script for production build
import { spawn } from 'child_process';
import http from 'http';

console.log('🧪 Testing production build...');

// Test 1: Check if production server starts
console.log('1. Starting production server...');
const server = spawn('node', ['dist/production.js'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'pipe'
});

let serverOutput = '';
server.stdout.on('data', (data) => {
  serverOutput += data.toString();
  console.log(`   ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  console.error(`   Error: ${data.toString().trim()}`);
});

// Test 2: Check if server responds to health check
setTimeout(() => {
  console.log('2. Testing health endpoint...');
  const healthRequest = http.get('http://localhost:5000/api/health', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Response: ${data}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ Health check passed');
      } else {
        console.log('   ❌ Health check failed');
      }
      
      server.kill('SIGTERM');
    });
  });
  
  healthRequest.on('error', (err) => {
    console.log(`   ❌ Health check error: ${err.message}`);
    server.kill('SIGTERM');
  });
}, 3000);

// Test 3: Check if server serves static files
setTimeout(() => {
  console.log('3. Testing static file serving...');
  const staticRequest = http.get('http://localhost:5000/', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      
      if (res.statusCode === 200 && data.includes('<html')) {
        console.log('   ✅ Static file serving works');
      } else {
        console.log('   ❌ Static file serving failed');
      }
    });
  });
  
  staticRequest.on('error', (err) => {
    console.log(`   ❌ Static file error: ${err.message}`);
  });
}, 5000);

// Cleanup after 8 seconds
setTimeout(() => {
  console.log('4. Test completed - shutting down server...');
  server.kill('SIGTERM');
  
  setTimeout(() => {
    if (serverOutput.includes('serving on port 5000')) {
      console.log('✅ Production build test PASSED');
    } else {
      console.log('❌ Production build test FAILED');
    }
    process.exit(0);
  }, 1000);
}, 8000);

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});