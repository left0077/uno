import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log('🤖 测试机器人自动出牌功能\n');
console.log('='.repeat(60));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    // 1. 进入首页
    console.log('\n1️⃣  进入首页...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.type('input', '房主');
    console.log('   ✅ 输入昵称');
    
    // 2. 创建房间
    console.log('\n2️⃣  创建房间...');
    await page.click('text=创建房间');
    await page.waitForFunction(() => document.body.innerText.includes('房间号'), { timeout: 10000 });
    
    const roomCode = await page.evaluate(() => {
      const match = document.body.innerText.match(/(\d{4})/);
      return match ? match[1] : null;
    });
    console.log(`   房间号: ${roomCode}`);
    
    // 3. 添加机器人
    console.log('\n3️⃣  添加机器人...');
    await page.click('text=添加AI');
    await sleep(300);
    
    // 点击"机器人"按钮
    await page.click('text=机器人');
    await sleep(1000);
    
    // 检查是否显示"🤖 机器人"
    const hasBot = await page.evaluate(() => {
      return document.body.innerText.includes('🤖 机器人');
    });
    console.log(`   ${hasBot ? '✅' : '❌'} 机器人已添加`);
    
    // 4. 添加托管
    console.log('\n4️⃣  添加托管...');
    await page.click('text=添加AI');
    await sleep(300);
    
    // 点击"托管"按钮
    await page.click('text=托管');
    await sleep(1000);
    
    // 检查是否显示"🎮 托管"
    const hasHost = await page.evaluate(() => {
      return document.body.innerText.includes('🎮 托管');
    });
    console.log(`   ${hasHost ? '✅' : '❌'} 托管已添加`);
    
    // 截图 - 房间状态
    await page.screenshot({ path: '/tmp/bot-test-1-room.png' });
    
    // 5. 开始游戏
    console.log('\n5️⃣  开始游戏...');
    await page.click('text=开始游戏');
    await sleep(2000);
    console.log('   ✅ 游戏开始');
    
    // 6. 观察机器人自动出牌
    console.log('\n6️⃣  观察机器人自动出牌（观察10秒）...');
    console.log('   如果轮到机器人，它应该立即出牌，不需要等待倒计时');
    
    // 记录初始回合信息
    let initialTurn = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(.+)的回合/);
      return match ? match[1] : 'unknown';
    });
    console.log(`   初始回合: ${initialTurn}`);
    
    // 观察10秒，看是否有自动出牌
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      
      const currentInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        const turnMatch = text.match(/(.+)的回合/);
        const cardMatch = text.match(/手牌:\s*(\d+)张/);
        return {
          turn: turnMatch ? turnMatch[1] : 'unknown',
          handCount: cardMatch ? cardMatch[1] : '0'
        };
      });
      
      if (currentInfo.turn !== initialTurn) {
        console.log(`   🔄 回合切换: ${initialTurn} -> ${currentInfo.turn} (${i+1}秒)`);
        initialTurn = currentInfo.turn;
      }
    }
    
    // 截图 - 游戏状态
    await page.screenshot({ path: '/tmp/bot-test-2-game.png' });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！');
    console.log('='.repeat(60));
    console.log('\n📸 截图:');
    console.log('  /tmp/bot-test-1-room.png - 房间状态');
    console.log('  /tmp/bot-test-2-game.png - 游戏状态');
    
    await sleep(3000);
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
  } finally {
    await browser.close();
  }
})();
