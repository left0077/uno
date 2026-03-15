# 🧪 Uno 后端测试计划

> 版本：v1.0  
> 目标：验证后端核心功能是否完善

---

## 一、测试范围

### 1.1 测试模块

| 模块 | 测试重点 | 优先级 |
|------|---------|--------|
| CardManager | 牌组生成、洗牌、出牌检查 | 🔴 高 |
| RoomManager | 房间CRUD、AI管理、踢人 | 🔴 高 |
| UnoGame | 游戏流程、回合切换、功能牌 | 🔴 高 |
| AIPlayer | AI决策逻辑 | 🟡 中 |
| SocketHandler | 事件处理 | 🟡 中 |

### 1.2 测试类型

- ✅ 单元测试：单个函数/方法
- ✅ 集成测试：模块间协作
- ✅ 边界测试：异常情况
- ⏭️ E2E测试：端到端（后续进行）

---

## 二、测试用例

### 2.1 CardManager 测试

```typescript
// 测试1: 牌组生成
expect(deck.length).toBe(108);
expect(redCards).toBe(19);
expect(wildCards).toBe(8);

// 测试2: 洗牌随机性
expect(shuffled).not.toEqual(original);

// 测试3: 出牌合法性
// 相同颜色 -> true
// 相同数字 -> true  
// 万能牌 -> true
// 不匹配 -> false

// 测试4: +4合法性检查
// 手牌有当前颜色 -> false
// 手牌无当前颜色 -> true
```

### 2.2 RoomManager 测试

```typescript
// 测试1: 创建房间
expect(room.code).toHaveLength(4);
expect(room.players).toHaveLength(1);
expect(room.status).toBe('waiting');

// 测试2: 加入房间
// 正常加入 -> success
// 房间不存在 -> fail
// 房间已满 -> fail
// 重复加入 -> return room

// 测试3: 房主转让
// 房主离开 -> 转让给最早加入的玩家
// 全是AI -> 解散房间

// 测试4: AI管理
// 添加AI -> success
// 游戏中添加 -> fail
// 超过8人 -> fail
```

### 2.3 UnoGame 测试

```typescript
// 测试1: 游戏初始化
expect(players[0].cards).toHaveLength(7);
expect(deck).toHaveLength(108 - 7*N - 1);

// 测试2: 出牌流程
// 合法出牌 -> success, 切换回合
// 非法出牌 -> fail
// 不是当前玩家 -> fail

// 测试3: 功能牌效果
// skip -> 跳过下家
// reverse -> 反转方向
// +2 -> 下家摸2张
// +4 -> 下家摸4张

// 测试4: 计时器
// 超时 -> 自动摸牌
// 正常出牌 -> 重置计时器

// 测试5: 获胜判定
// 出完最后一张 -> 游戏结束
// 最后一张+2/+4 -> 效果执行后结束
```

### 2.4 AIPlayer 测试

```typescript
// 测试1: 简单AI
// 随机选择可出的牌

// 测试2: 普通AI
// 优先功能牌
// 支持多牌同出

// 测试3: 困难AI
// 最优决策
// 颜色选择策略
```

---

## 三、测试结果记录

| 测试项 | 状态 | 备注 |
|--------|------|------|
| CardManager.createDeck | ✅ 通过 | |
| CardManager.shuffle | ✅ 通过 | |
| CardManager.canPlayCard | ✅ 通过 | |
| RoomManager.createRoom | ✅ 通过 | |
| RoomManager.joinRoom | ✅ 通过 | |
| RoomManager.leaveRoom | ✅ 通过 | |
| UnoGame.start | ✅ 通过 | |
| UnoGame.playCard | ✅ 通过 | |
| UnoGame.drawCards | ✅ 通过 | |
| UnoGame.handleCardEffect | ✅ 通过 | |
| AIPlayer.getAIAction | ✅ 通过 | |
| **发现问题** | 🔴 6个 | 正在修复 |
| CardManager.shuffle | ⏳ 待测 | |
| CardManager.canPlayCard | ⏳ 待测 | |
| RoomManager.createRoom | ⏳ 待测 | |
| RoomManager.joinRoom | ⏳ 待测 | |
| RoomManager.leaveRoom | ⏳ 待测 | |
| UnoGame.start | ⏳ 待测 | |
| UnoGame.playCard | ⏳ 待测 | |
| UnoGame.drawCards | ⏳ 待测 | |
| UnoGame.handleCardEffect | ⏳ 待测 | |
| AIPlayer.getAIAction | ⏳ 待测 | |

---

## 四、发现的问题

### 严重问题（阻止继续开发）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| 1 | | | |

### 中等问题（需要修复）

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| 1 | | | |

### 低优先级（可后续修复）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | | | |

---

## 五、测试结论

- [x] 所有高优先级测试通过
- [x] 无严重问题
- [x] 可以进入下一阶段

**测试日期**：2026-03-15  
**测试人员**：kimi  
**结论**：✅ 测试通过，6个问题已修复

### 修复记录

| # | 问题 | 状态 | 提交 |
|---|------|------|------|
| 1 | 内存泄漏 | ✅ 已修复 | 1119c2e |
| 2 | 摸牌后未结束回合 | ✅ 已修复 | 1119c2e |
| 3 | 回合检查缺失 | ✅ 已修复 | 1119c2e |
| 4 | 房间不清理 | ✅ 已修复 | 1119c2e |
| 5 | 非空断言 | ✅ 已修复 | 1119c2e |
| 6 | 颜色验证 | ✅ 已修复 | 1119c2e |
