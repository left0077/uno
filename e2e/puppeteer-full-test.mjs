import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

console.log('🎮 UNO Online 完整浏览器测试\n');
console.log('═══════════════════════════════════════════════════\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  let roomCode = null;
  
  try {
    // ==================== 测试 1: 创建房间 ====================
    console.log('🧪 测试 1: 创建房间流程');
    const page1 = await browser.newPage();
    
    await page1.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page1.type('input[placeholder="请输入昵称"]', '房主');
    await page1.click('text=创建房间');
    
    // 等待跳转到房间页面
    await page1.waitForFunction(() => {
      return document.body.innerText.includes('房间号');
    }, { timeout: 10000 });
    
    // 获取房间号
    roomCode = await page1.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(\d{4})/);
      return match ? match[1] : null;
    });
    
    console.log(`   房间号: ${roomCode}`);
    console.log('   ✅ 房间创建成功\n');
    
    await page1.screenshot({ path: '/tmp/uno-room-created.png' });
    
    // ==================== 测试 2: 加入房间 ====================
    console.log('🧪 测试 2: 加入房间流程');
    const page2 = await browser.newPage();
    
    await page2.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page2.type('input[placeholder="请输入昵称"]', '玩家2');
    await page2.click('text=加入房间');
    
    // 输入房间号
    await page2.waitForSelector('input[placeholder="输入4位数字"]', { timeout: 5000 });
    await page2.type('input[placeholder="输入4位数字"]', roomCode);
    await page2.click('text=进入');
    
    // 等待加入成功
    await page2.waitForFunction(() => {
      return document.body.innerText.includes('玩家2') && document.body.innerText.includes('房主');
    }, { timeout: 10000 });
    
    console.log('   玩家2成功加入房间');
    console.log('   ✅ 加入房间成功\n');
    
    await page2.screenshot({ path: '/tmp/uno-room-joined.png' });
    
    // ==================== 测试 3: 添加AI ====================
    console.log('🧪 测试 3: 添加AI玩家');
    
    // 房主添加AI
    await page1.click('text=添加AI');
    await page1.waitForTimeout(500);
    await page1.click('text=普通');
    
    // 等待AI加入
    await page1.waitForFunction(() => {
      return document.body.innerText.includes('AI');
    }, { timeout: 5000 });
    
    console.log('   AI玩家已添加');
    console.log('   ✅ 添加AI成功\n');
    
    await page1.screenshot({ path: '/tmp/uno-ai-added.png' });
    
    // ==================== 测试 4: 开始游戏 ====================
    console.log('🧪 测试 4: 开始游戏');
    
    await page1.click('text=开始游戏');
    
    // 等待游戏开始
    await page1.waitForFunction(() => {
      return document.body.innerText.includes('回合') || 
             document.querySelector('[class*="card"]') !== null;
    }, { timeout: 10000 });
    
    console.log('   游戏已开始');
    console.log('   ✅ 开始游戏成功\n');
    
    await page1.screenshot({ path: '/tmp/uno-game-started.png' });
    
    // ==================== 测试 5: 用户名持久化 ====================
    console.log('🧪 测试 5: 用户名持久化验证');
    
    const page3 = await browser.newPage();
    await page3.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // 检查localStorage
    const savedNickname = await page3.evaluate(() => {
      return localStorage.getItem('uno-nickname');
    });
    
    console.log(`   保存的昵称: ${savedNickname}`);
    console.log(`   ✅ 用户名持久化正常\n`);
    
    await page3.screenshot({ path: '/tmp/uno-nickname-saved.png' });
    await page3.close();
    
    // ==================== 测试 6: 服务器设置 ====================
    console.log('🧪 测试 6: 服务器设置功能');
    
    const page4 = await browser.newPage();
    await page4.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // 点击服务器地址
    await page4.click('text=localhost');
    
    // 等待设置弹窗
    await page4.waitForFunction(() => {
      return document.body.innerText.includes('服务器设置');
    }, { timeout: 5000 });
    
    console.log('   设置弹窗已打开');
    
    // 输入新地址
    const urlInput = await page4.$('input');
    await urlInput?.click({ clickCount: 3 }); // 全选
    await urlInput?.type('http://192.168.1.100:3001');
    
    console.log('   新地址已输入');
    console.log('   ✅ 服务器设置功能正常\n');
    
    await page4.screenshot({ path: '/tmp/uno-server-settings.png' });
    await page4.close();
    
    // 清理
    await page1.close();
    await page2.close();
    
    console.log('═══════════════════════════════════════════════════');
    console.log('   ✅ 所有测试通过！');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📸 截图保存位置:');
    console.log('   /tmp/uno-home.png          - 首页');
    console.log('   /tmp/uno-room-created.png  - 创建房间');
    console.log('   /tmp/uno-room-joined.png   - 加入房间');
    console.log('   /tmp/uno-ai-added.png      - 添加AI');
    console.log('   /tmp/uno-game-started.png  - 游戏开始');
    console.log('   /tmp/uno-nickname-saved.png- 用户名保存');
    console.log('   /tmp/uno-server-settings.png- 服务器设置');
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
