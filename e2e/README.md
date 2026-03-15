# 🎮 Uno Online E2E 测试

使用 Playwright 进行的端到端自动化测试。

## 📋 测试覆盖范围

### 1. 基础功能测试 (`basic.spec.ts`)
- ✅ 首页加载
- ✅ 昵称保存
- ✅ 创建房间
- ✅ 加入房间
- ✅ 邀请链接自动填充
- ✅ 添加AI
- ✅ 连接状态显示

### 2. 断线重连测试 (`reconnect.spec.ts`)
- ✅ 页面刷新后自动重连
- ✅ 游戏中刷新恢复状态
- ✅ 重连后可以继续出牌
- ✅ 重连后倒计时正常
- ✅ 断网提示
- ✅ userId 持久化

### 3. 游戏流程测试 (`gameplay.spec.ts`)
- ✅ 开始游戏
- ✅ 查看手牌
- ✅ 摸牌功能
- ✅ 出牌功能
- ✅ 当前颜色指示
- ✅ 倒计时显示
- ✅ 连打规则提示
- ✅ UNO 喊话
- ✅ 排名模式显示

### 4. 特色功能测试 (`features.spec.ts`)
- ✅ Emoji 聊天
- ✅ 邀请链接
- ✅ 房间设置
- ✅ 游戏结束显示

## 🚀 快速开始

### 安装依赖

```bash
cd e2e
npm install
npx playwright install chromium
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行所有测试（可见浏览器）
npm run test:headed

# 运行特定测试
npm run test:basic      # 基础功能
npm run test:reconnect  # 断线重连
npm run test:gameplay   # 游戏流程
npm run test:features   # 特色功能

# 调试模式（UI）
npm run test:ui

# 生成报告
npm run report
```

### 使用交互式脚本

```bash
./run-tests.sh
```

## 📝 测试配置

### 测试环境

默认测试 **生产环境**：
- 前端: `https://left0077.github.io/uno/`
- 后端: `https://uno-server-jbbr.onrender.com`

### 测试超时

- 操作超时: 15秒
- 导航超时: 20秒
- Render 冷启动可能需要额外等待时间

## 📊 测试报告

测试完成后生成:
- **HTML 报告**: `playwright-report/index.html`
- **截图**: `test-results/*.png`
- **视频**: 失败时自动录制

查看报告:
```bash
npx playwright show-report
```

## 🔧 开发测试

### 添加新测试

1. 在 `tests/` 目录创建新的 `.spec.ts` 文件
2. 使用 Playwright API 编写测试
3. 运行测试验证

示例:
```typescript
import { test, expect } from '@playwright/test';

test('测试描述', async ({ page }) => {
  await page.goto('https://left0077.github.io/uno/');
  // ... 测试步骤
});
```

### 调试技巧

1. **使用 UI 模式**: `npx playwright test --ui`
2. **单测试调试**: `npx playwright test -g "测试名" --debug`
3. **保留浏览器**: `npx playwright test --headed --workers=1`

## ⚠️ 注意事项

1. **Render 冷启动**: 后端首次启动可能需要 30-60 秒
2. **并发限制**: 为避免房间冲突，测试使用单 worker 模式
3. **网络依赖**: 测试需要稳定的网络连接
4. **状态清理**: 每个测试独立运行，不会互相影响

## 📈 CI/CD 集成

可以在 GitHub Actions 中运行:

```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    npm install
    npx playwright install chromium
    npm test
```

## 🐛 故障排除

### 测试超时
- 检查网络连接
- 增加超时配置
- 等待 Render 服务启动

### 浏览器启动失败
```bash
npx playwright install --with-deps chromium
```

### 元素找不到
- 使用 `page.waitForTimeout()` 增加等待
- 检查选择器是否正确
- 查看截图定位问题
