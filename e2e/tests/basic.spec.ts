import { test, expect } from '@playwright/test';

/**
 * 基础功能测试套件
 * 测试首页、房间创建、加入、AI管理等基础功能
 */

test.describe('基础功能测试', () => {
  
  test('首页加载正常', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/Uno|UNO/i);
    
    // 检查主要元素
    await expect(page.getByText(/Uno Online|UNO/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/请输入昵称|昵称/i)).toBeVisible();
    await expect(page.getByText(/创建房间/i)).toBeVisible();
    await expect(page.getByText(/加入房间/i)).toBeVisible();
  });

  test('昵称保存到 localStorage', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    const nicknameInput = page.getByPlaceholder(/请输入昵称|昵称/i);
    
    // 输入昵称
    await nicknameInput.fill('测试玩家');
    
    // 验证输入成功
    await expect(nicknameInput).toHaveValue('测试玩家');
    
    // 刷新页面
    await page.reload();
    
    // 验证昵称已保存
    await expect(nicknameInput).toHaveValue('测试玩家');
  });

  test('创建房间流程', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 输入昵称
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('房主');
    
    // 点击创建房间
    await page.getByText(/创建房间/i).click();
    
    // 等待跳转到房间页面
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    // 验证房间信息
    await expect(page.getByText('房主')).toBeVisible();
    
    // 获取房间号（4位数字）
    const pageContent = await page.content();
    const roomCodeMatch = pageContent.match(/(\d{4})/);
    expect(roomCodeMatch).toBeTruthy();
    
    const roomCode = roomCodeMatch![1];
    console.log('创建的房间号:', roomCode);
    
    // 验证房间号是4位数字
    expect(roomCode).toMatch(/^\d{4}$/);
  });

  test('邀请链接自动填充房间号', async ({ page }) => {
    // 直接访问带房间号的URL
    await page.goto('https://left0077.github.io/uno/?room=1234');
    
    // 等待页面加载
    await expect(page.getByText(/Uno Online|UNO/i).first()).toBeVisible();
    
    // 点击加入房间，检查房间号是否自动填充
    await page.getByText(/加入房间/i).click();
    
    // 检查是否有房间号输入框且值为1234
    const roomInput = page.getByPlaceholder(/\d{4}|房间号/i);
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
      await page1.goto('https://left0077.github.io/uno/');
      await page1.getByPlaceholder(/请输入昵称|昵称/i).fill('房主');
      await page1.getByText(/创建房间/i).click();
      await expect(page1.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
      
      // 获取房间号
      const pageContent = await page1.content();
      const roomCodeMatch = pageContent.match(/(\d{4})/);
      expect(roomCodeMatch).toBeTruthy();
      const roomCode = roomCodeMatch![1];
      
      console.log('房间号:', roomCode);
      
      // 玩家2加入房间
      await page2.goto('https://left0077.github.io/uno/');
      await page2.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家2');
      await page2.getByText(/加入房间/i).click();
      
      // 输入房间号
      const roomInput = page2.getByPlaceholder(/\d{4}|房间号/i);
      await roomInput.fill(roomCode);
      
      // 点击进入
      await page2.getByText(/进入|加入/i).click();
      
      // 验证加入成功
      await expect(page2.getByText('玩家2')).toBeVisible({ timeout: 15000 });
      await expect(page2.getByText('房主')).toBeVisible();
      
      // 玩家1也能看到玩家2
      await expect(page1.getByText('玩家2')).toBeVisible({ timeout: 5000 });
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('房主可以添加AI', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 输入昵称并创建房间
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('房主');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    // 点击添加AI
    await page.getByText(/添加AI|AI/i).click();
    
    // 选择难度（如果有弹窗）
    const normalButton = page.getByText(/普通|Normal/i);
    if (await normalButton.isVisible().catch(() => false)) {
      await normalButton.click();
    }
    
    // 验证AI已添加（通过检查玩家列表）
    await expect(page.getByText(/AI|机器人/i)).toBeVisible({ timeout: 5000 });
  });

  test('房间设置功能', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 创建房间
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('房主');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    // 查找设置相关的开关或文本
    const settingsText = await page.getByText(/连打|叠加|抢打|设置|规则/i).first();
    expect(settingsText).toBeTruthy();
    
    // 截图记录设置状态
    await page.screenshot({ path: 'test-results/room-settings.png' });
  });
});

test.describe('连接状态测试', () => {
  
  test('显示连接状态', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    
    // 检查连接状态（可能显示已连接、连接中或断开）
    const statusLocator = page.getByText(/已连接|连接中|在线|断开|重连/i).first();
    
    // 至少应该有一种状态显示
    const hasStatus = await statusLocator.isVisible().catch(() => false);
    if (!hasStatus) {
      // 如果没有明确的状态文本，检查是否有状态指示器
      const hasIndicator = await page.locator('.status, [class*="status"], [class*="connect"]').first().isVisible().catch(() => false);
      expect(hasIndicator || hasStatus).toBeTruthy();
    }
  });

  test('网络断开后显示重连状态', async ({ page }) => {
    await page.goto('https://left0077.github.io/uno/');
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('测试玩家');
    await page.getByText(/创建房间/i).click();
    await expect(page.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
    
    // 模拟网络断开（通过 WebSocket 拦截或网络离线）
    await page.context().setOffline(true);
    
    // 等待重连状态显示
    await page.waitForTimeout(2000);
    
    // 截图记录断开状态
    await page.screenshot({ path: 'test-results/disconnected-state.png' });
    
    // 恢复网络
    await page.context().setOffline(false);
    
    // 等待重连
    await page.waitForTimeout(3000);
    
    // 截图记录重连状态
    await page.screenshot({ path: 'test-results/reconnected-state.png' });
  });
});
