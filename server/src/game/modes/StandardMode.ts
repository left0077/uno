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
  
  constructor() {}
  
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
      player.hasCalledUno = false;
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
    switch (action.type) {
      case 'play':
        return this.validatePlayCard(state, action, playerId);
      case 'draw':
        return this.validateDrawCard(state, playerId);
      case 'skip':
        return { valid: state.currentPlayerId === playerId };
      case 'uno':
        return this.validateCallUno(state, playerId);
      case 'challenge':
        return { valid: true };
      case 'jumpIn':
        return this.validateJumpIn(state, action, playerId);
      default:
        return { valid: false, error: `Unknown action type: ${action.type}` };
    }
  }
  
  private validatePlayCard(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    const cardId = action.cardIds?.[0];
    if (!cardId) {
      return { valid: false, error: 'No card specified' };
    }
    
    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    // 检查是否可以出这张牌
    if (!this.canPlayCard(state, card, player)) {
      return { valid: false, error: 'Cannot play this card' };
    }
    
    return { valid: true };
  }
  
  private validateDrawCard(state: GameState, playerId: string): { valid: boolean; error?: string } {
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    return { valid: true };
  }
  
  private validateCallUno(state: GameState, playerId: string): { valid: boolean; error?: string } {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    // 手牌为1张或2张时都可以喊UNO（1张是出完牌后，2张是出牌前）
    if (player.cards.length > 2) {
      return { valid: false, error: 'Can only call UNO when you have 1 or 2 cards' };
    }
    
    return { valid: true };
  }
  
  private validateJumpIn(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string } {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    const cardId = action.cardIds?.[0];
    if (!cardId) {
      return { valid: false, error: 'No card specified' };
    }
    
    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      return { valid: false, error: 'Card not found' };
    }
    
    // 检查颜色和数值是否完全匹配
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (card.color !== topCard.color && card.value !== topCard.value) {
      return { valid: false, error: 'Card must match color and value exactly' };
    }
    
    return { valid: true };
  }
  
  executeAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState {
    // 直接修改原状态（保持引用一致性）
    switch (action.type) {
      case 'play':
        return this.executePlayCard(state, action, playerId);
      case 'draw':
        return this.executeDrawCard(state, playerId);
      case 'skip':
        return this.executeSkip(state, playerId);
      case 'uno':
        return this.executeCallUno(state, playerId);
      case 'challenge':
        return this.executeChallenge(state, action, playerId);
      case 'jumpIn':
        return this.executeJumpIn(state, action, playerId);
      default:
        return state;
    }
  }
  
  private executePlayCard(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const cardId = action.cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    // 从手牌移除
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    
    // 加入弃牌堆
    state.discardPile.push(card);
    
    // 处理万能牌颜色选择
    if (card.type === 'wild' || card.type === 'draw4') {
      state.currentColor = action.chosenColor || action.color || 'red';
    } else {
      state.currentColor = card.color;
    }
    
    // 处理+2和+4的累积
    if (card.type === 'draw2') {
      if (state.pendingDrawType === 'draw2' || !state.pendingDraw) {
        state.pendingDraw = (state.pendingDraw || 0) + 2;
        state.pendingDrawType = 'draw2';
      }
    } else if (card.type === 'draw4') {
      if (state.pendingDrawType === 'draw4' || !state.pendingDraw) {
        state.pendingDraw = (state.pendingDraw || 0) + 4;
        state.pendingDrawType = 'draw4';
      }
    } else {
      // 普通牌清空累积
      if (state.pendingDraw && state.pendingDraw > 0) {
        // 执行累积的摸牌
        const nextPlayer = this.getNextPlayer(state, playerId);
        this.drawCardsForPlayer(state, nextPlayer, state.pendingDraw);
        state.pendingDraw = 0;
        state.pendingDrawType = undefined;
      }
    }
    
    // 处理功能牌效果
    switch (card.type) {
      case 'skip':
        // 跳过下家
        const skipTarget = this.getNextPlayer(state, playerId);
        state.skippedPlayerId = skipTarget;
        state.currentPlayerId = this.getNextPlayer(state, skipTarget);
        break;
        
      case 'reverse':
        // 反转方向
        state.direction = state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
        // 如果只有2人，反转等于跳过
        if (state.players.length === 2) {
          state.currentPlayerId = playerId; // 还是自己
        } else {
          state.currentPlayerId = this.getNextPlayer(state, playerId);
        }
        break;
        
      default:
        // 普通牌，移动到下一家
        state.currentPlayerId = this.getNextPlayer(state, playerId);
    }
    
    state.turnStartTime = Date.now();
    return state;
  }
  
  private executeDrawCard(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    
    // 如果有累积惩罚，摸累积的牌
    const drawCount = state.pendingDraw && state.pendingDraw > 0 ? state.pendingDraw : 1;
    
    for (let i = 0; i < drawCount; i++) {
      if (state.deck.length === 0) {
        this.reshuffleDeck(state);
      }
      const card = state.deck.pop();
      if (card) {
        player.cards.push(card);
      }
    }
    
    player.cardCount = player.cards.length;
    
    // 清空累积惩罚
    state.pendingDraw = 0;
    state.pendingDrawType = undefined;
    
    // 移动到下一家
    state.currentPlayerId = this.getNextPlayer(state, playerId);
    state.turnStartTime = Date.now();
    
    return state;
  }
  
  private executeSkip(state: GameState, playerId: string): GameState {
    // 跳过回合，直接移动到下一家
    state.currentPlayerId = this.getNextPlayer(state, playerId);
    state.turnStartTime = Date.now();
    return state;
  }
  
  private executeCallUno(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    player.hasCalledUno = true;
    return state;
  }
  
  private executeChallenge(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState {
    const targetId = action.targetId;
    if (!targetId) return state;
    
    const targetPlayer = state.players.find(p => p.id === targetId);
    if (!targetPlayer) return state;
    
    // 检查目标是否违规（只剩1张但没喊UNO）
    if (targetPlayer.cards.length === 1 && !targetPlayer.hasCalledUno) {
      // 违规，罚摸2张
      this.drawCardsForPlayer(state, targetId, 2);
    }
    
    return state;
  }
  
  private executeJumpIn(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState {
    const player = state.players.find(p => p.id === playerId)!;
    const cardId = action.cardIds![0];
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    const card = player.cards[cardIndex];
    
    // 从手牌移除
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    
    // 加入弃牌堆
    state.discardPile.push(card);
    state.currentColor = card.color;
    
    // 抢牌后成为当前玩家，继续出牌
    state.currentPlayerId = playerId;
    state.turnStartTime = Date.now();
    
    return state;
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
    
    // 颜色匹配
    if (card.color === state.currentColor) return true;
    
    // 数字匹配（都是数字牌）
    if (topCard.type === 'number' && card.type === 'number' && card.value === topCard.value) return true;
    
    // 功能牌类型匹配
    if (topCard.type !== 'number' && card.type === topCard.type) return true;
    
    return false;
  }
  
  private getNextPlayer(state: GameState, currentId: string): string {
    const currentIndex = state.players.findIndex(p => p.id === currentId);
    const direction = state.direction === 'clockwise' ? 1 : -1;
    const nextIndex = (currentIndex + direction + state.players.length) % state.players.length;
    return state.players[nextIndex].id;
  }
  
  private drawCardsForPlayer(state: GameState, playerId: string, count: number): void {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;
    
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        this.reshuffleDeck(state);
      }
      const card = state.deck.pop();
      if (card) {
        player.cards.push(card);
      }
    }
    
    player.cardCount = player.cards.length;
  }
  
  private reshuffleDeck(state: GameState): void {
    if (state.discardPile.length <= 1) return;
    
    const topCard = state.discardPile[state.discardPile.length - 1];
    const cardsToShuffle = state.discardPile.slice(0, -1);
    
    // 洗牌
    for (let i = cardsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardsToShuffle[i], cardsToShuffle[j]] = [cardsToShuffle[j], cardsToShuffle[i]];
    }
    
    state.deck = [...cardsToShuffle, ...state.deck];
    state.discardPile = [topCard];
  }
  
  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const actions: GameAction[] = [];
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) {
      return actions;
    }
    
    // 检查可以出的牌
    if (state.currentPlayerId === playerId) {
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
      actions.push({ type: 'draw', playerId: player.id, timestamp: Date.now() });
    }
    
    // 抢牌（jumpIn）- 任何玩家都可以抢
    const topCard = state.discardPile[state.discardPile.length - 1];
    for (const card of player.cards) {
      if (card.color === topCard.color && card.value === topCard.value) {
        actions.push({
          type: 'jumpIn',
          playerId: player.id,
          timestamp: Date.now(),
          cardIds: [card.id]
        });
      }
    }
    
    return actions;
  }
  
  checkWinCondition(state: GameState): string | null {
    // 检查是否有玩家出完手牌
    for (const player of state.players) {
      if (player.cards.length === 0) {
        // 添加到排名
        if (!state.rankings) state.rankings = [];
        if (!state.rankings.includes(player.id)) {
          state.rankings.push(player.id);
        }
        return player.id;
      }
    }
    return null;
  }
  
  onTurnEnd(state: GameState, playerId: string): GameState {
    return state;
  }
  
  destroy(): void {
    // 清理资源
  }
}
