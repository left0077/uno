import { Card } from '../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

export class CardManager {
  // 创建一副完整的Uno牌（108张）
  static createDeck(): Card[] {
    const deck: Card[] = [];
    const colors = ['red', 'yellow', 'green', 'blue'] as const;
    
    // 数字牌（0-9）
    colors.forEach(color => {
      // 每个颜色1张0
      deck.push({
        id: uuidv4(),
        type: 'number',
        color,
        value: 0
      });
      
      // 每个颜色2张1-9
      for (let i = 1; i <= 9; i++) {
        for (let j = 0; j < 2; j++) {
          deck.push({
            id: uuidv4(),
            type: 'number',
            color,
            value: i
          });
        }
      }
    });
    
    // 功能牌（跳过、反转、+2）
    colors.forEach(color => {
      for (let i = 0; i < 2; i++) {
        deck.push({ id: uuidv4(), type: 'skip', color, value: 'skip' });
        deck.push({ id: uuidv4(), type: 'reverse', color, value: 'reverse' });
        deck.push({ id: uuidv4(), type: 'draw2', color, value: 'draw2' });
      }
    });
    
    // 万能牌（变色、+4）
    for (let i = 0; i < 4; i++) {
      deck.push({ id: uuidv4(), type: 'wild', color: 'wild', value: 'wild' });
      deck.push({ id: uuidv4(), type: 'draw4', color: 'wild', value: 'draw4' });
    }
    
    return this.shuffleDeck(deck);
  }
  
  // 洗牌（Fisher-Yates算法）
  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // 检查卡牌是否可以打出
  static canPlayCard(card: Card, topCard: Card, currentColor: string): boolean {
    // 万能牌随时可出
    if (card.type === 'wild' || card.type === 'draw4') {
      return true;
    }
    
    // 颜色匹配
    if (card.color === currentColor) {
      return true;
    }
    
    // 数字/类型匹配
    if (card.value === topCard.value) {
      return true;
    }
    
    return false;
  }
  
  // 检查是否是合法的+4（手牌中没有当前颜色的牌）
  static canPlayDraw4(hand: Card[], currentColor: string): boolean {
    return !hand.some(card => card.color === currentColor);
  }
  
  // 获取卡牌显示文本
  static getCardDisplay(card: Card): string {
    const colorEmoji: Record<string, string> = {
      red: '🔴',
      yellow: '🟡',
      green: '🟢',
      blue: '🔵',
      wild: '🌈'
    };
    
    if (card.type === 'number') {
      return `${colorEmoji[card.color]}${card.value}`;
    }
    
    const typeEmoji: Record<string, string> = {
      skip: '🚫',
      reverse: '↩️',
      draw2: '+2',
      wild: '🎨',
      draw4: '+4'
    };
    
    return `${colorEmoji[card.color]}${typeEmoji[card.type]}`;
  }
}
