# UNO 游戏架构设计文档

## 目录
1. [系统概览](#系统概览)
2. [核心架构](#核心架构)
3. [游戏模式系统](#游戏模式系统)
4. [扩展指南](#扩展指南)
5. [数据流](#数据流)
6. [最佳实践](#最佳实践)

---

## 系统概览

### 技术栈
- **前端**: React 18 + TypeScript + Vite + TailwindCSS + Framer Motion
- **后端**: Node.js + Express + Socket.IO
- **共享**: TypeScript 类型定义（shared/）

### 目录结构
```
.
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面组件
│   │   └── hooks/          # React Hooks
├── server/                 # 后端服务
│   ├── src/
│   │   ├── game/           # 游戏逻辑
│   │   │   ├── UnoGame.ts      # 核心游戏类
│   │   │   ├── RingSystem.ts   # 缩圈模式系统
│   │   │   ├── AIPlayer.ts     # AI 逻辑
│   │   │   └── Card.ts         # 卡牌管理
│   │   ├── rooms/          # 房间管理
│   │   ├── socket/         # Socket.IO 处理器
│   │   └── shared/         # 服务端类型定义
├── shared/                 # 前后端共享类型
│   └── types/
└── docs/                   # 文档
```

---

## 核心架构

### 1. 游戏生命周期

```
创建房间 → 等待玩家 → 开始游戏 → 游戏循环 → 结束游戏
    ↓          ↓          ↓           ↓          ↓
RoomManager  Waiting   UnoGame    Turn Loop   Ranking
```

### 2. 核心类职责

| 类 | 职责 | 设计原则 |
|---|------|---------|
| `RoomManager` | 房间生命周期管理 | 单一职责：只管理房间状态 |
| `UnoGame` | 游戏主控制器 | 依赖注入：模式系统可插拔 |
| `RingSystem` | 缩圈模式逻辑 | 策略模式：独立计时和规则 |
| `AIPlayer` | AI 决策逻辑 | 策略模式：难度可配置 |
| `CardManager` | 牌库管理 | 工具类：纯函数操作 |

### 3. 类型定义规范

**共享类型** (`shared/types/index.ts`)：
- 前后端必须保持同步
- 服务端通过 `npm run sync-types` 自动同步
- **不要**在服务端直接修改类型定义

---

## 游戏模式系统

### 设计理念

游戏模式采用**插件化架构**，核心游戏逻辑 `UnoGame` 保持不变，特殊规则通过独立的 **Mode System** 类实现。

```
┌─────────────────────────────────────────┐
│              UnoGame                    │
│  - 标准 UNO 规则                         │
│  - 回合管理                              │
│  - 状态同步                              │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│RingSystem│   │TeamSystem│   │Future...│
│缩圈模式  │   │团队模式  │   │扩展模式  │
└─────────┘   └─────────┘   └─────────┘
```

### 现有模式

#### 1. Standard Mode（标准模式）
- **模式标识**: `'standard'`
- **特点**: 经典 UNO 规则
- **系统类**: 无需额外系统

#### 2. Ring Mode（缩圈模式）
- **模式标识**: `'ring'`
- **特点**: 时间压力 + 手牌上限 + 强化牌
- **系统类**: `RingSystem`

### 模式系统接口规范

所有模式系统必须实现以下生命周期：

```typescript
interface GameModeSystem {
  // 初始化（游戏开始时调用）
  initialize(): void;
  
  // 销毁（游戏结束时调用）
  destroy(): void;
  
  // 回合开始钩子（可选）
  onTurnStart?(player: Player): void;
  
  // 回合结束钩子（可选）
  onTurnEnd?(player: Player): void;
  
  // 玩家出牌钩子（可选）
  onCardPlayed?(player: Player, card: Card): void;
  
  // 玩家摸牌钩子（可选）
  onCardDrawn?(player: Player, cards: Card[]): void;
}
```

---

## 扩展指南

### 添加新游戏模式

以添加「团队模式(Team Mode)」为例：

#### 步骤 1: 更新类型定义

```typescript
// shared/types/index.ts

// 1. 添加新模式标识
export type GameMode = 'standard' | 'ring' | 'team';

// 2. 添加模式特有状态（如需要）
export interface GameState {
  // ... 原有字段 ...
  
  // 团队模式状态
  teamState?: TeamState;
}

export interface TeamState {
  teams: { id: string; players: string[]; score: number }[];
  currentTeam: string;
}
```

#### 步骤 2: 创建模式系统

```typescript
// server/src/game/TeamSystem.ts

import { Room, Player, GameState, Card } from '../shared/index.js';

export class TeamSystem {
  private room: Room;
  private gameState: GameState;
  private onStateChange: () => void;
  
  constructor(
    room: Room,
    gameState: GameState,
    onStateChange: () => void
  ) {
    this.room = room;
    this.gameState = gameState;
    this.onStateChange = onStateChange;
  }
  
  initialize(): void {
    // 初始化团队状态
    this.gameState.teamState = {
      teams: this.createTeams(),
      currentTeam: ''
    };
    
    console.log(`[TeamSystem] 团队模式已启动`);
  }
  
  private createTeams() {
    // 实现分队逻辑
    return [];
  }
  
  // 回合开始钩子
  onTurnStart(player: Player): void {
    // 团队模式特殊处理
  }
  
  destroy(): void {
    // 清理资源
  }
}
```

#### 步骤 3: 集成到 UnoGame

```typescript
// server/src/game/UnoGame.ts

import { TeamSystem } from './TeamSystem.js';

export class UnoGame {
  // ...
  private teamSystem: TeamSystem | null = null;
  
  constructor(...) {
    // ...
    
    // 根据模式初始化对应系统
    switch (room.settings.mode) {
      case 'ring':
        this.ringSystem = new RingSystem(...);
        this.ringSystem.initialize();
        break;
        
      case 'team':
        this.teamSystem = new TeamSystem(...);
        this.teamSystem.initialize();
        break;
    }
  }
  
  private nextTurn(): void {
    // ...
    
    // 调用模式系统钩子
    this.teamSystem?.onTurnStart(currentPlayer);
    this.ringSystem?.onTurnStart?.(currentPlayer);
  }
  
  destroy(): void {
    this.ringSystem?.destroy();
    this.teamSystem?.destroy();
  }
}
```

#### 步骤 4: 客户端适配（如需要）

```typescript
// client/src/pages/Game.tsx

// 根据模式显示不同 UI
const isTeamMode = room.settings.mode === 'team';
const isRingMode = room.settings.mode === 'ring';

// 团队模式：显示队友信息
{isTeamMode && <TeamInfo gameState={gameState} />}

// 缩圈模式：显示倒计时
{isRingMode && <RingCountdown gameState={gameState} />}
```

#### 步骤 5: 更新 AI 逻辑（如需要）

```typescript
// server/src/game/AIPlayer.ts

static getAIAction(...) {
  // 考虑团队模式策略
  if (gameState.teamState) {
    return this.teamStrategy(player, gameState);
  }
  
  // 原有逻辑...
}
```

---

## 数据流

### Socket 事件流

```
客户端操作          服务端处理            广播更新
    │                   │                    │
    ▼                   ▼                    ▼
┌─────────┐        ┌──────────┐        ┌─────────┐
│playCard │───────▶│UnoGame   │───────▶│room:    │
│         │        │.playCard()│        │updated  │
└─────────┘        └──────────┘        └─────────┘
```

### 关键事件类型

| 事件 | 方向 | 说明 |
|-----|------|------|
| `game:start` | C→S | 开始游戏 |
| `game:state` | S→C | 游戏状态更新 |
| `game:playCard` | C→S | 出牌 |
| `game:drawCard` | C→S | 摸牌 |
| `room:updated` | S→C | 房间信息更新 |

---

## 最佳实践

### 1. 添加新卡牌类型

```typescript
// 1. 更新类型定义
export type CardType = 'number' | 'skip' | ... | 'newCard';

// 2. 在 Card.tsx 添加渲染逻辑
switch (card.type) {
  case 'newCard':
    return <span>新</span>;
}

// 3. 在 UnoGame.ts 添加效果
private handleCardEffect(card: Card): void {
  case 'newCard':
    // 实现效果
    this.nextTurn();
    break;
}
```

### 2. 修改游戏平衡

**不要**直接修改核心逻辑，通过配置实现：

```typescript
// server/src/config/gameBalance.ts
export const BALANCE_CONFIG = {
  initialCards: 7,      // 初始手牌数
  turnTimer: 120,       // 回合时间
  maxStacking: 10,      // 最大连打数
};
```

### 3. 调试技巧

```typescript
// 使用统一的日志前缀
console.log(`[UnoGame] 游戏开始`);
console.log(`[RingSystem] 缩圈触发`);
console.log(`[AIPlayer] AI决策:`, action);
```

### 4. 性能优化

- 使用 `useMemo` 缓存复杂的玩家列表计算
- 牌库洗牌使用 Fisher-Yates 算法
- Socket 事件批量更新，避免频繁渲染

---

## 附录

### A. 类型定义同步

```bash
# 修改 shared/types/index.ts 后执行
npm run sync-types  # 自动复制到 server/src/shared/
```

### B. 运行测试

```bash
# 单元测试
npm run test --workspace=server  # 运行所有单元测试

# E2E测试（需要本地服务运行）
cd e2e
npm run test:local                 # 运行本地E2E测试
npm run test:ring                  # 测试缩圈模式
npm run test:hosting               # 测试托管功能
npm run test:mobile                # 测试移动端UI
```

### C. 添加新模式的 Checklist

- [ ] 更新 `GameMode` 类型
- [ ] 创建 `XxxSystem.ts` 模式系统
- [ ] 在 `UnoGame` 中集成
- [ ] 更新 AI 逻辑（如需要）
- [ ] 添加客户端 UI（如需要）
- [ ] 更新房间设置界面
- [ ] 测试并更新文档

### C. 常见问题

**Q: 模式之间可以组合吗？**
A: 目前设计是互斥的。如需组合（如「团队+缩圈」），创建新模式 `team-ring`。

**Q: 如何临时禁用某模式？**
A: 从 `GameMode` 类型中移除，但保留代码，方便后续启用。

---

**最后更新**: 2026-03-15  
**维护者**: Kimi Code
