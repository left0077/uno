import { Room, GameState, GameAction, Player, Card } from '../../shared/index.js';
import { GameMode, ActionContext, ActionHandler } from './GameMode.js';
import { CardManager } from '../Card.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 标准UNO模式
 */
export class StandardMode implements GameMode {
  readonly name = 'standard';
  readonly description = '经典UNO规则';
  
  // 动作处理器注册表
  private actionHandlers = new Map<string, ActionHandler>();
  
  constructor() {
    this.registerHandlers();
  }
  
  private registerHandlers(): void {
    this.actionHandlers.set('play', new PlayCardHandler());
    this.actionHandlers.set('draw', new DrawCardHandler());
    this.actionHandlers.set('skip', new SkipTurnHandler());
    this.actionHandlers.set('uno', new CallUnoHandler());
    this.actionHandlers.set('challenge', new ChallengeHandler());
    this.actionHandlers.set('jumpIn', new JumpInHandler());
    this.actionHandlers.set('reverse', new PlayReverseHandler());
  }
  
  initialize(room: Room): GameState {
    const deck = CardManager.createDeck();
    const discardPile: Card[] = [];
    
    // 翻开首张牌（跳过万能牌）
    let firstCard = this.drawFirstCard(deck);
    discardPile.push(firstCard);
    
    // 检查牌堆是否足够
    const CARDS_PER_PLAYER = 7;
    const totalNeeded = room.players.length * CARDS_PER_PLAYER + 1;
    if (deck.length < totalNeeded) {
      throw new Error(`Not enough cards. Need ${totalNeeded}, have ${deck.length}`);
    }
    
    // 发牌（每人7张）
    room.players.forEach(player => {
      const cards = deck.splice(-CARDS_PER_PLAYER, CARDS_PER_PLAYER);
      player.cards = cards;
      player.cardCount = player.cards.length;
    });
    
    const now = Date.now();
    
    return {
      currentPlayerId: room.players[0].id,
      direction: 'clockwise',
      deck,
      discardPile,
      currentColor: firstCard.color,
      turnTimer: 120,
      turnStartTime: now,
      players: room.players,
      rankings: [],
      isRoundEnded: false
    };
  }
  
  private drawFirstCard(deck: Card[]): Card {
    let firstCard = deck.pop();
    if (!firstCard) {
      throw new Error('Failed to draw first card');
    }
    
    let reshuffleCount = 0;
    while ((firstCard.type === 'wild' || firstCard.type === 'draw4') && reshuffleCount < 3) {
      deck.unshift(firstCard);
      firstCard = deck.pop();
      if (!firstCard) {
        throw new Error('Failed to draw card during reshuffle');
      }
      reshuffleCount++;
    }
    
    // 如果3次都是万能牌，强制使用红色数字0
    if (firstCard.type === 'wild' || firstCard.type === 'draw4') {
      firstCard = {
        id: uuidv4(),
        type: 'number',
        color: 'red',
        value: 0
      };
    }
    
    return firstCard;
  }
  
  validateAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      return { valid: false, error: `Unknown action type: ${action.type}` };
    }
    
    const ctx: ActionContext = { state, playerId, action };
    return handler.validate(ctx);
  }
  
  executeAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }
    
    const ctx: ActionContext = { state, playerId, action };
    return handler.execute(ctx);
  }
  
  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const actions: GameAction[] = [];
    const player = state.players.find(p => p.id === playerId);
    
    if (!player || state.currentPlayerId !== playerId) {
      return actions;
    }
    
    // 检查可以出的牌
    for (const card of player.cards) {
      if (this.canPlayCard(state, card, player)) {
        actions.push({
          type: 'play',
          playerId: player.id,
          timestamp: Date.now(),
          cardIds: [card.id],
          chosenColor: card.type === 'wild' || card.type === 'draw4' ? undefined : card.color
        });
      }
    }
    
    // 可以摸牌
    if (!actions.some(a => a.type === 'play')) {
      actions.push({ type: 'draw', playerId: player.id, timestamp: Date.now() });
    }
    
    return actions;
  }
  
  private canPlayCard(state: GameState, card: Card, player: Player): boolean {
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    // 有待摸惩罚时，只能出相同类型的+牌
    if (state.pendingDraw && state.pendingDraw > 0) {
      if (state.pendingDrawType === 'draw2' && card.type === 'draw2') return true;
      if (state.pendingDrawType === 'draw4' && card.type === 'draw4') return true;
      return false;
    }
    
    // 万能牌随时可以出
    if (card.type === 'wild' || card.type === 'draw4') return true;
    
    // 颜色或数字匹配
    if (card.color === state.currentColor) return true;
    if (topCard.type === 'number' && card.type === 'number' && card.value === topCard.value) return true;
    if (topCard.type !== 'number' && card.type === topCard.type) return true;
    
    return false;
  }
  
  checkWinCondition(state: GameState): string | null {
    // 检查是否有玩家出完手牌
    for (const player of state.players) {
      if (player.cards.length === 0 && !state.rankings?.includes(player.id)) {
        return player.id;
      }
    }
    return null;
  }
  
  onTurnEnd(state: GameState, playerId: string): GameState {
    // 标准模式回合结束无需特殊处理
    return state;
  }
  
  destroy(): void {
    // 清理资源
  }
}

// ============ 动作处理器实现 ============

class PlayCardHandler implements ActionHandler {
  readonly type = 'play';
  
  canHandle(action: GameAction): boolean {
    return action.type === 'play';
  }
  
  validate(ctx: ActionContext): { valid: boolean; error?: string } {
    const { state, playerId, action } = ctx;
    
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    const card = action.cardIds && player.cards.find(c => c.id === action.cardIds[0]);
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    // 更多验证逻辑...
    return { valid: true };
  }
  
  execute(ctx: ActionContext): GameState {
    const { state, playerId, action } = ctx;
    // 实现出牌逻辑
    // 这里简化处理，实际应该移动完整的出牌逻辑
    return state;
  }
}

class DrawCardHandler implements ActionHandler {
  readonly type = 'draw';
  
  canHandle(): boolean {
    return true;
  }
  
  validate(ctx: ActionContext): { valid: boolean; error?: string } {
    if (ctx.state.currentPlayerId !== ctx.playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    return { valid: true };
  }
  
  execute(ctx: ActionContext): GameState {
    const { state, playerId } = ctx;
    const newState = { ...state };
    
    // 实现摸牌逻辑
    // 这里简化处理
    
    return newState;
  }
}

// 其他处理器占位符
class SkipTurnHandler implements ActionHandler {
  readonly type = 'skip';
  canHandle(): boolean { return true; }
  validate(): { valid: boolean } { return { valid: true }; }
  execute(ctx: ActionContext): GameState { return ctx.state; }
}

class CallUnoHandler implements ActionHandler {
  readonly type = 'uno';
  canHandle(): boolean { return true; }
  validate(): { valid: boolean } { return { valid: true }; }
  execute(ctx: ActionContext): GameState { return ctx.state; }
}

class ChallengeHandler implements ActionHandler {
  readonly type = 'challenge';
  canHandle(): boolean { return true; }
  validate(): { valid: boolean } { return { valid: true }; }
  execute(ctx: ActionContext): GameState { return ctx.state; }
}

class JumpInHandler implements ActionHandler {
  readonly type = 'jumpIn';
  canHandle(): boolean { return true; }
  validate(): { valid: boolean } { return { valid: true }; }
  execute(ctx: ActionContext): GameState { return ctx.state; }
}

class PlayReverseHandler implements ActionHandler {
  readonly type = 'reverse';
  canHandle(): boolean { return true; }
  validate(): { valid: boolean } { return { valid: true }; }
  execute(ctx: ActionContext): GameState { return ctx.state; }
}
