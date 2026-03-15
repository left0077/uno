import { Room, Player, GameState, GameAction, Card } from '../shared/index.js';
import { GameMode, GameModeFactory } from './modes/GameMode.js';
import { StandardMode } from './modes/StandardMode.js';
import { OutMode } from './modes/OutMode.js';

// 注册游戏模式
GameModeFactory.register('standard', StandardMode);
GameModeFactory.register('out', OutMode);

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onGameEnd: (winner: Player) => void;
  onPlayerEliminated?: (playerId: string, rank: number) => void;
  onSendMessage?: (playerId: string, type: 'emoji' | 'text', content: string) => void;
}

/**
 * UnoGame - 游戏流程控制器
 * 
 * 职责：
 * 1. 委托具体游戏逻辑给 GameMode
 * 2. 管理回合计时器
 * 3. 处理游戏生命周期（开始/结束/清理）
 * 4. 协调AI玩家
 */
export class UnoGame {
  private room: Room;
  private gameState: GameState;
  private mode: GameMode;
  private turnTimer: NodeJS.Timeout | null = null;
  private callbacks: GameCallbacks;
  
  constructor(
    room: Room, 
    callbacksOrStateChange: GameCallbacks | ((state: GameState) => void),
    onGameEnd?: (winner: Player) => void,
    onSendMessage?: (playerId: string, type: 'emoji' | 'text', content: string) => void
  ) {
    this.room = room;
    
    // 支持两种构造函数签名
    if (typeof callbacksOrStateChange === 'function') {
      // 旧版签名：UnoGame(room, onStateChange, onGameEnd, onSendMessage)
      this.callbacks = {
        onStateChange: callbacksOrStateChange,
        onGameEnd: onGameEnd || (() => {}),
        onSendMessage
      };
    } else {
      // 新版签名：UnoGame(room, callbacks)
      this.callbacks = callbacksOrStateChange;
    }
    
    // 根据房间设置创建对应的游戏模式
    const modeName = room.settings?.mode || 'standard';
    this.mode = GameModeFactory.create(modeName);
    
    // 初始化游戏状态
    this.gameState = this.mode.initialize(room);
    
    // 设置房间状态
    room.status = 'playing';
    room.gameState = this.gameState;
    
    // 启动回合计时器
    this.startTurnTimer();
    
    console.log(`[UnoGame] ${modeName}模式游戏已启动，${room.players.length}名玩家`);
  }
  
  /**
   * 处理玩家动作
   */
  handleAction(action: GameAction, playerId: string): boolean {
    // 验证玩家存在且未被淘汰
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.warn(`[UnoGame] 玩家不存在: ${playerId}`);
      return false;
    }
    
    if (player.eliminated) {
      console.warn(`[UnoGame] 玩家已被淘汰: ${playerId}`);
      return false;
    }
    
    // 验证动作合法性
    const validation = this.mode.validateAction(this.gameState, action, playerId);
    if (!validation.valid) {
      console.warn(`[UnoGame] 非法动作: ${validation.error}`);
      return false;
    }
    
    // 执行动作
    try {
      this.gameState = this.mode.executeAction(this.gameState, action, playerId);
      this.gameState.lastAction = { ...action, timestamp: Date.now() };
      
      // 检查胜利条件
      this.checkWinCondition();
      
      // 重置计时器
      this.resetTurnTimer();
      
      // 通知状态更新
      this.callbacks.onStateChange(this.gameState);
      
      return true;
    } catch (error) {
      console.error('[UnoGame] 执行动作失败:', error);
      return false;
    }
  }
  
  /**
   * 获取玩家可执行的动作列表
   */
  getAvailableActions(playerId: string): GameAction[] {
    return this.mode.getAvailableActions(this.gameState, playerId);
  }
  
  /**
   * 检查胜利条件
   */
  private checkWinCondition(): void {
    const winnerId = this.mode.checkWinCondition(this.gameState);
    
    if (winnerId) {
      const winner = this.room.players.find(p => p.id === winnerId);
      if (winner) {
        this.gameState.winner = winnerId;
        this.room.status = 'finished';
        this.callbacks.onGameEnd(winner);
        this.destroy();
      }
    }
  }
  
  /**
   * 回合超时处理
   */
  private handleTurnTimeout(): void {
    const currentPlayer = this.gameState.players.find(
      p => p.id === this.gameState.currentPlayerId
    );
    
    if (!currentPlayer || currentPlayer.eliminated) {
      return;
    }
    
    console.log(`[UnoGame] 玩家 ${currentPlayer.nickname} 回合超时`);
    
    // 自动摸牌
    const drawAction: GameAction = {
      type: 'draw',
      playerId: currentPlayer.id,
      timestamp: Date.now()
    };
    
    this.handleAction(drawAction, currentPlayer.id);
  }
  
  /**
   * 启动回合计时器
   */
  private startTurnTimer(): void {
    this.clearTurnTimer();
    
    const turnTime = this.gameState.turnTimer * 1000; // 转为毫秒
    this.turnTimer = setInterval(() => {
      const elapsed = Date.now() - this.gameState.turnStartTime;
      if (elapsed >= turnTime) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }
  
  /**
   * 重置回合计时器
   */
  private resetTurnTimer(): void {
    this.gameState.turnStartTime = Date.now();
    this.startTurnTimer();
  }
  
  /**
   * 清理回合计时器
   */
  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }
  
  /**
   * 获取当前游戏状态
   */
  getGameState(): GameState {
    return this.gameState;
  }
  
  /**
   * 获取当前游戏模式
   */
  getMode(): GameMode {
    return this.mode;
  }
  
  /**
   * 销毁游戏
   */
  destroy(): void {
    this.clearTurnTimer();
    this.mode.destroy?.();
    console.log('[UnoGame] 游戏已销毁');
  }
  
  // ============ 兼容层方法（测试使用） ============
  
  /**
   * 出牌（兼容旧API）
   */
  playCard(playerId: string, cardId: string, chosenColor?: string): boolean {
    return this.handleAction({
      type: 'play',
      playerId,
      cardIds: [cardId],
      chosenColor,
      timestamp: Date.now()
    }, playerId);
  }
  
  /**
   * 摸牌（兼容旧API）
   * @returns 摸到的牌数组
   */
  drawCards(playerId: string, count?: number): Card[] {
    const success = this.handleAction({
      type: 'draw',
      playerId,
      timestamp: Date.now()
    }, playerId);
    
    if (success) {
      // 返回玩家最新摸到的牌
      const player = this.gameState.players.find(p => p.id === playerId);
      if (player) {
        const actualCount = count || 1;
        return player.cards.slice(-actualCount);
      }
    }
    
    return [];
  }
  
  /**
   * 喊UNO（兼容旧API）
   */
  callUno(playerId: string): boolean {
    return this.handleAction({
      type: 'uno',
      playerId,
      timestamp: Date.now()
    }, playerId);
  }
  
  /**
   * 质疑UNO（兼容旧API）
   */
  challengeUno(playerId: string, targetId: string): { success: boolean; message?: string } {
    const success = this.handleAction({
      type: 'challenge',
      playerId,
      targetId,
      timestamp: Date.now()
    }, playerId);
    return { success };
  }
  
  /**
   * 抢牌出（兼容旧API）
   */
  jumpIn(playerId: string, cardId: string): boolean {
    return this.handleAction({
      type: 'jumpIn',
      playerId,
      cardIds: [cardId],
      timestamp: Date.now()
    }, playerId);
  }
  
  /**
   * 获取当前玩家（兼容旧API）
   */
  getCurrentPlayer(): Player | undefined {
    return this.gameState.players.find(p => p.id === this.gameState.currentPlayerId);
  }
  
  /**
   * 结束游戏（兼容旧API）
   */
  endGame(winner?: Player): void {
    if (winner) {
      // 添加到排名
      if (!this.gameState.rankings) this.gameState.rankings = [];
      if (!this.gameState.rankings.includes(winner.id)) {
        this.gameState.rankings.push(winner.id);
      }
      this.gameState.winner = winner.id;
      this.callbacks.onGameEnd(winner);
    }
    this.destroy();
  }
}
