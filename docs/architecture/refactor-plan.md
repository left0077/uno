# Out模式架构重构计划

## 目标
支持连打机制（对子/三条/彩虹/顺子）和彩虹指定功能，同时为未来规则扩展预留接口。

## 当前痛点
1. **UnoGame.ts 臃肿** - 接近700行，新增连打逻辑将超1000行
2. **模式判断散落** - `if (mode === 'out')` 重复代码
3. **UI硬编码** - Game.tsx 需要大量修改支持连打选择
4. **类型不统一** - 前后端类型定义有重复

## 重构方案

### Phase 1: 策略模式分离游戏逻辑（1-2天）

```
server/src/game/
├── modes/
│   ├── GameMode.ts          # 抽象基类/接口
│   ├── StandardMode.ts      # 标准模式实现
│   └── OutMode.ts           # Out模式实现（包含连打逻辑）
├── actions/
│   ├── ActionHandler.ts     # 动作处理器接口
│   ├── PlayCardAction.ts    # 出牌动作
│   ├── ComboAction.ts       # 连打动作（新增）
│   └── RainbowAction.ts     # 彩虹动作（新增）
├── systems/
│   ├── CardManager.ts       # 牌库管理
│   ├── TurnManager.ts       # 回合管理
│   └── OutSystem.ts         # Out模式特有系统
└── UnoGame.ts               # 精简为流程控制器
```

**GameMode 接口设计：**
```typescript
interface GameMode {
  name: string;
  
  // 初始化
  initialize(room: Room): GameState;
  
  // 验证动作是否合法
  validateAction(state: GameState, action: GameAction, playerId: string): boolean;
  
  // 执行动作
  executeAction(state: GameState, action: GameAction): GameState;
  
  // 获取可行动作列表（用于UI提示）
  getAvailableActions(state: GameState, playerId: string): GameAction[];
  
  // 检查胜利条件
  checkWinCondition(state: GameState): string | null; // 返回获胜者ID或null
  
  // 回合结束处理
  onTurnEnd(state: GameState): GameState;
}
```

### Phase 2: 动作系统重构（2-3天）

当前 `playCard` 方法需要拆分为独立动作处理器：

```typescript
// 当前：UnoGame.playCard(cardId, chosenColor)
// 重构后：
class PlayCardAction implements ActionHandler {
  execute(state, { cardId, chosenColor }) {
    // 标准出牌逻辑
  }
}

class ComboAction implements ActionHandler {
  execute(state, { comboType, cardIds }) {
    // 连打逻辑：对子/三条/顺子
    // 计算奖励/惩罚
    // 更新状态
  }
}

class RainbowAction implements ActionHandler {
  execute(state, { cardIds, targetPlayerId }) {
    // 彩虹逻辑：+3 + 转移累积惩罚
  }
}
```

### Phase 3: UI组件化（2-3天）

```
client/src/components/
├── game/
│   ├── GameBoard.tsx        # 游戏主界面
│   ├── PlayerHand.tsx       # 手牌区域（支持连打选择）
│   ├── ComboSelector.tsx    # 连打类型选择器（新增）
│   ├── TargetSelector.tsx   # 目标选择器（彩虹指定用，新增）
│   └── ActionPanel.tsx      # 动作面板（出牌/连打/摸牌）
└── mode-specific/
    ├── StandardUI.tsx       # 标准模式UI
    └── OutModeUI.tsx        # Out模式特有UI（倒计时等）
```

**关键UI改动：**
1. **多选功能** - PlayerHand 支持 Ctrl/Shift 多选卡牌
2. **连打检测** - 实时检测选中的牌能否组成对子/三条/彩虹/顺子
3. **目标选择** - 弹出层选择彩虹目标玩家
4. **动作提示** - 检测到可连打时高亮提示

### Phase 4: 类型系统统一（1天）

将 `shared/types/index.ts` 作为唯一类型源：

```typescript
// 动作类型扩展
export type GameAction = 
  | { type: 'play'; cardId: string; chosenColor?: string }
  | { type: 'draw' }
  | { type: 'combo'; comboType: 'pair' | 'three' | 'rainbow' | 'straight'; cardIds: string[]; targetId?: string }
  | { type: 'rainbow'; cardIds: string[]; targetId: string }
  | { type: 'reverse' }
  | { type: 'skip' }
  // ... 其他动作

// 连打类型定义
export interface ComboDefinition {
  type: 'pair' | 'three' | 'rainbow' | 'straight';
  minCards: number;
  validate: (cards: Card[]) => boolean;
  getReward: (state: GameState, combo: ComboDefinition) => ComboReward;
}

export interface ComboReward {
  type: 'skip' | 'draw' | 'transfer';
  target: 'next' | 'prev' | 'any';
  value: number;
}
```

## 实施建议

### 方案A：立即重构（推荐，1周内完成）
- 优点：架构清晰，后续开发轻松
- 缺点：需要暂停新功能开发1周
- 适合：计划长期维护、频繁添加新模式

### 方案B：渐进重构（边做边改，2-3周）
- 在实现连打功能时逐步抽象
- 优点：不阻塞进度
- 缺点：技术债累积，可能走弯路
- 适合：快速上线，后续再优化

### 方案C：保持现状（只加功能，不重构）
- 在现有架构上硬编码连打逻辑
- 优点：最快实现
- 缺点：代码混乱，后续难维护
- 适合：一次性Demo，不长期维护

## 我的建议

选择 **方案A（立即重构）**，因为：
1. Out模式规则已定稿，需求稳定
2. 重构后实现连打逻辑会更清晰
3. 避免技术债影响后续模式扩展
4. 1周时间成本可接受

**重构后开发节奏：**
- Week 1: 完成架构重构
- Week 2: 实现连打服务端逻辑
- Week 3: 实现连打UI和交互
- Week 4: 测试优化

你觉得这个计划可行吗？还是倾向于渐进式方案？
