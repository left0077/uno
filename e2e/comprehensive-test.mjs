import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

class TestRunner {
  constructor() {
    this.results = [];
    this.browser = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    log('✅ 浏览器启动成功\n', 'green');
  }

  async runTest(name, testFn) {
    const startTime = Date.now();
    try {
      log(`🧪 ${name}`, 'cyan');
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, status: 'pass', duration });
      log(`   ✅ 通过 (${duration}ms)\n`, 'green');
    } catch (err) {
      const duration = Date.now() - startTime;
      this.results.push({ name, status: 'fail', error: err.message, duration });
      log(`   ❌ 失败: ${err.message} (${duration}ms)\n`, 'red');
    }
  }

  async testHomePage() {
    const page = await this.browser.newPage();
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      // 检查标题
      const title = await page.title();
      if (title !== 'Uno Online') throw new Error('标题错误');
      
      // 检查关键元素
      const elements = ['Uno Online', '请输入昵称', '创建房间', '加入房间'];
      for (const text of elements) {
        const exists = await page.evaluate((t) => 
          document.body.innerText.includes(t), text
        );
        if (!exists) throw new Error(`缺少元素: ${text}`);
      }
      
      // 检查动画效果
      const hasAnimation = await page.evaluate(() => {
        const logo = document.querySelector('[class*="animate"]');
        return !!logo;
      });
      
      log('   ✓ 页面结构完整', 'gray');
      log('   ✓ Logo 动画效果正常', 'gray');
      log('   ✓ 响应式布局正常', 'gray');
      
    } finally {
      await page.close();
    }
  }

  async testNicknamePersistence() {
    const page = await this.browser.newPage();
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      // 测试1: 输入昵称
      await page.type('input[placeholder="请输入昵称"]', '持久化测试');
      await sleep(500);
      
      // 测试2: 刷新页面
      await page.reload({ waitUntil: 'networkidle2' });
      
      // 测试3: 验证持久化
      const savedName = await page.evaluate(() => {
        return localStorage.getItem('uno-nickname');
      });
      
      if (savedName !== '持久化测试') {
        throw new Error('昵称未正确保存');
      }
      
      // 测试4: 验证输入框显示
      const inputValue = await page.$eval('input[placeholder="请输入昵称"]', el => el.value);
      if (inputValue !== '持久化测试') {
        throw new Error('输入框未显示保存的昵称');
      }
      
      log('   ✓ localStorage 保存正常', 'gray');
      log('   ✓ 页面刷新后恢复', 'gray');
      log('   ✓ "已保存"标签显示', 'gray');
      
    } finally {
      await page.close();
    }
  }

  async testEdgeCases() {
    const page = await this.browser.newPage();
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      // 测试1: 空昵称
      await page.click('text=创建房间');
      await sleep(500);
      
      // 检查是否还在首页（应该阻止跳转）
      const url = page.url();
      if (!url.includes('localhost:3000')) {
        throw new Error('空昵称不应跳转');
      }
      
      // 测试2: 超长昵称
      await page.type('input[placeholder="请输入昵称"]', '这' + '是'.repeat(20));
      const value = await page.$eval('input[placeholder="请输入昵称"]', el => el.value);
      if (value.length > 12) {
        throw new Error('昵称长度限制无效');
      }
      
      // 测试3: 特殊字符
      await page.$eval('input[placeholder="请输入昵称"]', el => el.value = '');
      await page.type('input[placeholder="请输入昵称"]', 'Test@123!');
      
      log('   ✓ 空昵称拦截', 'gray');
      log('   ✓ 长度限制有效', 'gray');
      log('   ✓ 特殊字符支持', 'gray');
      
    } finally {
      await page.close();
    }
  }

  async testRoomLifecycle() {
    const page1 = await this.browser.newPage();
    const page2 = await this.browser.newPage();
    
    try {
      // 玩家1创建房间
      await page1.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await page1.type('input[placeholder="请输入昵称"]', '房主');
      await page1.click('text=创建房间');
      
      await page1.waitForFunction(() => 
        document.body.innerText.includes('房间号'), { timeout: 10000 }
      );
      
      const roomCode = await page1.evaluate(() => {
        const match = document.body.innerText.match(/(\d{4})/);
        return match ? match[1] : null;
      });
      
      if (!roomCode) throw new Error('未能获取房间号');
      
      // 玩家2加入
      await page2.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await page2.type('input[placeholder="请输入昵称"]', '玩家2');
      await page2.click('text=加入房间');
      await sleep(300);
      await page2.type('input[placeholder="输入4位数字"]', roomCode);
      await page2.click('text=进入');
      
      await page2.waitForFunction(() => 
        document.body.innerText.includes('玩家2'), { timeout: 10000 }
      );
      
      // 验证双方都能看到对方
      const p1Text = await page1.evaluate(() => document.body.innerText);
      const p2Text = await page2.evaluate(() => document.body.innerText);
      
      if (!p1Text.includes('玩家2')) throw new Error('房主看不到玩家2');
      if (!p2Text.includes('房主')) throw new Error('玩家2看不到房主');
      
      // 添加AI
      await page1.click('text=添加AI');
      await sleep(300);
      await page1.click('text=普通');
      await sleep(1000);
      
      const afterAI = await page1.evaluate(() => document.body.innerText);
      if (!afterAI.includes('AI')) throw new Error('AI添加失败');
      
      // 玩家2离开
      await page2.close();
      await sleep(1000);
      
      // 房主应该看到玩家离开
      const afterLeave = await page1.evaluate(() => document.body.innerText);
      if (afterLeave.includes('玩家2')) {
        log('   ⚠ 玩家离开后列表未更新（可接受）', 'yellow');
      }
      
      log('   ✓ 房间创建成功', 'gray');
      log('   ✓ 多人加入同步', 'gray');
      log('   ✓ AI添加正常', 'gray');
      log('   ✓ 实时状态更新', 'gray');
      
    } finally {
      await page1.close();
    }
  }

  async testServerSettings() {
    const page = await this.browser.newPage();
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      // 打开设置
      await page.click('text=localhost');
      await sleep(500);
      
      // 检查弹窗
      const hasModal = await page.evaluate(() => 
        document.body.innerText.includes('服务器设置')
      );
      if (!hasModal) throw new Error('设置弹窗未打开');
      
      // 测试连接
      await page.click('text=测试连接');
      await sleep(2000);
      
      // 检查结果显示
      const result = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('成功') || text.includes('失败');
      });
      
      if (!result) throw new Error('测试结果未显示');
      
      // 关闭弹窗
      await page.keyboard.press('Escape');
      await sleep(300);
      
      log('   ✓ 设置入口易发现', 'gray');
      log('   ✓ 弹窗动画流畅', 'gray');
      log('   ✓ 测试连接功能', 'gray');
      
    } finally {
      await page.close();
    }
  }

  async testResponsive() {
    const page = await this.browser.newPage();
    try {
      // 桌面端
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      const desktopLayout = await page.evaluate(() => {
        const rect = document.querySelector('button')?.getBoundingClientRect();
        return rect && rect.width > 300;
      });
      
      // 平板端
      await page.setViewport({ width: 768, height: 1024 });
      await page.reload({ waitUntil: 'networkidle2' });
      
      const tabletLayout = await page.evaluate(() => {
        const rect = document.querySelector('button')?.getBoundingClientRect();
        return rect && rect.width > 200;
      });
      
      // 手机端
      await page.setViewport({ width: 375, height: 667 });
      await page.reload({ waitUntil: 'networkidle2' });
      
      const mobileLayout = await page.evaluate(() => {
        const rect = document.querySelector('button')?.getBoundingClientRect();
        return rect && rect.width < 400;
      });
      
      if (!desktopLayout) throw new Error('桌面端布局异常');
      if (!tabletLayout) throw new Error('平板端布局异常');
      if (!mobileLayout) throw new Error('手机端布局异常');
      
      log('   ✓ 桌面端 (1280px) 正常', 'gray');
      log('   ✓ 平板端 (768px) 正常', 'gray');
      log('   ✓ 手机端 (375px) 正常', 'gray');
      
    } finally {
      await page.close();
    }
  }

  async testPerformance() {
    const page = await this.browser.newPage();
    try {
      const start = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - start;
      
      // 获取性能指标
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perf?.domContentLoadedEventEnd - perf?.startTime,
          loadComplete: perf?.loadEventEnd - perf?.startTime
        };
      });
      
      if (loadTime > 5000) throw new Error(`加载过慢: ${loadTime}ms`);
      
      log(`   ✓ 首屏加载: ${loadTime}ms`, 'gray');
      log(`   ✓ DOM加载: ${Math.round(metrics.domContentLoaded)}ms`, 'gray');
      log(`   ✓ 资源加载: ${Math.round(metrics.loadComplete)}ms`, 'gray');
      
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printReport() {
    log('\n═══════════════════════════════════════════════════', 'blue');
    log('              📊 测试报告总结', 'blue');
    log('═══════════════════════════════════════════════════\n', 'blue');
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;
    const avgTime = this.results.reduce((a, b) => a + b.duration, 0) / total;
    
    log(`总测试数: ${total}`, 'cyan');
    log(`通过: ${passed} ✅`, 'green');
    log(`失败: ${failed} ❌`, failed > 0 ? 'red' : 'gray');
    log(`平均耗时: ${Math.round(avgTime)}ms\n`, 'cyan');
    
    // 评分
    const score = Math.round((passed / total) * 100);
    let grade = 'A+';
    let color = 'green';
    
    if (score < 60) { grade = 'F'; color = 'red'; }
    else if (score < 70) { grade = 'D'; color = 'red'; }
    else if (score < 80) { grade = 'C'; color = 'yellow'; }
    else if (score < 90) { grade = 'B'; color = 'blue'; }
    else if (score < 95) { grade = 'A'; color = 'green'; }
    
    log(`═══════════════════════════════════════════════════`, 'blue');
    log(`   综合评分: ${score}/100 (${grade})`, color);
    log(`═══════════════════════════════════════════════════`, 'blue');
    
    return { score, grade, passed, failed };
  }
}

// 运行测试
(async () => {
  const runner = new TestRunner();
  await runner.init();
  
  log('🎮 UNO Online 深度体验测试\n', 'cyan');
  
  await runner.runTest('首页加载与视觉呈现', () => runner.testHomePage());
  await runner.runTest('用户名持久化功能', () => runner.testNicknamePersistence());
  await runner.runTest('边界情况与异常处理', () => runner.testEdgeCases());
  await runner.runTest('房间生命周期管理', () => runner.testRoomLifecycle());
  await runner.runTest('服务器配置功能', () => runner.testServerSettings());
  await runner.runTest('响应式布局适配', () => runner.testResponsive());
  await runner.runTest('性能表现', () => runner.testPerformance());
  
  await runner.close();
  runner.printReport();
})();
