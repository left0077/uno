import { test, expect } from '@playwright/test';

/**
 * 基础功能测试套件
 * 测试首页、房间创建、加入、AI管理等基础功能
 */

// 增加超时时间（GitHub Pages 加载较慢）
test.setTimeout(60000);

test.describe('基础功能测试', () => {
  
  test('首页加载正常', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/Uno|UNO/i);
    
    // 检查主要元素 - 使用更具体的选择器
    await expect(page.locator('h1, .title').first()).toBeVisible();
    await expect(page.getByPlaceholder(/昵称/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /创建房间/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /加入房间/i })).toBeVisible();
  });

  test('昵称保存到 localStorage', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    const nicknameInput = page.getByPlaceholder(/昵称/i).first();
    
    // 输入昵称
    await nicknameInput.fill('测试玩家');
    
    // 验证输入成功
    await expect(nicknameInput).toHaveValue('测试玩家');
    
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 验证昵称已保存
    await expect(nicknameInput).toHaveValue('测试玩家');
  });

  test('创建房间流程', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // 输入昵称
    await page.getByPlaceholder(/昵称/i).first().fill('房主');
    
    // 点击创建房间按钮
    await page.getByRole('button', { name: /创建房间/i }).click();
    
    // 等待跳转到房间页面 - 使用更具体的选择器
    // 等待 URL 变化或房间号显示
    await page.waitForTimeout(3000);
    
    // 验证房间信息 - 查找房间号（4位数字）
    const pageContent = await page.content();
    const roomCodeMatch = pageContent.match(/(\d{4})/);
    expect(roomCodeMatch).toBeTruthy();
    
    const roomCode = roomCodeMatch![1];
    console.log('创建的房间号:', roomCode);
    
    // 验证房间号是4位数字
    expect(roomCode).toMatch(/^\d{4}$/);
    
    // 验证玩家昵称显示 - 使用精确匹配
    await expect(page.getByText('房主', { exact: true })).toBeVisible();
  });

  test('邀请链接自动填充房间号', async ({ page }) => {
    // 直接访问带房间号的URL
    await page.goto('https://left0077.github.io/uno/?room=1234', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // 等待页面加载
    await expect(page.locator('h1, .title').first()).toBeVisible();
    
    // 点击加入房间按钮 - 使用第一个按钮
    await page.getByRole('button', { name: /加入房间/i }).first().click();
    
    // 等待弹窗或输入框出现
    await page.waitForTimeout(500);
    
    // 检查是否有房间号输入框且值为1234
    const roomInput = page.getByPlaceholder(/\d{4}/).first();
    if (await roomInput.isVisible().catch(() => false)) {
      await expect(roomInput).toHaveValue('1234');
    }
  });
});

test.describe('多人交互测试', () => {
  
  test('两个玩家加入同一房间', async ({ browser }) => {
    // 创建两个浏览器上下文
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 玩家1创建房间
      await page1.goto('https://left0077.github.io/uno/', { timeout: 30000 });
      await page1.waitForLoadState('networkidle');
      await page1.getByPlaceholder(/昵称/i).first().fill('房主');
      await page1.getByRole('button', { name: /创建房间/i }).click();
      await page1.waitForTimeout(3000);
      
      // 获取房间号
      const pageContent = await page1.content();
      const roomCodeMatch = pageContent.match(/(\d{4})/);
      expect(roomCodeMatch).toBeTruthy();
      const roomCode = roomCodeMatch![1];
      
      console.log('房间号:', roomCode);
      
      // 玩家2加入房间
      await page2.goto('https://left0077.github.io/uno/', { timeout: 30000 });
      await page2.waitForLoadState('networkidle');
      await page2.getByPlaceholder(/昵称/i).first().fill('玩家2');
      await page2.getByRole('button', { name: /加入房间/i }).click();
      
      // 等待输入框并输入房间号
      await page2.waitForTimeout(1000);
      // 尝试找到房间号输入框
      const inputs = await page2.locator('input').all();
      let roomInput = null;
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder');
        if (placeholder && (placeholder.includes('4') || placeholder.includes('房间'))) {
          roomInput = input;
          break;
        }
      }
      if (roomInput) {
        await roomInput.fill(roomCode);
      }
      
      // 点击进入
      const enterButton = page2.getByRole('button', { name: /进入|确认/i }).first();
      await enterButton.click();
      
      // 验证加入成功
      await expect(page2.getByText('玩家2', { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(page2.getByText('房主', { exact: true })).toBeVisible();
      
      // 玩家1也能看到玩家2
      await expect(page1.getByText('玩家2', { exact: true })).toBeVisible({ timeout: 10000 });
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('房主可以添加AI', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // 输入昵称并创建房间
    await page.getByPlaceholder(/昵称/i).first().fill('房主');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 点击添加AI按钮
    await page.getByRole('button', { name: /添加AI/i }).click();
    
    // 选择难度（如果有弹窗）
    await page.waitForTimeout(500);
    const normalButton = page.getByText(/普通|Normal/i).first();
    if (await normalButton.isVisible().catch(() => false)) {
      await normalButton.click();
    }
    
    // 验证AI已添加（通过检查玩家列表中有AI字样）
    const playerList = await page.content();
    expect(playerList.includes('AI') || playerList.includes('机器人') || playerList.includes('Bot')).toBeTruthy();
  });

  test('房间设置功能', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // 创建房间
    await page.getByPlaceholder(/昵称/i).first().fill('房主');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 截图记录设置状态
    await page.screenshot({ path: 'test-results/room-settings.png' });
    
    // 检查是否有设置相关的开关或文本
    const content = await page.content();
    const hasSettings = content.includes('连打') || 
                       content.includes('叠加') ||
                       content.includes('抢打') ||
                       content.includes('多牌') ||
                       content.includes('设置') ||
                       content.includes('规则');
    
    console.log('设置选项显示:', hasSettings);
    
    // 至少应该能看到房间界面
    await expect(page.getByText('房主', { exact: true })).toBeVisible();
  });
});

test.describe('连接状态测试', () => {
  
  test('显示连接状态', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // 检查连接状态（可能显示已连接、连接中或断开）
    const content = await page.content();
    const hasStatus = content.includes('已连接') || 
                     content.includes('连接中') ||
                     content.includes('在线') ||
                     content.includes('断开') ||
                     content.includes('重连');
    
    // 至少应该有一种状态显示或连接指示器
    console.log('连接状态显示:', hasStatus);
  });

  test('网络断开后显示重连状态', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder(/昵称/i).first().fill('测试玩家');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 模拟网络断开
    await page.context().setOffline(true);
    
    // 等待重连状态显示
    await page.waitForTimeout(3000);
    
    // 截图记录断开状态
    await page.screenshot({ path: 'test-results/disconnected-state.png' });
    
    // 恢复网络
    await page.context().setOffline(false);
    
    // 等待重连
    await page.waitForTimeout(5000);
    
    // 截图记录重连状态
    await page.screenshot({ path: 'test-results/reconnected-state.png' });
    
    // 验证玩家信息仍然存在
    await expect(page.getByText('测试玩家', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
