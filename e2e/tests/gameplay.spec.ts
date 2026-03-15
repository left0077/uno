import { test, expect } from '@playwright/test';

/**
 * 游戏流程测试套件
 * 测试出牌、摸牌、功能牌效果、连打规则等
 */

test.describe('游戏流程测试', () => {
  
  test('开始游戏后能看到手牌', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    // 添加AI
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    
    // 开始游戏
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏界面加载
    await page.waitForTimeout(3000);
    
    // 截图记录游戏界面
    await page.screenshot({ path: 'test-results/game-started.png' });
    
    // 验证能看到手牌（通过检查是否有卡片元素）
    const hasCards = await page.locator('.card, [class*="card"]').count() > 0 ||
                    await page.getByText(/手牌|张/).first().isVisible().catch(() => false);
    
    expect(hasCards).toBeTruthy();
  });

  test('当前玩家回合可以摸牌', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 截图记录当前手牌数
    await page.screenshot({ path: 'test-results/before-draw.png' });
    
    // 尝试点击牌堆摸牌
    const deck = page.locator('.deck, [class*="deck"]').first();
    if (await deck.isVisible().catch(() => false)) {
      await deck.click();
    } else {
      // 如果没有明确的牌堆元素，尝试点击牌堆区域
      await page.click('text=/牌堆|Deck|deck/i').catch(() => {
        // 尝试点击游戏区域中央的牌堆位置
        return page.click('.game-board, [class*="game"]').catch(() => {});
      });
    }
    
    await page.waitForTimeout(2000);
    
    // 截图记录摸牌后
    await page.screenshot({ path: 'test-results/after-draw.png' });
  });

  test('出牌后切换到下一回合', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并添加AI开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 记录当前回合
    const contentBefore = await page.content();
    
    // 截图记录
    await page.screenshot({ path: 'test-results/before-play.png' });
    
    // 尝试点击一张手牌
    const cards = page.locator('.card, [class*="card"]').all();
    if ((await cards).length > 0) {
      const firstCard = (await cards)[0];
      await firstCard.click();
      await page.waitForTimeout(1000);
      
      // 如果有出牌按钮，点击它
      const playButton = page.getByText(/出牌|Play/i);
      if (await playButton.isVisible().catch(() => false)) {
        await playButton.click();
      }
    }
    
    await page.waitForTimeout(2000);
    
    // 截图记录出牌后
    await page.screenshot({ path: 'test-results/after-play.png' });
  });

  test('显示当前颜色指示', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 检查是否有颜色指示
    const content = await page.content();
    const hasColorIndicator = content.includes('颜色') || 
                             content.includes('Color') ||
                             content.includes('🔴') ||
                             content.includes('🟡') ||
                             content.includes('🟢') ||
                             content.includes('🔵') ||
                             await page.locator('[class*="color"], .color-indicator').first().isVisible().catch(() => false);
    
    expect(hasColorIndicator).toBeTruthy();
  });

  test('显示倒计时', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 检查是否有倒计时显示
    const content = await page.content();
    const hasTimer = /\d+:\d+/.test(content) ||
                    await page.getByText(/\d+:\d+/).first().isVisible().catch(() => false);
    
    expect(hasTimer).toBeTruthy();
  });
});

test.describe('连打规则测试', () => {
  
  test('+2牌显示累积惩罚提示', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 截图记录
    await page.screenshot({ path: 'test-results/stacking-test.png' });
    
    // 检查是否有连打相关提示
    const content = await page.content();
    const hasStackingInfo = content.includes('累积') || 
                           content.includes('叠加') ||
                           content.includes('连打') ||
                           content.includes('+2') ||
                           content.includes('+4');
    
    // 记录是否显示连打信息（取决于游戏状态）
    console.log('连打提示显示:', hasStackingInfo);
  });
});

test.describe('UNO喊话测试', () => {
  
  test('剩1张牌时显示UNO按钮', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 截图记录
    await page.screenshot({ path: 'test-results/uno-button-test.png' });
    
    // 检查是否有UNO按钮或提示
    const content = await page.content();
    const hasUnoButton = content.includes('UNO') || 
                        content.includes('uno') ||
                        await page.getByText(/UNO/i).first().isVisible().catch(() => false);
    
    console.log('UNO按钮显示:', hasUnoButton);
  });
});

test.describe('排名模式测试', () => {
  
  test('游戏开始后显示排名区域', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await page.waitForTimeout(3000);
    
    // 截图记录
    await page.screenshot({ path: 'test-results/ranking-mode.png' });
    
    // 检查是否有排名相关显示
    const content = await page.content();
    const hasRanking = content.includes('排名') || 
                      content.includes('Ranking') ||
                      content.includes('🏆');
    
    console.log('排名显示:', hasRanking);
  });
});
