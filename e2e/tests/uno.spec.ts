import { test, expect } from '@playwright/test';

test.describe('UNO Online 端到端测试', () => {
  
  test('首页加载正常', async ({ page }) => {
    await page.goto('/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/Uno/);
    
    // 检查主要元素
    await expect(page.getByText('Uno Online')).toBeVisible();
    await expect(page.getByPlaceholder('请输入昵称')).toBeVisible();
    await expect(page.getByText('创建房间')).toBeVisible();
    await expect(page.getByText('加入房间')).toBeVisible();
  });

  test('用户名保存功能', async ({ page }) => {
    await page.goto('/');
    
    const nicknameInput = page.getByPlaceholder('请输入昵称');
    
    // 输入昵称
    await nicknameInput.fill('测试玩家');
    
    // 验证输入成功
    await expect(nicknameInput).toHaveValue('测试玩家');
    
    // 刷新页面
    await page.reload();
    
    // 验证昵称已保存
    await expect(nicknameInput).toHaveValue('测试玩家');
  });

  test('服务器设置功能', async ({ page }) => {
    await page.goto('/');
    
    // 点击服务器地址打开设置
    await page.getByText(/localhost|http/).first().click();
    
    // 检查设置弹窗
    await expect(page.getByText('服务器设置')).toBeVisible();
    
    // 输入新的服务器地址
    const urlInput = page.getByPlaceholder(/http/);
    await urlInput.fill('http://192.168.1.100:3001');
    
    // 点击测试连接
    await page.getByText('测试连接').click();
    
    // 等待结果显示（可能会失败，但没有错误弹窗即可）
    await page.waitForTimeout(2000);
    
    // 关闭弹窗
    await page.getByRole('button', { name: /×|关闭/ }).click();
  });

  test('创建房间流程', async ({ page }) => {
    await page.goto('/');
    
    // 输入昵称
    await page.getByPlaceholder('请输入昵称').fill('房主');
    
    // 点击创建房间
    await page.getByText('创建房间').click();
    
    // 等待跳转到房间页面
    await expect(page.getByText('房间号')).toBeVisible({ timeout: 10000 });
    
    // 验证房间信息
    await expect(page.getByText('房主')).toBeVisible();
    
    // 获取房间号
    const roomCode = await page.locator('text=/\\d{4}/').first().textContent();
    expect(roomCode).toMatch(/^\d{4}$/);
    
    console.log('创建的房间号:', roomCode);
  });

  test('加入房间流程', async ({ browser }) => {
    // 创建两个浏览器上下文
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 玩家1创建房间
    await page1.goto('/');
    await page1.getByPlaceholder('请输入昵称').fill('房主');
    await page1.getByText('创建房间').click();
    await expect(page1.getByText('房间号')).toBeVisible({ timeout: 10000 });
    
    // 获取房间号
    const roomCodeText = await page1.locator('text=/\\d{4}/').first().textContent();
    const roomCode = roomCodeText?.match(/\d{4}/)?.[0];
    expect(roomCode).toBeDefined();
    
    console.log('房间号:', roomCode);
    
    // 玩家2加入房间
    await page2.goto('/');
    await page2.getByPlaceholder('请输入昵称').fill('玩家2');
    await page2.getByText('加入房间').click();
    
    // 输入房间号
    const roomInput = page2.getByPlaceholder('输入4位数字');
    await roomInput.fill(roomCode!);
    
    // 点击进入
    await page2.getByText('进入').click();
    
    // 验证加入成功
    await expect(page2.getByText('玩家2')).toBeVisible({ timeout: 10000 });
    await expect(page2.getByText('房主')).toBeVisible();
    
    // 清理
    await context1.close();
    await context2.close();
  });

  test('添加AI并开始游戏', async ({ page }) => {
    await page.goto('/');
    
    // 输入昵称并创建房间
    await page.getByPlaceholder('请输入昵称').fill('房主');
    await page.getByText('创建房间').click();
    await expect(page.getByText('房间号')).toBeVisible({ timeout: 10000 });
    
    // 点击添加AI
    await page.getByText('添加AI').click();
    
    // 选择难度
    await page.getByText('普通').click();
    
    // 验证AI已添加
    await expect(page.getByText(/AI/)).toBeVisible({ timeout: 5000 });
    
    // 开始游戏
    await page.getByText('开始游戏').click();
    
    // 验证游戏开始
    await expect(page.getByText(/第.*回合/)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[class*="card"]').first()).toBeVisible();
  });

  test('连接状态显示', async ({ page }) => {
    await page.goto('/');
    
    // 检查连接状态
    const statusText = await page.getByText(/已连接|连接中/).textContent();
    expect(statusText).toMatch(/已连接|连接中/);
  });
});
