import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log('🎴 测试出牌后UI是否正常\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();
  
  // 进入游戏
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.type('input', '测试');
  await page.click('text=创建房间');
  await page.waitForFunction(() => document.body.innerText.includes('房间号'), { timeout: 10000 });
  
  // 添加机器人
  await page.click('text=添加AI');
  await sleep(300);
  await page.click('text=机器人');
  await sleep(1000);
  
  // 开始游戏前截图
  await page.screenshot({ path: '/tmp/play-test-1-before-start.png' });
  
  // 开始游戏
  await page.click('text=开始游戏');
  await sleep(2000);
  await page.screenshot({ path: '/tmp/play-test-2-after-start.png' });
  
  // 找到可出的牌并点击
  console.log('查找可出的牌...');
  const hasPlayable = await page.evaluate(() => {
    return document.body.innerText.includes('张可出');
  });
  
  if (hasPlayable) {
    console.log('有可出的牌，尝试出牌...');
    // 点击第一个卡牌（通常是可出的）
    const cards = await page.$$('[class*="rounded-lg"]');
    if (cards.length > 0) {
      await cards[0].click();
      await sleep(500);
      await page.screenshot({ path: '/tmp/play-test-3-after-select.png' });
      
      // 点击出牌按钮
      const playBtn = await page.$('text=出牌');
      if (playBtn) {
        const enabled = await playBtn.evaluate(el => !el.disabled);
        if (enabled) {
          await playBtn.click();
          console.log('✅ 出牌成功');
          await sleep(1000);
          await page.screenshot({ path: '/tmp/play-test-4-after-play.png' });
        } else {
          console.log('⚠️ 出牌按钮不可用');
        }
      }
    }
  }
  
  console.log('\n📸 截图已保存:');
  console.log('  /tmp/play-test-1-before-start.png');
  console.log('  /tmp/play-test-2-after-start.png');
  console.log('  /tmp/play-test-3-after-select.png');
  console.log('  /tmp/play-test-4-after-play.png');
  
  await sleep(3000);
  await browser.close();
})();
