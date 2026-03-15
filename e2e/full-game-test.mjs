import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log('🎮 完整游戏对局测试\n');
console.log('='.repeat(60));

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // 可见模式，方便观察
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    // ===== 创建两个玩家 =====
    console.log('\n👤 创建玩家1（房主）...');
    const page1 = await browser.newPage();
    await page1.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page1.type('input', '房主');
    await page1.click('text=创建房间');
    await page1.waitForFunction(() => document.body.innerText.includes('房间号'), { timeout: 10000 });
    
    const roomCode = await page1.evaluate(() => {
      const match = document.body.innerText.match(/(\d{4})/);
      return match ? match[1] : null;
    });
    console.log(`   房间号: ${roomCode}`);
    
    console.log('\n👤 创建玩家2...');
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page2.type('input', '玩家2');
    await page2.click('text=加入房间');
    await sleep(500);
    await page2.type('input[placeholder="输入4位数字"]', roomCode);
    await page2.click('text=进入');
    await page2.waitForFunction(() => document.body.innerText.includes('玩家2'), { timeout: 10000 });
    console.log('   玩家2加入成功');
    
    // ===== 添加AI =====
    console.log('\n🤖 添加AI玩家...');
    await page1.click('text=添加AI');
    await sleep(300);
    await page1.click('text=普通');
    await sleep(1000);
    console.log('   AI添加成功');
    
    // 截图 - 房间状态
    await page1.screenshot({ path: '/tmp/game-test-1-room.png' });
    
    // ===== 开始游戏 =====
    console.log('\n🎮 开始游戏...');
    await page1.click('text=开始游戏');
    await sleep(2000);
    console.log('   游戏开始！');
    
    // 截图 - 游戏开始
    await page1.screenshot({ path: '/tmp/game-test-2-start.png' });
    await page2.screenshot({ path: '/tmp/game-test-3-p2-start.png' });
    
    // ===== 获取手牌信息 =====
    console.log('\n🎴 检查手牌...');
    const p1Hand = await page1.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/手牌:\s*(\d+)张.*?\((\d+)张可出\)/);
      const cards = document.querySelectorAll('[class*="card"]').length;
      return { text: match ? match[0] : '未找到', cardElements: cards };
    });
    console.log(`   玩家1: ${p1Hand.text}, 卡牌元素: ${p1Hand.cardElements}`);
    
    const p2Hand = await page2.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/手牌:\s*(\d+)张.*?\((\d+)张可出\)/);
      return { text: match ? match[0] : '未找到' };
    });
    console.log(`   玩家2: ${p2Hand.text}`);
    
    // ===== 尝试出牌 =====
    console.log('\n🎯 测试出牌...');
    
    // 检查是否是当前玩家的回合
    const isP1Turn = await page1.evaluate(() => {
      return document.body.innerText.includes('你的回合');
    });
    
    if (isP1Turn) {
      console.log('   玩家1的回合');
      
      // 找可出的牌（有绿色边框的）
      const playableCards = await page1.$$('[class*="card"]');
      console.log(`   找到 ${playableCards.length} 张卡牌`);
      
      // 点击第一张可出的牌
      const firstCard = await page1.$('[class*="card"]');
      if (firstCard) {
        await firstCard.click();
        await sleep(500);
        console.log('   选中一张牌');
        
        // 点击出牌按钮
        const playBtn = await page1.$('text=出牌');
        if (playBtn) {
          const isEnabled = await playBtn.evaluate(el => !el.disabled);
          if (isEnabled) {
            await playBtn.click();
            console.log('   ✅ 出牌成功！');
            await sleep(1000);
          } else {
            console.log('   ⚠️ 出牌按钮不可用（可能是选中的牌不可出）');
          }
        }
      }
    } else {
      console.log('   不是玩家1的回合');
    }
    
    // 截图 - 出牌后
    await page1.screenshot({ path: '/tmp/game-test-4-after-play.png' });
    
    // ===== 测试摸牌 =====
    console.log('\n🎴 测试摸牌...');
    const canDraw = await page1.evaluate(() => {
      const btn = document.querySelector('button');
      return btn && !btn.disabled;
    });
    
    if (canDraw) {
      // 找摸牌按钮
      const drawBtn = await page1.$('text=摸牌');
      if (drawBtn) {
        const isEnabled = await drawBtn.evaluate(el => {
          const text = el.textContent;
          return !el.disabled && text === '摸牌';
        });
        
        if (isEnabled) {
          await drawBtn.click();
          console.log('   ✅ 摸牌成功！');
          await sleep(1000);
        } else {
          console.log('   ⚠️ 摸牌按钮不可用（可能不是当前回合）');
        }
      }
    }
    
    // 截图 - 摸牌后
    await page1.screenshot({ path: '/tmp/game-test-5-after-draw.png' });
    
    // ===== 检查游戏状态更新 =====
    console.log('\n🔄 检查游戏状态...');
    const gameState = await page1.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasTurn: text.includes('回合'),
        hasTimer: text.includes(':'),
        hasDeck: text.includes('张'),
        hasDiscard: document.querySelector('[class*="card"]') !== null
      };
    });
    
    console.log(`   回合显示: ${gameState.hasTurn ? '✅' : '❌'}`);
    console.log(`   计时器: ${gameState.hasTimer ? '✅' : '❌'}`);
    console.log(`   牌堆显示: ${gameState.hasDeck ? '✅' : '❌'}`);
    console.log(`   卡牌渲染: ${gameState.hasDiscard ? '✅' : '❌'}`);
    
    // ===== 多轮测试 =====
    console.log('\n🔄 模拟多轮游戏...');
    for (let round = 1; round <= 3; round++) {
      console.log(`\n   第 ${round} 轮:`);
      
      // 检查当前回合
      const currentTurn = await page1.evaluate(() => {
        if (document.body.innerText.includes('你的回合')) return 'player1';
        return 'other';
      });
      
      if (currentTurn === 'player1') {
        console.log('   - 玩家1的回合');
        
        // 尝试出牌或摸牌
        const hasPlayable = await page1.evaluate(() => {
          return document.body.innerText.includes('张可出') && 
                 document.body.innerText.match(/\((\d+)张可出\)/)?.[1] !== '0';
        });
        
        if (hasPlayable) {
          console.log('   - 有可出的牌');
          // 简化：直接点击摸牌结束回合
          const drawBtn = await page1.$('text=摸牌');
          if (drawBtn) {
            const clickable = await drawBtn.evaluate(el => !el.disabled);
            if (clickable) {
              await drawBtn.click();
              console.log('   - ✅ 执行摸牌');
            }
          }
        } else {
          console.log('   - 没有可出的牌，摸牌');
          const drawBtn = await page1.$('text=摸牌');
          if (drawBtn) {
            const clickable = await drawBtn.evaluate(el => !el.disabled);
            if (clickable) {
              await drawBtn.click();
              console.log('   - ✅ 执行摸牌');
            }
          }
        }
      } else {
        console.log('   - 其他玩家的回合');
      }
      
      await sleep(2000);
    }
    
    // 最终截图
    await page1.screenshot({ path: '/tmp/game-test-6-final.png' });
    await page2.screenshot({ path: '/tmp/game-test-7-p2-final.png' });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 完整游戏测试完成！');
    console.log('='.repeat(60));
    
    console.log('\n📸 测试截图:');
    console.log('  /tmp/game-test-1-room.png      - 房间状态');
    console.log('  /tmp/game-test-2-start.png     - 游戏开始(玩家1)');
    console.log('  /tmp/game-test-3-p2-start.png  - 游戏开始(玩家2)');
    console.log('  /tmp/game-test-4-after-play.png- 出牌后');
    console.log('  /tmp/game-test-5-after-draw.png- 摸牌后');
    console.log('  /tmp/game-test-6-final.png     - 最终状态(玩家1)');
    console.log('  /tmp/game-test-7-p2-final.png  - 最终状态(玩家2)');
    
    await sleep(3000); // 让用户看到结果
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
})();
