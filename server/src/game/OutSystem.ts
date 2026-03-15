import { Room, Player, GameState, Card } from '../shared/index.js';
import { CardManager } from './Card.js';
import { v4 as uuidv4 } from 'uuid';

// Out模式时间配置（毫秒）- 根据真人数量调整
const OUT_SCHEDULE = {
  high: [4 * 60 * 1000, 7 * 60 * 1000, 10 * 60 * 1000], // 6-8人
  medium: [3 * 60 * 1000, 5 * 60 * 1000, 8 * 60 * 1000], // 3-5人
  low: [2 * 60 * 1000, 4 * 60 * 1000, 6 * 60 * 1000], // 1-2人
};

// Out模式配置 - 大逃杀：超出上限直接淘汰
interface OutConfig {
  phase: 0 | 1 | 2 | 3;
  maxCards: number; // 手牌上限（超出即淘汰）
  injectCardType: 'draw3' | 'draw5' | 'draw8' | null;
  injectCount: number;
}

const OUT_CONFIGS: Record<number, OutConfig> = {
  0: { phase: 0, maxCards: 999, injectCardType: null, injectCount: 0 },
  1: { phase: 1, maxCards: 15, injectCardType: 'draw3', injectCount: 4 },
  2: { phase: 2, maxCards: 8, injectCardType: 'draw5', injectCount: 4 },
  3: { phase: 3, maxCards: 3, injectCardType: 'draw8', injectCount: 6 },
};

export class OutSystem {
  private room: Room;
  private gameState: GameState;
  private outTimer: NodeJS.Timeout | null = null;
  private onStateChange: () => void;
  private onSendMessage: (playerId: string, type: 'emoji' | 'text', content: string) => void;
  private onEliminatePlayer: (player: Player) => void;

  constructor(
    room: Room,
    gameState: GameState,
    onStateChange: () => void,
    onSendMessage: (playerId: string, type: 'emoji' | 'text', content: string) => void,
    onEliminatePlayer: (player: Player) => void
  ) {
    this.room = room;
    this.gameState = gameState;
    this.onStateChange = onStateChange;
    this.onSendMessage = onSendMessage;
    this.onEliminatePlayer = onEliminatePlayer;
  }

  // 初始化缩圈系统
  initialize(): void {
    const humanCount = this.room.players.filter(p => !p.isAI).length;
    const now = Date.now();

    // 根据真人数量选择缩圈时间表
    let outTimes: number[];
    if (humanCount >= 6) {
      outTimes = OUT_SCHEDULE.high;
    } else if (humanCount >= 3) {
      outTimes = OUT_SCHEDULE.medium;
    } else {
      outTimes = OUT_SCHEDULE.low;
    }

    // 初始化Out模式状态
    this.gameState.outState = {
      phase: 0,
      maxCards: 999, // 初始无限制
      nextOutAt: now + outTimes[0]
    };

    this.gameState.gameStartTime = now;
    this.gameState.humanPlayerCount = humanCount;

    // 启动Out模式计时器
    this.startOutTimer();

    console.log(`[OutSystem] Out模式已启用，${humanCount}名真人玩家`);
  }

  // 启动Out模式计时器
  private startOutTimer(): void {
    if (this.outTimer) {
      clearInterval(this.outTimer);
    }

    this.outTimer = setInterval(() => {
      this.checkOutState();
    }, 1000);
  }

  // 检查Out模式状态
  private checkOutState(): void {
    const outState = this.gameState.outState;
    if (!outState || outState.phase >= 3) return;

    const now = Date.now();
    if (now >= outState.nextOutAt) {
      this.advanceOut();
    }
  }

  // 推进Out阶段
  private advanceOut(): void {
    const outState = this.gameState.outState;
    if (!outState) return;

    const newPhase = (outState.phase + 1) as 1 | 2 | 3;
    const config = OUT_CONFIGS[newPhase];
    
    // 更新状态
    outState.phase = newPhase;
    outState.maxCards = config.maxCards;

    // 设置下一次Out时间
    if (newPhase < 3) {
      const humanCount = this.gameState.humanPlayerCount || 1;
      let outTimes: number[];
      if (humanCount >= 6) {
        outTimes = OUT_SCHEDULE.high;
      } else if (humanCount >= 3) {
        outTimes = OUT_SCHEDULE.medium;
      } else {
        outTimes = OUT_SCHEDULE.low;
      }
      outState.nextOutAt = (this.gameState.gameStartTime || Date.now()) + outTimes[newPhase];
    }

    // 注入强化牌
    if (config.injectCardType && config.injectCount > 0) {
      this.injectPowerCards(config.injectCardType, config.injectCount);
    }

    // 检查手牌上限，超出者直接淘汰！
    this.enforceCardLimit();

    // 广播Out事件
    this.onStateChange();

    // 发送Out消息
    const phaseNames = ['', '🔥 Out I', '🔥🔥 Out II', '💀 终极Out'];
    const message = `${phaseNames[newPhase]}！手牌上限${config.maxCards}张，超出即淘汰！`;
    this.broadcastMessage(message);
  }

  // 强制执行手牌上限 - 超出直接淘汰！
  private enforceCardLimit(): void {
    const outState = this.gameState.outState;
    if (!outState || outState.phase === 0) return;
    
    this.room.players.forEach(player => {
      if (!player.eliminated && player.cards.length > outState.maxCards) {
        // 超出上限，直接淘汰！
        this.onEliminatePlayer(player);
      }
    });
  }

  // 检查玩家手牌是否超出上限（摸牌后调用）
  checkPlayerCardLimit(player: Player): void {
    const outState = this.gameState.outState;
    if (!outState || outState.phase === 0) return;
    
    if (!player.eliminated && player.cards.length > outState.maxCards) {
      // 摸牌后超出上限，淘汰！
      this.onEliminatePlayer(player);
    }
  }

  // 向牌库注入强化惩罚牌
  private injectPowerCards(cardType: 'draw3' | 'draw5' | 'draw8', count: number): void {
    const colors: Array<'red' | 'yellow' | 'green' | 'blue'> = ['red', 'yellow', 'green', 'blue'];
    const newCards: Card[] = [];

    for (let i = 0; i < count; i++) {
      const color = cardType === 'draw8' ? 'wild' : colors[i % 4];
      newCards.push({
        id: uuidv4(),
        type: cardType,
        color,
        value: cardType === 'draw3' ? '+3' : cardType === 'draw5' ? '+5' : '+8'
      });
    }

    // 将新牌洗牌后加入牌库
    const shuffled = CardManager.shuffleDeck(newCards);
    this.gameState.deck.push(...shuffled);

    console.log(`[OutSystem] 注入 ${count} 张 ${cardType} 牌到牌库`);

    // 通知玩家
    const cardNames: Record<string, string> = {
      'draw3': '+3', 'draw5': '+5', 'draw8': '+8（万能）'
    };
    this.broadcastMessage(`🃏 牌库注入 ${count} 张 ${cardNames[cardType]} 惩罚牌！`);
  }

  // 广播消息给所有真人玩家
  private broadcastMessage(message: string): void {
    this.room.players.forEach(p => {
      if (!p.isAI && this.onSendMessage) {
        this.onSendMessage(p.id, 'text', message);
      }
    });
  }

  // 获取剩余Out时间（毫秒）
  getRemainingTime(): number {
    const outState = this.gameState.outState;
    if (!outState || outState.phase >= 3) return 0;
    return Math.max(0, (outState.nextOutAt || 0) - Date.now());
  }

  // 获取当前阶段
  getCurrentPhase(): number {
    return this.gameState.outState?.phase || 0;
  }

  // 销毁
  destroy(): void {
    if (this.outTimer) {
      clearInterval(this.outTimer);
      this.outTimer = null;
    }
  }
}
