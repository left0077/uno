# 下一代 UNO 架构设计

## 核心目标
支持任意卡牌类型、任意指定规则、任意奖励惩罚机制、任意计分规则。

## 核心理念：规则即数据

将游戏规则从硬代码中抽离，用**配置 + 脚本**定义。

```typescript
// 游戏规则配置示例
interface GameRuleConfig {
  // 基础配置
  maxHandSize: number;           // 手牌上限（0=无上限）
  startingCards: number;         // 初始手牌数
  turnTimeLimit: number;         // 回合时间限制
  
  // 牌库配置
  deckConfig: DeckConfig;
  
  // 卡牌效果定义
  cardEffects: Map<string, CardEffect>;
  
  // 效果触发器
  triggers: Trigger[];
  
  // 胜利条件
  winCondition: WinCondition;
  
  // 计分规则
  scoringRules: ScoringRule[];
}

// 卡牌效果（完全可扩展）
interface CardEffect {
  id: string;
  name: string;
  description: string;
  
  // 何时可以打出
  canPlay: (context: PlayContext) => boolean;
  
  // 打出后执行的效果链
  onPlay: EffectStep[];
  
  // 响应式效果（如被+时可以反转）
  onTargeted?: EffectStep[];
  
  // 持续效果（如打出后全局生效）
  continuous?: ContinuousEffect;
}

// 效果步骤（原子操作）
type EffectStep = 
  | { type: 'draw'; target: TargetSelector; count: number | ValueResolver }
  | { type: 'skip'; target: TargetSelector; count: number }
  | { type: 'reverse' }
  | { type: 'changeColor'; colors: string[] }
  | { type: 'discard'; target: TargetSelector; count: number }
  | { type: 'transfer'; from: TargetSelector; to: TargetSelector; what: Transferable }
  | { type: 'accumulate'; key: string; value: number }  // 累积惩罚
  | { type: 'custom'; handler: string }  // 调用自定义处理器
  | { type: 'condition'; if: Condition; then: EffectStep[]; else?: EffectStep[] }
  | { type: 'parallel'; steps: EffectStep[] }  // 并行执行
  | { type: 'sequence'; steps: EffectStep[] }; // 顺序执行

// 目标选择器（灵活指定目标）
type TargetSelector =
  | { type: 'self' }
  | { type: 'next'; distance?: number }        // 下家（可指定距离）
  | { type: 'prev'; distance?: number }        // 上家
  | { type: 'all' }                           // 所有人
  | { type: 'others' }                        // 除自己外的所有人
  | { type: 'chooser'; player: 'self' | 'next' }  // 由某玩家选择
  | { type: 'filter'; base: TargetSelector; condition: PlayerCondition }  // 过滤
  | { type: 'random'; from: TargetSelector; count: number }
  | { type: 'property'; prop: 'maxHandSize' | 'minHandSize' | 'lastPlace' | 'firstPlace' };

// 条件判断
interface Condition {
  type: 'hasCards' | 'hasEffect' | 'phase' | 'turnCount' | 'custom';
  // ... 条件参数
}

// 数值解析（支持动态计算）
type ValueResolver = 
  | number                                    // 固定值
  | { type: 'accumulated'; key: string }      // 取累积值（如+2累积的惩罚数）
  | { type: 'handSize'; target: TargetSelector }  // 目标手牌数
  | { type: 'count'; of: Countable }          // 计数
  | { type: 'math'; op: '+'|'-'|'*'|'/'; left: ValueResolver; right: ValueResolver };
```

## 具体规则实现示例

### 1. 标准+2牌

```typescript
const draw2Effect: CardEffect = {
  id: 'draw2',
  name: '+2',
  canPlay: (ctx) => ctx.pendingEffect?.type === 'draw2' || ctx.canPlayNormally,
  onPlay: [
    { type: 'condition',
      if: { type: 'hasEffect', effect: 'draw2' },
      then: [
        { type: 'accumulate', key: 'drawCount', value: 2 }
      ],
      else: [
        { type: 'accumulate', key: 'drawCount', value: 2 },
        { type: 'sequence', steps: [
          { type: 'draw', target: { type: 'next' }, count: { type: 'accumulated', key: 'drawCount' } },
          { type: 'skip', target: { type: 'next' }, count: 1 }
        ]}
      ]
    }
  ]
};
```

### 2. Out模式彩虹牌（特殊组合，不是单张牌）

```typescript
const rainbowCombo: ComboEffect = {
  id: 'rainbow',
  name: '彩虹',
  type: 'combo',  // 组合技，不是单张牌
  requirements: {
    minCards: 4,
    validator: (cards) => {
      // 4张同数字不同颜色
      if (cards.length !== 4) return false;
      const value = cards[0].value;
      const colors = new Set(cards.map(c => c.color));
      return cards.every(c => c.value === value) && colors.size === 4;
    }
  },
  onPlay: [
    // 基础+3
    { type: 'draw', target: { type: 'chooser', player: 'self' }, count: 3 },
    // 转移累积惩罚
    { type: 'condition',
      if: { type: 'hasEffect', effect: 'accumulated' },
      then: [
        { type: 'transfer', 
          from: { type: 'accumulated', key: 'drawCount' },
          to: { type: 'chooser', player: 'self' },
          what: 'penalty'
        }
      ]
    }
  ]
};
```

### 3. 连打：顺子奖励

```typescript
const straightCombo: ComboEffect = {
  id: 'straight',
  name: '顺子',
  type: 'combo',
  requirements: {
    minCards: 3,
    validator: (cards) => {
      // 同色连续数字
      if (cards.length < 3) return false;
      const color = cards[0].color;
      const sorted = [...cards].sort((a, b) => a.value - b.value);
      return sorted.every((c, i) => 
        c.color === color && (i === 0 || c.value === sorted[i-1].value + 1)
      );
    }
  },
  onPlay: [
    // 顺子长度 = 下家摸牌数
    { type: 'draw', 
      target: { type: 'next' }, 
      count: { type: 'count', of: { type: 'playedCards' } }
    }
  ],
  // 可响应
  onTargeted: [
    { type: 'condition',
      if: { type: 'canPlay', card: 'reverse' },
      then: [
        { type: 'transfer', from: { type: 'next' }, to: { type: 'prev' }, what: 'penalty' }
      ]
    }
  ]
};
```

### 4. 复杂自定义：刺客牌（假设的未来卡牌）

```typescript
const assassinCard: CardEffect = {
  id: 'assassin',
  name: '刺客',
  description: '指定手牌最多的玩家弃一半手牌',
  onPlay: [
    { type: 'sequence', steps: [
      { type: 'identify', 
        var: 'target', 
        value: { type: 'property', prop: 'maxHandSize' }
      },
      { type: 'discard', 
        target: { type: 'variable', name: 'target' }, 
        count: { 
          type: 'math', 
          op: '/', 
          left: { type: 'handSize', target: { type: 'variable', name: 'target' } },
          right: 2 
        }
      }
    ]}
  ]
};
```

## 规则引擎执行流程

```
玩家动作
  ↓
动作解析（区分单张出牌 / 连打组合 / 响应）
  ↓
合法性检查（canPlay + 当前状态）
  ↓
效果执行引擎（按EffectStep逐步执行）
  ├─ 目标解析（TargetSelector → 具体玩家列表）
  ├─ 数值计算（ValueResolver → 具体数值）
  ├─ 执行原子操作
  └─ 触发连锁（onTargeted响应）
  ↓
状态更新
  ↓
触发器检查（Triggers）
  ↓
胜利条件检查
```

## 架构层级

```
┌─────────────────────────────────────────┐
│           规则配置层 (Rule Config)         │
│  JSON/YAML定义游戏规则，热加载              │
├─────────────────────────────────────────┤
│           效果定义层 (Effect DSL)          │
│  CardEffect, ComboEffect, Trigger        │
├─────────────────────────────────────────┤
│           规则引擎层 (Rule Engine)         │
│  执行EffectStep，处理连锁，管理状态         │
├─────────────────────────────────────────┤
│           游戏核心层 (Game Core)           │
│  回合管理，牌库管理，玩家管理               │
├─────────────────────────────────────────┤
│           网络/存储层 (Infra)              │
│  WebSocket，数据库，日志                   │
└─────────────────────────────────────────┘
```

## 与现有架构对比

| 能力 | 当前架构 | 新架构 |
|------|---------|--------|
| 添加新卡牌 | 改代码+发版 | 改配置，即时生效 |
| 连打组合 | 硬编码逻辑 | ComboEffect配置 |
| 目标选择 | 固定（下家/上家） | 任意Selector组合 |
| 累积规则 | 特定逻辑 | accumulate抽象 |
| 自定义规则 | 不支持 | custom handler |
| 多模式并存 | 代码分支 | 独立配置 |
| 社区创意 | 无法实现 | 玩家可分享配置 |

## 实施路径

### MVP（最小可用）- 2周
实现核心DSL，支持当前所有规则：
- EffectStep基础类型
- TargetSelector基础类型
- 标准模式完整配置
- Out模式完整配置（含连打）

### Phase 2 - 1周
- 规则热加载
- 自定义handler接口
- 可视化规则编辑器（简单版）

### Phase 3 - 1周
- 社区规则市场（分享/下载）
- 规则验证器
- 性能优化

## 风险评估

**技术风险**：DSL表达能力是否足够？
- 缓解：预留custom handler作为逃生舱

**性能风险**：解释执行是否太慢？
- 缓解：效果预编译，热点缓存

**复杂度风险**：DSL学习成本高？
- 缓解：提供可视化编辑器，预设模板

**建议**：先实现MVP验证DSL能力，再决定是否全面迁移。

---

这个设计足够灵活吗？还是过于复杂？
