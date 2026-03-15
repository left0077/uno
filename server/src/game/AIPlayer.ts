import { Player, Card, GameState } from '../shared/index.js';
import { CardManager } from './Card.js';

export class AIPlayer {
  // 获取AI行动
  static getAIAction(
    player: Player,
    gameState: GameState,
    allPlayers: Player[]
  ): { type: 'play' | 'draw'; cardId?: string; chosenColor?: string } | null {
    if (!player.isAI || !player.aiDifficulty) return null;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    // 连打规则处理：如果有待摸牌惩罚
    if (gameState.pendingDraw && gameState.pendingDraw > 0 && gameState.pendingDrawType) {
      // 只能出相同类型的+牌来继续连打
      const stackableCards = player.cards.filter(card => {
        if (gameState.pendingDrawType === 'draw2' && card.type === 'draw2') return true;
        if (gameState.pendingDrawType === 'draw4' && card.type === 'draw4') return true;
        return false;
      });
      
      // 连打决策：根据难度决定是否叠加
      const shouldStack = this.shouldStackDecision(player.aiDifficulty, gameState.pendingDraw);
      
      if (stackableCards.length > 0 && shouldStack) {
        // 出+牌继续叠加
        const card = stackableCards[0];
        return {
          type: 'play',
          cardId: card.id,
          chosenColor: this.chooseColor(card)
        };
      } else {
        // 不叠加，选择摸牌（接受惩罚）
        return { type: 'draw' };
      }
    }
    
    const playableCards = player.cards.filter(card => 
      CardManager.canPlayCard(card, topCard, gameState.currentColor)
    );
    
    if (playableCards.length === 0) {
      return { type: 'draw' };
    }
    
    // 根据难度选择策略
    switch (player.aiDifficulty) {
      case 'easy':
        return this.easyStrategy(playableCards);
      case 'normal':
        return this.normalStrategy(playableCards, player, gameState);
      case 'hard':
        return this.hardStrategy(playableCards, player, gameState, allPlayers);
      default:
        return this.easyStrategy(playableCards);
    }
  }
  
  // 连打决策：是否继续叠加
  private static shouldStackDifficulty(difficulty: 'easy' | 'normal' | 'hard', pendingDraw: number): boolean {
    switch (difficulty) {
      case 'easy':
        // 简单AI：50%概率叠加，不考虑当前累积数量
        return Math.random() > 0.5;
      case 'normal':
        // 普通AI：累积少时更可能叠加，累积多时更可能放弃
        // 2-4张：80%，6-8张：50%，10+张：20%
        if (pendingDraw <= 4) return Math.random() > 0.2;
        if (pendingDraw <= 8) return Math.random() > 0.5;
        return Math.random() > 0.8;
      case 'hard':
        // 困难AI：更智能，考虑手牌中是否有其他+牌
        // 如果有多个+牌，更可能继续叠加
        // 基础概率：累积少时90%，累积多时60%
        if (pendingDraw <= 4) return Math.random() > 0.1;
        return Math.random() > 0.4;
      default:
        return true;
    }
  }
  
  // 兼容旧方法名
  private static shouldStackDecision(difficulty: 'easy' | 'normal' | 'hard', pendingDraw: number): boolean {
    return this.shouldStackDifficulty(difficulty, pendingDraw);
  }
  
  // 简单策略：随机出牌
  private static easyStrategy(playableCards: Card[]): { type: 'play'; cardId: string; chosenColor?: string } {
    const card = playableCards[Math.floor(Math.random() * playableCards.length)];
    return {
      type: 'play',
      cardId: card.id,
      chosenColor: this.chooseColor(card)
    };
  }
  
  // 普通策略：优先出功能牌，考虑多牌同出
  private static normalStrategy(
    playableCards: Card[],
    player: Player,
    gameState: GameState
  ): { type: 'play'; cardId: string; chosenColor?: string } {
    // 按优先级排序：功能牌 > 万能牌 > 数字牌
    const priorityOrder = ['draw2', 'skip', 'reverse', 'draw4', 'wild', 'number'];
    
    playableCards.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.type);
      const bIndex = priorityOrder.indexOf(b.type);
      return aIndex - bIndex;
    });
    
    // 优先出多牌同出
    const numberGroups = new Map<string, Card[]>();
    playableCards.forEach(card => {
      if (card.type === 'number') {
        const key = card.value.toString();
        if (!numberGroups.has(key)) {
          numberGroups.set(key, []);
        }
        numberGroups.get(key)!.push(card);
      }
    });
    
    // 找数量最多的数字组
    let bestGroup: Card[] = [];
    numberGroups.forEach(group => {
      if (group.length > bestGroup.length) {
        bestGroup = group;
      }
    });
    
    // 如果有多张相同的数字牌，出第一张
    if (bestGroup.length > 1) {
      return {
        type: 'play',
        cardId: bestGroup[0].id,
        chosenColor: this.chooseColor(bestGroup[0])
      };
    }
    
    // 否则按优先级出
    const card = playableCards[0];
    return {
      type: 'play',
      cardId: card.id,
      chosenColor: this.chooseColor(card)
    };
  }
  
  // 困难策略：全局最优决策
  private static hardStrategy(
    playableCards: Card[],
    player: Player,
    gameState: GameState,
    allPlayers: Player[]
  ): { type: 'play'; cardId: string; chosenColor?: string } {
    // 分析对手手牌数
    const opponentCardCounts = allPlayers
      .filter(p => p.id !== player.id)
      .map(p => ({ id: p.id, count: p.cardCount }));
    
    const minOpponentCards = Math.min(...opponentCardCounts.map(o => o.count));
    const hasOpponentWithFewCards = minOpponentCards <= 2;
    
    // 如果有对手快赢了，优先使用控场牌
    if (hasOpponentWithFewCards) {
      const controlCards = playableCards.filter(c => 
        ['skip', 'draw2', 'draw4', 'reverse'].includes(c.type)
      );
      
      if (controlCards.length > 0) {
        const card = controlCards[0];
        return {
          type: 'play',
          cardId: card.id,
          chosenColor: this.chooseColor(card, player.cards)
        };
      }
    }
    
    // 否则使用普通策略
    return this.normalStrategy(playableCards, player, gameState);
  }
  
  // 选择颜色（用于万能牌）
  private static chooseColor(card: Card, handCards?: Card[]): string {
    if (card.type !== 'wild' && card.type !== 'draw4') {
      return card.color;
    }
    
    // 如果有手牌信息，选择手牌中最多的颜色
    if (handCards && handCards.length > 0) {
      const colorCount = new Map<string, number>();
      handCards.forEach(c => {
        if (c.color !== 'wild') {
          colorCount.set(c.color, (colorCount.get(c.color) || 0) + 1);
        }
      });
      
      let maxCount = 0;
      let bestColor = 'red';
      colorCount.forEach((count, color) => {
        if (count > maxCount) {
          maxCount = count;
          bestColor = color;
        }
      });
      
      return bestColor;
    }
    
    // 默认随机选择
    const colors = ['red', 'yellow', 'green', 'blue'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // 获取AI决策延迟（毫秒）
  static getDecisionDelay(difficulty: 'easy' | 'normal' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 2000 + Math.random() * 2000; // 2-4秒
      case 'normal':
        return 1000 + Math.random() * 2000; // 1-3秒
      case 'hard':
        return 500 + Math.random() * 500; // 0.5-1秒
      default:
        return 2000;
    }
  }
}
