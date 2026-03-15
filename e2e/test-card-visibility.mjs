import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log('🎴 测试卡牌可见性\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();
  
  // 快速进入游戏
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.type('input', '测试');
  await page.click('text=创建房间');
  await page.waitForFunction(() => document.body.innerText.includes('房间号'), { timeout: 10000 });
  
  // 添加机器人
  await page.click('text=添加AI');
  await sleep(300);
  await page.click('text=机器人');
  await sleep(500);
  
  // 开始游戏
  await page.click('text=开始游戏');
  await sleep(2000);
  
  // 截图
  await page.screenshot({ path: '/tmp/card-visibility-test.png' });
  console.log('📸 截图已保存: /tmp/card-visibility-test.png');
  
  // 分析卡牌可见性
  const cardInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="card"]');
    return {
      total: cards.length,
      text: document.body.innerText.includes('手牌:') ? '有手牌显示' : '无手牌'
    };
  });
  
  console.log(`   找到 ${cardInfo.total} 张卡牌`);
  console.log(`   ${cardInfo.text}`);
  
  await browser.close();
})();
