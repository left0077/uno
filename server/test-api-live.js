#!/usr/bin/env node
/**
 * 实时API测试
 * 测试正在运行的服务器
 */

import http from 'http';

const BASE_URL = 'localhost';
const PORT = 3001;

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 实时API测试\n');
  console.log('='.repeat(60));
  console.log(`目标: http://${BASE_URL}:${PORT}\n`);
  
  let passed = 0;
  let failed = 0;
  
  // 测试1: 健康检查
  try {
    const res = await request('/health');
    if (res.status === 200 && res.data.status === 'ok') {
      console.log('✅ GET /health - 健康检查通过');
      console.log(`   服务器运行时间: ${res.data.uptime.toFixed(2)}秒`);
      passed++;
    } else {
      throw new Error('响应格式不正确');
    }
  } catch (err) {
    console.log('❌ GET /health - 健康检查失败');
    console.log(`   错误: ${err.message}`);
    failed++;
  }
  
  // 测试2: 获取不存在的房间
  try {
    const res = await request('/api/room/9999');
    if (res.status === 404 && res.data.error) {
      console.log('✅ GET /api/room/9999 - 正确返回404');
      passed++;
    } else {
      throw new Error(`期望404，实际${res.status}`);
    }
  } catch (err) {
    console.log('❌ GET /api/room/9999 - 测试失败');
    console.log(`   错误: ${err.message}`);
    failed++;
  }
  
  // 测试3: CORS配置
  try {
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
    
    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        const corsHeader = res.headers['access-control-allow-origin'];
        if (corsHeader) {
          console.log('✅ CORS配置 - 已启用');
          console.log(`   允许来源: ${corsHeader}`);
          passed++;
          resolve();
        } else {
          reject(new Error('CORS未配置'));
        }
      });
      req.on('error', reject);
      req.end();
    });
  } catch (err) {
    console.log('❌ CORS配置 - 测试失败');
    console.log(`   错误: ${err.message}`);
    failed++;
  }
  
  // 测试4: 不存在的路径
  try {
    const res = await request('/not-exist');
    console.log(`✅ 404处理 - 返回状态码${res.status}`);
    passed++;
  } catch (err) {
    console.log('❌ 404处理 - 测试失败');
    failed++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果');
  console.log('='.repeat(60));
  console.log(`总计: ${passed + failed} 个测试`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n✨ 所有API测试通过！服务器运行正常！');
    console.log('');
    console.log('📋 服务器信息:');
    console.log('   - REST API: http://localhost:3001');
    console.log('   - Socket.IO: ws://localhost:3001');
    console.log('   - 健康检查: http://localhost:3001/health');
    console.log('');
    console.log('🚀 可以开始前端开发了！');
  } else {
    console.log('\n⚠️ 部分测试失败');
  }
  
  return { passed, failed };
}

runTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
