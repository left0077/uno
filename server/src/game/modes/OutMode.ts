import { Room, GameState, GameAction, Player, Card } from '../../shared/index.js';
import { GameMode, ActionContext, ComboDefinition, ComboType, ComboEffect } from './GameMode.js';
import { StandardMode } from './StandardMode.js';

import { CardManager } from '../Card.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Out模式（大逃杀模式）
 * 继承标准模式，添加连打和Out系统
 */
export class OutMode implements GameMode {
  readonly name = 'out';
  readonly description = '大逃杀模式：手牌上限20，支持连打和彩虹转移';
  
  private standardMode: StandardMode;
  private outTimer: NodeJS.Timeout | null = null;
  
  // 连打定义
  private comboDefinitions: Map<ComboType, ComboDefinition> = new Map();
  
  // 最大手牌上限
  readonly MAX_HAND_SIZE = 20;
  
  constructor() {
    this.standardMode = new StandardMode();
    this.registerComboDefinitions();
  }
  
  private registerComboDefinitions(): void {
    // 对子：2张同数字
    this.comboDefinitions.set('pair', {
      type: 'pair',
      name: '对子',
      minCards: 2,
      maxCards: 2,
      validate: (cards) => {
        if (cards.length !== 2) return false;
        return cards[0].type === 'number' && 
               cards[1].type === 'number' && 
               cards[0].value === cards[1].value;
      },
      getEffect: (state, cards, playerId) => ({
        type: 'none',
        target: 'next',
        value: 0
      })
    });
    
    // 三条：3张同数字
    this.comboDefinitions.set('three', {
      type: 'three',
      name: '三条',
      minCards: 3,
      maxCards: 3,
      validate: (cards) => {
        if (cards.length !== 3) return false;
        const value = cards[0].value;
        return cards.every(c => 
          c.type === 'number' && c.value === value
        );
      },
      getEffect: (state, cards, playerId) => ({
        type: 'skip',
        target: 'next',
        value: 1  // 跳过1回合
      })
    });
    
    // 彩虹：4张同数字不同颜色
    this.comboDefinitions.set('rainbow', {
      type: 'rainbow',
      name: '彩虹',
      minCards: 4,
      maxCards: 4,
      validate: (cards) => {
        if (cards.length !== 4) return false;
        const value = cards[0].value;
        const colors = new Set(cards.map(c => c.color));
        return cards.every(c => 
          c.type === 'number' && 
          c.value === value &&
          c.color !== undefined
        ) && colors.size === 4;
      },
      getEffect: (state, cards, playerId) => {
        // 彩虹效果：+3 + 转移累积惩罚
        const hasAccumulated = state.pendingDraw && state.pendingDraw > 0;
        return {
          type: 'transfer',
          target: 'chooser',  // 由玩家选择目标
          value: 3,  // 基础+3
          extra: {
            transferAccumulated: hasAccumulated,
            accumulatedValue: state.pendingDraw || 0
          }
        };
      }
    });
    
    // 顺子：同色连续数字
    this.comboDefinitions.set('straight', {
      type: 'straight',
      name: '顺子',
      minCards: 3,
      validate: (cards) => {
        if (cards.length < 3) return false;
        const color = cards[0].color;
        if (!cards.every(c => c.color === color && c.type === 'number')) {
          return false;
        }
        const sorted = [...cards].sort((a, b) => Number(a.value || 0) - Number(b.value || 0));
        for (let i = 1; i < sorted.length; i++) {
          if (Number(sorted[i].value || 0) !== Number(sorted[i-1].value || 0) + 1) {
            return false;
          }
        }
        return true;
      },
      getEffect: (state, cards, playerId) => ({
        type: 'draw',
        target: 'next',
        value: cards.length  // 顺子长度=摸牌数
      })
    });
  }
  
  initialize(room: Room): GameState {
    // 创建扩展牌库（根据人数）
    const deckCount = this.calculateDeckCount(room.players.length);
    const deck = CardManager.createDeck();
    const discardPile: Card[] = [];
    
    // 翻开首张牌
    let firstCard = this.drawFirstCard(deck);
    discardPile.push(firstCard);
    
    // 发牌（每人7张）
    room.players.forEach(player => {
      const cards = deck.splice(-7, 7);
      player.cards = cards;
      player.cardCount = cards.length;
      player.eliminated = false;  // Out模式特有字段
    });
    
    const now = Date.now();
    
    const state: GameState = {
      currentPlayerId: room.players[0].id,
      direction: 'clockwise',
      deck,
      discardPile,
      currentColor: firstCard.color,
      turnTimer: 120,
      turnStartTime: now,
      players: room.players,
      rankings: [],
      isRoundEnded: false,
      maxHandSize: this.MAX_HAND_SIZE,
      gameStartTime: now,
      humanPlayerCount: room.players.filter(p => !p.isAI).length,
      outState: {
        phase: 0,
        maxCards: 0,
        nextOutAt: Math.floor(now + (3 + Math.random()) * 60 * 1000)  // 3-4分钟后
      }
    };
    
    // 启动Out计时器
    this.startOutTimer(state);
    
    return state;
  }
  
  private calculateDeckCount(playerCount: number): number {
    if (playerCount <= 4) return 1;
    if (playerCount <= 8) return 2;
    return 3;
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
    // 检查玩家是否被淘汰
    const player = state.players.find(p => p.id === playerId);
    if (player?.eliminated) {
      return { valid: false, error: 'Player eliminated' };
    }
    
    // 连打动作特殊验证
    if (action.type === 'combo') {
      return this.validateComboAction(state, action, playerId);
    }
    
    // 其他动作委托给标准模式
    return this.standardMode.validateAction(state, action, playerId);
  }
  
  private validateComboAction(
    state: GameState, 
    action: any, 
    playerId: string
  ): { valid: boolean; error?: string } {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    
    if (state.currentPlayerId !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    const comboType = action.comboType as ComboType;
    const comboDef = this.comboDefinitions.get(comboType);
    
    if (!comboDef) {
      return { valid: false, error: `Unknown combo type: ${comboType}` };
    }
    
    // 获取选中的牌
    const selectedCards = action.cardIds
      .map((id: string) => player.cards.find(c => c.id === id))
      .filter(Boolean) as Card[];
    
    if (selectedCards.length < comboDef.minCards) {
      return { valid: false, error: `Need at least ${comboDef.minCards} cards` };
    }
    
    if (!comboDef.validate(selectedCards)) {
      return { valid: false, error: `Invalid ${comboDef.name}` };
    }
    
    // 彩虹需要指定目标
    if (comboType === 'rainbow' && !action.targetId) {
      return { valid: false, error: 'Rainbow requires target player' };
    }
    
    return { valid: true };
  }
  
  executeAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState {
    let newState = { ...state };
    
    // 连打动作
    if (action.type === 'combo') {
      newState = this.executeComboAction(newState, action as any, playerId);
    } else {
      // 其他动作委托给标准模式
      newState = this.standardMode.executeAction(newState, action, playerId);
    }
    
    // 检查手牌上限
    newState = this.checkHandLimit(newState);
    
    // Out系统检查
    this.checkOutPhase(newState);
    
    return newState;
  }
  
  private executeComboAction(
    state: GameState, 
    action: any, 
    playerId: string
  ): GameState {
    let newState = { ...state };
    const player = newState.players.find(p => p.id === playerId)!;
    const comboType = action.comboType as ComboType;
    const comboDef = this.comboDefinitions.get(comboType)!;
    
    // 获取选中的牌并从手牌移除
    const cardIds = action.cardIds as string[];
    const playedCards: Card[] = [];
    
    for (const cardId of cardIds) {
      const cardIndex = player.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        playedCards.push(player.cards[cardIndex]);
        player.cards.splice(cardIndex, 1);
      }
    }
    
    // 加入弃牌堆
    newState.discardPile.push(...playedCards);
    
    // 获取最后一张牌的颜色作为当前颜色
    const lastCard = playedCards[playedCards.length - 1];
    newState.currentColor = lastCard.color;
    
    // 应用组合效果
    const effect = comboDef.getEffect(newState, playedCards, playerId);
    newState = this.applyComboEffect(newState, effect, playerId, action.targetId);
    
    // 更新手牌数
    player.cardCount = player.cards.length;
    
    // 移动到下一家
    newState.currentPlayerId = this.getNextPlayerId(newState, playerId);
    newState.turnStartTime = Date.now();
    
    return newState;
  }
  
  private applyComboEffect(
    state: GameState, 
    effect: ComboEffect, 
    playerId: string,
    targetId?: string
  ): GameState {
    const newState = { ...state };
    
    switch (effect.type) {
      case 'skip':
        // 跳过目标玩家
        if (effect.target === 'next') {
          const nextId = this.getNextPlayerId(newState, playerId);
          newState.skippedPlayerId = nextId;
          newState.currentPlayerId = this.getNextPlayerId(newState, nextId);
        }
        break;
        
      case 'draw':
        // 让目标摸牌
        if (effect.target === 'next') {
          const nextPlayer = newState.players.find(
            p => p.id === this.getNextPlayerId(newState, playerId)
          );
          if (nextPlayer) {
            for (let i = 0; i < effect.value; i++) {
              if (newState.deck.length === 0) {
                this.reshuffleDeck(newState);
              }
              const card = newState.deck.pop();
              if (card) {
                nextPlayer.cards.push(card);
              }
            }
            nextPlayer.cardCount = nextPlayer.cards.length;
          }
        }
        break;
        
      case 'transfer':
        // 彩虹转移效果
        const actualTargetId = effect.target === 'chooser' 
          ? targetId 
          : this.getNextPlayerId(newState, playerId);
          
        if (actualTargetId) {
          const targetPlayer = newState.players.find(p => p.id === actualTargetId);
          if (targetPlayer) {
            let totalDraw = effect.value;  // 基础+3
            
            // 转移累积惩罚
            if (effect.extra?.transferAccumulated && effect.extra.accumulatedValue) {
              totalDraw += effect.extra.accumulatedValue as number;
              newState.pendingDraw = 0;  // 清除累积
              newState.pendingDrawType = undefined;
            }
            
            // 执行摸牌
            for (let i = 0; i < totalDraw; i++) {
              if (newState.deck.length === 0) {
                this.reshuffleDeck(newState);
              }
              const card = newState.deck.pop();
              if (card) {
                targetPlayer.cards.push(card);
              }
            }
            targetPlayer.cardCount = targetPlayer.cards.length;
          }
        }
        break;
    }
    
    return newState;
  }
  
  private getNextPlayerId(state: GameState, currentId: string): string {
    const currentIndex = state.players.findIndex(p => p.id === currentId);
    const direction = state.direction === 'clockwise' ? 1 : -1;
    let nextIndex = (currentIndex + direction + state.players.length) % state.players.length;
    
    // 跳过被淘汰的玩家
    while (state.players[nextIndex]?.eliminated) {
      nextIndex = (nextIndex + direction + state.players.length) % state.players.length;
    }
    
    return state.players[nextIndex]?.id || currentId;
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
  
  private checkHandLimit(state: GameState): GameState {
    const newState = { ...state };
    
    for (const player of newState.players) {
      if (!player.eliminated && player.cards.length > this.MAX_HAND_SIZE) {
        player.eliminated = true;
        
        // 加入排名（淘汰者排在最后）
        if (!newState.rankings) newState.rankings = [];
        newState.rankings.unshift(player.id);  // 淘汰者排在前面（输家）
        
        // 手牌移到弃牌堆
        newState.discardPile.push(...player.cards);
        player.cards = [];
        player.cardCount = 0;
      }
    }
    
    return newState;
  }
  
  getAvailableActions(state: GameState, playerId: string): GameAction[] {
    const actions = this.standardMode.getAvailableActions(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    
    if (!player || state.currentPlayerId !== playerId) {
      return actions;
    }
    
    // 检测可连打
    const availableCombos = this.detectAvailableCombos(player.cards);
    
    for (const combo of availableCombos) {
      actions.push({
        type: 'combo',
        comboType: combo.type,
        cardIds: combo.cardIds,
        ...(combo.type === 'rainbow' ? { targetId: undefined } : {})
      } as GameAction);
    }
    
    return actions;
  }
  
  private detectAvailableCombos(cards: Card[]): Array<{type: ComboType; cardIds: string[]}> {
    const combos: Array<{type: ComboType; cardIds: string[]}> = [];
    
    // 按数字分组
    const byNumber = new Map<number, Card[]>();
    // 按颜色分组
    const byColor = new Map<string, Card[]>();
    
    for (const card of cards) {
      if (card.type === 'number' && card.value !== undefined && typeof card.value === 'number') {
        if (!byNumber.has(card.value)) {
          byNumber.set(card.value, []);
        }
        byNumber.get(card.value)!.push(card);
        
        if (card.color) {
          if (!byColor.has(card.color)) {
            byColor.set(card.color, []);
          }
          byColor.get(card.color)!.push(card);
        }
      }
    }
    
    // 检测对子和三条
    for (const [value, cardList] of byNumber) {
      if (cardList.length >= 4) {
        // 彩虹
        const colors = new Set(cardList.map(c => c.color));
        if (colors.size === 4) {
          const rainbowCards = cardList.filter((c, i, arr) => 
            arr.findIndex(x => x.color === c.color) === i
          );
          combos.push({ type: 'rainbow', cardIds: rainbowCards.map(c => c.id) });
        }
      }
      
      if (cardList.length >= 3) {
        // 三条
        combos.push({ type: 'three', cardIds: cardList.slice(0, 3).map(c => c.id) });
      }
      
      if (cardList.length >= 2) {
        // 对子
        combos.push({ type: 'pair', cardIds: cardList.slice(0, 2).map(c => c.id) });
      }
    }
    
    // 检测顺子
    for (const [color, cardList] of byColor) {
      const sorted = [...cardList].sort((a, b) => Number(a.value || 0) - Number(b.value || 0));
      
      // 找最长连续序列
      let currentSequence: Card[] = [sorted[0]];
      
      for (let i = 1; i < sorted.length; i++) {
        if (Number(sorted[i].value || 0) === Number(sorted[i-1].value || 0) + 1) {
          currentSequence.push(sorted[i]);
        } else {
          if (currentSequence.length >= 3) {
            combos.push({ 
              type: 'straight', 
              cardIds: currentSequence.map(c => c.id) 
            });
          }
          currentSequence = [sorted[i]];
        }
      }
      
      if (currentSequence.length >= 3) {
        combos.push({ 
          type: 'straight', 
          cardIds: currentSequence.map(c => c.id) 
        });
      }
    }
    
    return combos;
  }
  
  checkWinCondition(state: GameState): string | null {
    // 统计存活玩家
    const alivePlayers = state.players.filter(p => !p.eliminated);
    
    // 只剩1人存活
    if (alivePlayers.length === 1) {
      return alivePlayers[0].id;
    }
    
    // 有人出完手牌
    for (const player of alivePlayers) {
      if (player.cards.length === 0) {
        return player.id;
      }
    }
    
    return null;
  }
  
  onTurnEnd(state: GameState, playerId: string): GameState {
    // 标准回合结束处理
    let newState = this.standardMode.onTurnEnd(state, playerId);
    
    // Out系统检查（简化版）
    this.checkOutPhase(newState);
    
    return newState;
  }
  
  destroy(): void {
    if (this.outTimer) {
      clearInterval(this.outTimer);
      this.outTimer = null;
    }
    this.standardMode.destroy?.();
  }
  
  private startOutTimer(state: GameState): void {
    this.outTimer = setInterval(() => {
      this.checkOutPhase(state);
    }, 1000);
  }
  
  private checkOutPhase(state: GameState): void {
    if (!state.outState || state.outState.phase >= 3) return;
    
    const now = Date.now();
    if (now >= state.outState.nextOutAt) {
      // 进入下一阶段
      state.outState.phase++;
      
      // 注入惩罚卡并设置下一阶段
      if (state.outState.phase === 1) {
        state.outState.maxCards = 15;
        state.outState.nextOutAt = now + 3 * 60 * 1000;
        this.injectPenaltyCards(state, 'draw3', 4); // 注入4张+3
      } else if (state.outState.phase === 2) {
        state.outState.maxCards = 8;
        state.outState.nextOutAt = now + 3 * 60 * 1000;
        this.injectPenaltyCards(state, 'draw5', 4); // 注入4张+5
      } else if (state.outState.phase === 3) {
        state.outState.maxCards = 3;
        this.injectPenaltyCards(state, 'draw8', 6); // 注入6张+8
      }
    }
  }
  
  private injectPenaltyCards(state: GameState, type: 'draw3' | 'draw5' | 'draw8', count: number): void {
    const colors = ['red', 'yellow', 'green', 'blue'] as const;
    
    for (let i = 0; i < count; i++) {
      const card: Card = {
        id: uuidv4(),
        type,
        color: type === 'draw8' ? 'wild' : colors[i % 4],
        value: type === 'draw3' ? 3 : type === 'draw5' ? 5 : 8
      };
      // 随机插入牌库
      const insertIndex = Math.floor(Math.random() * (state.deck.length + 1));
      state.deck.splice(insertIndex, 0, card);
    }
    
    console.log(`[OutMode] Phase ${state.outState?.phase}: 注入${count}张${type}牌`);
  }
}
