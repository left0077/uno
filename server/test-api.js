#!/usr/bin/env node
/**
 * API 集成测试
 * 测试后端API是否正常工作
 */

import http from 'http';

const BASE_URL = 'localhost';
const PORT = 3001;

// 简单的HTTP请求工具
function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 测试套件
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// ===== 测试用例 =====

// 测试1: 健康检查
test('GET /health - 健康检查', async () => {
  const res = await request('/health');
  
  if (res.status !== 200) {
    throw new Error(`期望状态码200，实际${res.status}`);
  }
  
  if (res.data.status !== 'ok') {
    throw new Error(`期望status为ok，实际${res.data.status}`);
  }
  
  if (!res.data.timestamp) {
    throw new Error('缺少timestamp字段');
  }
  
  return '服务器运行正常';
});

// 测试2: 获取不存在的房间
test('GET /api/room/9999 - 获取不存在的房间', async () => {
  const res = await request('/api/room/9999');
  
  if (res.status !== 404) {
    throw new Error(`期望状态码404，实际${res.status}`);
  }
  
  if (!res.data.error) {
    throw new Error('期望返回错误信息');
  }
  
  return '正确返回404错误';
});

// 测试3: Socket.IO 连接（模拟）
test('Socket.IO 连接测试 - 检查端口是否监听', async () => {
  try {
    const res = await request('/health');
    if (res.status === 200) {
      return 'Socket.IO 端口正在监听';
    }
  } catch (err) {
    throw new Error('无法连接到服务器: ' + err.message);
  }
});

// 测试4: 检查响应头
test('响应头检查 - CORS配置', async () => {
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: '/health',
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      if (corsHeader) {
        resolve(`CORS已配置: ${corsHeader}`);
      } else {
        reject(new Error('CORS未配置'));
      }
    });
    
    req.on('error', (err) => reject(err));
    req.end();
  });
});

// 测试5: 错误处理
test('错误处理 - 访问不存在的路径', async () => {
  const res = await request('/not-found-path');
  
  // 应该返回404或重定向到index.html（SPA行为）
  if (res.status !== 404 && res.status !== 200) {
    throw new Error(`期望状态码404或200，实际${res.status}`);
  }
  
  return `返回状态码 ${res.status}`;
});

// ===== 运行测试 =====

async function runTests() {
  console.log('🧪 Uno Online API 集成测试\n');
  console.log('='.repeat(60));
  console.log(`测试目标: http://${BASE_URL}:${PORT}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, fn } of tests) {
    try {
      const result = await fn();
      console.log(`✅ ${name}`);
      if (result) {
        console.log(`   ${result}`);
      }
      passed++;
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   错误: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总计: ${tests.length} 个测试`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.log('\n⚠️  部分测试失败，请检查服务器是否运行:');
    console.log('   cd server && npm run dev');
    process.exit(1);
  } else {
    console.log('\n✨ 所有API测试通过！');
    process.exit(0);
  }
}

// 检查服务器是否运行
console.log('🔍 检查服务器状态...\n');

request('/health')
  .then(() => {
    console.log('✅ 服务器正在运行\n');
    runTests();
  })
  .catch((err) => {
    console.log('❌ 无法连接到服务器');
    console.log(`   错误: ${err.message}\n`);
    console.log('请先在另一个终端启动服务器:');
    console.log('   cd server && npm run dev\n');
    process.exit(1);
  });
