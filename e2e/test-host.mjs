import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log('👑 测试房主身份保留\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();
  
  // 创建房间
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.type('input', '房主');
  await page.click('text=创建房间');
  await page.waitForFunction(() => document.body.innerText.includes('房间号'), { timeout: 10000 });
  
  // 检查是否是房主
  const isHostBefore = await page.evaluate(() => {
    return document.body.innerText.includes('房主') && document.body.innerText.includes('👑');
  });
  console.log('游戏前是房主:', isHostBefore ? '✅' : '❌');
  
  await page.screenshot({ path: '/tmp/host-test-1-before.png' });
  
  // 添加AI并开始游戏
  await page.click('text=添加AI');
  await sleep(300);
  await page.click('text=机器人');
  await sleep(1000);
  await page.click('text=开始游戏');
  await sleep(2000);
  
  await page.screenshot({ path: '/tmp/host-test-2-game.png' });
  
  // 手动触发游戏结束（出牌直到有人赢）
  // 这里简化：只测试重置后的房间状态
  // 返回房间
  await page.click('text=离开');
  await sleep(1000);
  
  // 重新进入房间
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.type('input', '房主');
  await page.click('text=加入房间');
  await sleep(500);
  
  // 获取房间号输入
  const roomCode = await page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/房间\s*(\d+)/);
    return match ? match[1] : null;
  });
  
  if (roomCode) {
    const inputs = await page.$$('input');
    if (inputs.length > 1) {
      await inputs[1].type(roomCode);
      await page.click('text=进入');
      await page.waitForFunction(() => document.body.innerText.includes('房主'), { timeout: 10000 });
    }
  }
  
  await sleep(1000);
  await page.screenshot({ path: '/tmp/host-test-3-after.png' });
  
  // 检查是否还是房主
  const isHostAfter = await page.evaluate(() => {
    const text = document.body.innerText;
    // 查找第一个玩家（应该是房主）
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('房主') && lines[i].includes('👑')) {
        return true;
      }
    }
    return text.includes('房主') && text.includes('👑');
  });
  console.log('游戏后还是房主:', isHostAfter ? '✅' : '❌');
  
  await browser.close();
})();
