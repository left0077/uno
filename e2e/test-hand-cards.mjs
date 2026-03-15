import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

console.log('🎮 测试手牌显示功能\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  
  // 1. 进入首页
  console.log('1️⃣  进入首页...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.type('input', '测试玩家');
  console.log('   ✅ 输入昵称');
  
  // 2. 创建房间
  console.log('2️⃣  创建房间...');
  await page.click('text=创建房间');
  await page.waitForFunction(() => 
    document.body.innerText.includes('房间号'), { timeout: 10000 }
  );
  console.log('   ✅ 房间创建成功');
  
  // 3. 添加AI
  console.log('3️⃣  添加AI...');
  await page.click('text=添加AI');
  await new Promise(r => setTimeout(r, 500));
  await page.click('text=普通');
  await new Promise(r => setTimeout(r, 1000));
  console.log('   ✅ AI添加成功');
  
  // 4. 开始游戏
  console.log('4️⃣  开始游戏...');
  await page.click('text=开始游戏');
  await new Promise(r => setTimeout(r, 2000));
  
  // 5. 检查手牌
  console.log('5️⃣  检查手牌...');
  const handInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    
    // 查找手牌相关信息
    const hasHandSection = text.includes('手牌:');
    const hasCards = document.querySelectorAll('[class*="card"]').length > 0;
    const cardCountMatch = text.match(/手牌:\s*(\d+)张/);
    const cardCount = cardCountMatch ? parseInt(cardCountMatch[1]) : 0;
    
    return { hasHandSection, hasCards, cardCount, textSample: text.substring(0, 500) };
  });
  
  console.log(`   手牌区域: ${handInfo.hasHandSection ? '✅' : '❌'}`);
  console.log(`   卡牌元素: ${handInfo.hasCards ? '✅' : '❌'}`);
  console.log(`   手牌数量: ${handInfo.cardCount}张`);
  
  if (handInfo.cardCount > 0) {
    console.log('\n   ✅ 手牌显示正常！');
  } else {
    console.log('\n   ❌ 手牌数量为0，可能有问题');
    console.log('   页面文本:', handInfo.textSample);
  }
  
  // 截图
  await page.screenshot({ path: '/tmp/uno-game-with-hand.png', fullPage: true });
  console.log('\n📸 截图已保存: /tmp/uno-game-with-hand.png');
  
  await browser.close();
})();
