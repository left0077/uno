import { Room, Player, Card, GameState, GameAction } from '../shared/index.js';
import { CardManager } from './Card.js';
import { AIPlayer } from './AIPlayer.js';
import { v4 as uuidv4 } from 'uuid';

export class UnoGame {
  private room: Room;
  private gameState: GameState;
  private turnTimer: NodeJS.Timeout | null = null;
  private onStateChange: (state: GameState) => void;
  private onGameEnd: (winner: Player) => void;
  private onSendMessage?: (playerId: string, type: 'emoji' | 'text', content: string) => void;
  
  constructor(
    room: Room,
    onStateChange: (state: GameState) => void,
    onGameEnd: (winner: Player) => void,
    onSendMessage?: (playerId: string, type: 'emoji' | 'text', content: string) => void
  ) {
    this.room = room;
    this.onStateChange = onStateChange;
    this.onGameEnd = onGameEnd;
    this.onSendMessage = onSendMessage;
    
    // 初始化游戏状态
    const deck = CardManager.createDeck();
    const discardPile: Card[] = [];
    
    // 修复5：修复非空断言，添加安全检查
    if (deck.length === 0) {
      throw new Error('Failed to create card deck: deck is empty');
    }
    
    // 翻开首张牌（跳过万能牌）
    let firstCard = deck.pop();
    if (!firstCard) {
      throw new Error('Failed to draw first card from deck');
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
    
    discardPile.push(firstCard);
    
    // 修复5：检查牌堆是否足够
    const CARDS_PER_PLAYER = 7;
    const totalNeeded = room.players.length * CARDS_PER_PLAYER + 1; // +1 for first card
    if (deck.length < totalNeeded) {
      throw new Error(`Not enough cards. Need ${totalNeeded}, have ${deck.length}`);
    }
    
    // 发牌（每人7张）
    room.players.forEach(player => {
      const cards = deck.splice(-CARDS_PER_PLAYER, CARDS_PER_PLAYER);
      if (cards.length !== CARDS_PER_PLAYER) {
        console.warn(`Warning: Only dealt ${cards.length} cards to player ${player.id}`);
      }
      player.cards = cards;
      player.cardCount = player.cards.length;
    });
    
    this.gameState = {
      currentPlayerId: room.players[0].id,
      direction: 'clockwise',
      deck,
      discardPile,
      currentColor: firstCard.color,
      turnTimer: 120, // 2分钟
      turnStartTime: Date.now(),
      players: room.players, // 包含所有玩家手牌
      rankings: [], // 初始化排名列表
      isRoundEnded: false
    };
    
    room.status = 'playing';
    room.gameState = this.gameState;
    
    // 启动回合计时器
    this.startTurnTimer();
  }
  
  // 获取当前游戏状态
  getGameState(): GameState {
    return this.gameState;
  }
  
  // 获取当前玩家
  getCurrentPlayer(): Player | undefined {
    return this.room.players.find(p => p.id === this.gameState.currentPlayerId);
  }
  
  // 获取下一个玩家ID（跳过已出完牌的玩家）
  private getNextPlayerId(): string {
    const currentIndex = this.room.players.findIndex(p => p.id === this.gameState.currentPlayerId);
    const playerCount = this.room.players.length;
    const rankings = this.gameState.rankings || [];
    
    // 查找下一个未出完牌的玩家
    let nextIndex = currentIndex;
    for (let i = 1; i <= playerCount; i++) {
      if (this.gameState.direction === 'clockwise') {
        nextIndex = (currentIndex + i) % playerCount;
      } else {
        nextIndex = (currentIndex - i + playerCount) % playerCount;
      }
      
      const nextPlayer = this.room.players[nextIndex];
      // 如果该玩家还没出完牌，返回其ID
      if (!rankings.includes(nextPlayer!.id)) {
        return nextPlayer!.id;
      }
    }
    
    // 所有玩家都出完牌了（不应该走到这里）
    return this.room.players[currentIndex]!.id;
  }
  
  // 切换到下一个玩家
  private nextTurn(): void {
    this.gameState.currentPlayerId = this.getNextPlayerId();
    this.gameState.turnStartTime = Date.now();
    this.gameState.turnTimer = 120;
    
    // 更新 gameState 中的 players
    this.gameState.players = this.room.players;
    
    this.startTurnTimer();
    this.onStateChange(this.gameState);
    
    // 广播后再清除被跳过标记（客户端已收到提示）
    this.gameState.skippedPlayerId = undefined;
    
    // 检查游戏是否已结束
    if (this.room.status !== 'playing') {
      return;
    }
    
    // 检查是否是机器人（aiType === 'bot'），如果是则立即自动出牌
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer?.isAI && currentPlayer.aiType === 'bot') {
      this.handleBotTurn(currentPlayer);
    }
  }
  
  // 处理机器人回合（立即自动出牌，不等待倒计时）
  private handleBotTurn(botPlayer: Player): void {
    // 短暂延迟模拟思考（500-1500ms），然后立即出牌
    const thinkingTime = 500 + Math.random() * 1000;
    
    setTimeout(() => {
      // 检查是否还是该机器人的回合
      if (this.gameState.currentPlayerId !== botPlayer.id) return;
      
      const action = AIPlayer.getAIAction(botPlayer, this.gameState, this.room.players);
      if (!action) return;
      
      if (action.type === 'play' && action.cardId) {
        const card = botPlayer.cards.find(c => c.id === action.cardId);
        
        // AI 出牌前发送表情嘲讽（30%概率）
        if (this.onSendMessage) {
          const situation = card && (card.type === 'draw2' || card.type === 'draw4' || card.type === 'skip') 
            ? 'provocation' 
            : 'taunt';
          const emoji = AIPlayer.getEmoji(situation, botPlayer.cardCount - 1);
          if (emoji) {
            this.onSendMessage(botPlayer.id, 'emoji', emoji);
          }
        }
        
        this.playCard(botPlayer.id, action.cardId, action.chosenColor);
      } else if (action.type === 'draw') {
        // 机器人摸牌前发送表情（无奈）
        if (this.onSendMessage) {
          const emoji = AIPlayer.getEmoji('helpless', botPlayer.cardCount + 1);
          if (emoji) {
            this.onSendMessage(botPlayer.id, 'emoji', emoji);
          }
        }
        
        // 机器人摸牌并结束回合
        // 如果有连打惩罚，摸累积的牌；否则摸1张
        const drawCount = this.gameState.pendingDraw || 1;
        
        // drawCards 内部已经调用了 nextTurn()，不需要再手动切换回合
        this.drawCards(botPlayer.id, drawCount, true);
        
        // 检查下一家是否也是机器人
        const nextPlayer = this.getCurrentPlayer();
        if (nextPlayer?.isAI && nextPlayer.aiType === 'bot') {
          this.handleBotTurn(nextPlayer);
        }
      }
    }, thinkingTime);
  }
  
  // 启动回合计时器
  private startTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
    }
    
    this.turnTimer = setInterval(() => {
      this.gameState.turnTimer--;
      
      if (this.gameState.turnTimer <= 0) {
        // 超时，自动摸牌
        this.handleTimeout();
      }
      
      this.onStateChange(this.gameState);
    }, 1000);
  }
  
  // 处理超时
  private handleTimeout(): void {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;
    
    // 如果有连打惩罚，摸累积的牌；否则摸1张
    const drawCount = this.gameState.pendingDraw || 1;
    this.drawCards(currentPlayer.id, drawCount, true);
    // 清除连打状态
    this.gameState.pendingDraw = undefined;
    this.gameState.pendingDrawType = undefined;
    this.nextTurn();
  }
  
  // 摸牌
  drawCards(playerId: string, count: number, skipTurnCheck: boolean = false): Card[] {
    // 修复3：检查是否是当前玩家（效果牌造成的摸牌可以跳过检查）
    if (!skipTurnCheck && playerId !== this.gameState.currentPlayerId) {
      return [];
    }
    
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return [];
    
    const drawnCards: Card[] = [];
    
    for (let i = 0; i < count; i++) {
      // 牌堆空了，洗混弃牌堆
      if (this.gameState.deck.length === 0) {
        if (this.gameState.discardPile.length <= 1) {
          console.warn('No more cards available to draw');
          break; // 没有牌可摸了
        }
        
        // 修复5：安全获取顶牌
        const topCard = this.gameState.discardPile.pop();
        if (!topCard) {
          console.warn('Failed to get top card from discard pile');
          break;
        }
        
        this.gameState.deck = CardManager.shuffleDeck(this.gameState.discardPile);
        this.gameState.discardPile = [topCard];
      }
      
      // 修复5：安全摸牌
      const card = this.gameState.deck.pop();
      if (!card) {
        console.warn('Failed to draw card from deck');
        break;
      }
      player.cards.push(card);
      drawnCards.push(card);
    }
    
    player.cardCount = player.cards.length;
    
    // 修复2：摸牌后结束回合
    // 如果是连打惩罚导致的摸牌，清除连打状态
    const wasPendingDraw = this.gameState.pendingDraw && this.gameState.pendingDraw > 0;
    if (wasPendingDraw) {
      this.gameState.pendingDraw = undefined;
      this.gameState.pendingDrawType = undefined;
    }
    this.nextTurn();
    
    return drawnCards;
  }
  
  // 出牌
  playCard(playerId: string, cardId: string, chosenColor?: string): boolean {
    if (playerId !== this.gameState.currentPlayerId) return false;
    
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return false;
    
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = player.cards[cardIndex];
    
    // 修复5：安全检查弃牌堆
    if (this.gameState.discardPile.length === 0) {
      console.error('Discard pile is empty');
      return false;
    }
    
    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    
    // 修复3：检查是否是当前玩家
    if (playerId !== this.gameState.currentPlayerId) {
      return false;
    }
    
    // 检查是否可以打出
    if (!CardManager.canPlayCard(card, topCard, this.gameState.currentColor)) {
      return false;
    }
    
    // 连打规则检查：如果有待摸牌惩罚，只能出相同类型的+2或+4来继续连打
    if (this.gameState.pendingDraw && this.gameState.pendingDraw > 0) {
      const canStack = (this.gameState.pendingDrawType === 'draw2' && card.type === 'draw2') ||
                       (this.gameState.pendingDrawType === 'draw4' && card.type === 'draw4');
      if (!canStack) {
        // 不能连打，必须摸牌
        return false;
      }
    }
    
    // 修复6：处理万能牌颜色选择（验证颜色合法性）
    const VALID_COLORS = ['red', 'yellow', 'green', 'blue'] as const;
    
    if (card.type === 'wild' || card.type === 'draw4') {
      if (!chosenColor || !VALID_COLORS.includes(chosenColor as any)) return false;
      this.gameState.currentColor = chosenColor;
    } else {
      this.gameState.currentColor = card.color;
    }
    
    // 移除手牌并放入弃牌堆
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    this.gameState.discardPile.push(card);
    
    // 重置该玩家的UNO状态（需要重新喊）
    if (player.cardCount > 1) {
      player.hasCalledUno = false;
    }
    
    // 记录动作
    this.gameState.lastAction = {
      type: 'play',
      playerId,
      card,
      timestamp: Date.now()
    };
    
    // 检查是否出完牌
    if (player.cardCount === 0) {
      this.endGame(player);
      // 如果游戏还没有真正结束（还有人在玩），继续轮到下一家
      if (this.room.status === 'playing') {
        this.nextTurn();
      }
      return true;
    }
    
    // 处理功能牌效果
    this.handleCardEffect(card);
    
    return true;
  }
  
  // 处理卡牌效果
  private handleCardEffect(card: Card): void {
    switch (card.type) {
      case 'skip':
        // 跳过下家
        const skippedPlayerId = this.getNextPlayerId();
        this.gameState.skippedPlayerId = skippedPlayerId; // 记录被跳过的玩家
        this.gameState.currentPlayerId = this.getNextPlayerId();
        this.nextTurn();
        break;
        
      case 'reverse':
        // 反转方向
        this.gameState.direction = this.gameState.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
        // 2人局时反转等同于跳过
        if (this.room.players.length === 2) {
          this.nextTurn();
        } else {
          this.nextTurn();
        }
        break;
        
      case 'draw2':
        // 连打（叠加）逻辑：+2牌可以叠加
        if (this.gameState.pendingDraw && this.gameState.pendingDrawType === 'draw2') {
          // 继续叠加
          this.gameState.pendingDraw += 2;
        } else {
          // 首次出+2，设置连打状态
          this.gameState.pendingDraw = 2;
          this.gameState.pendingDrawType = 'draw2';
        }
        // 轮到下家，下家可以选择继续叠加或者摸牌
        this.nextTurn();
        break;
        
      case 'draw4':
        // 连打（叠加）逻辑：+4牌可以叠加
        if (this.gameState.pendingDraw && this.gameState.pendingDrawType === 'draw4') {
          // 继续叠加
          this.gameState.pendingDraw += 4;
        } else {
          // 首次出+4，设置连打状态
          this.gameState.pendingDraw = 4;
          this.gameState.pendingDrawType = 'draw4';
        }
        // 轮到下家，下家可以选择继续叠加或者摸牌
        this.nextTurn();
        break;
        
      default:
        // 数字牌，正常切换
        this.nextTurn();
    }
  }
  
  // 喊UNO
  callUno(playerId: string): boolean {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.cardCount !== 1) return false;
    
    player.hasCalledUno = true;
    this.onStateChange(this.gameState);
    return true;
  }
  
  // 质疑其他玩家没喊UNO
  challengeUno(challengerId: string, targetId: string): { success: boolean; message: string } {
    const challenger = this.room.players.find(p => p.id === challengerId);
    const target = this.room.players.find(p => p.id === targetId);
    
    if (!challenger || !target) {
      return { success: false, message: '玩家不存在' };
    }
    
    // 只能质疑剩1张牌的玩家
    if (target.cardCount !== 1) {
      return { success: false, message: '该玩家手牌不是1张，无需质疑' };
    }
    
    // 检查该玩家是否已喊UNO
    if (target.hasCalledUno) {
      // 质疑失败，质疑者罚摸2张
      this.drawCards(challengerId, 2, true);
      return { success: false, message: `${target.nickname}已喊UNO，质疑失败！${challenger.nickname}罚摸2张` };
    } else {
      // 质疑成功，被质疑者罚摸2张
      this.drawCards(targetId, 2, true);
      return { success: true, message: `${target.nickname}没喊UNO！质疑成功，${target.nickname}罚摸2张` };
    }
  }
  
  // 结束游戏（改为记录排名模式）
  private endGame(finishedPlayer: Player): void {
    // 确保排名数组存在
    if (!this.gameState.rankings) {
      this.gameState.rankings = [];
    }
    
    // 如果玩家已经排名过了，不再重复添加
    if (this.gameState.rankings.includes(finishedPlayer.id)) {
      return;
    }
    
    // 将出完牌的玩家加入排名
    this.gameState.rankings.push(finishedPlayer.id);
    
    // 广播排名更新（通知所有玩家有人出完牌了）
    this.onStateChange(this.gameState);
    
    // 检查是否只剩一个玩家未出完牌（或所有玩家都出完了）
    const activePlayers = this.room.players.filter(p => 
      !this.gameState.rankings!.includes(p.id) && p.cardCount > 0
    );
    
    // 如果只剩一个玩家或所有玩家都出完了，游戏结束
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        // 最后剩下的玩家是最后一名
        this.gameState.rankings.push(activePlayers[0]!.id);
      }
      
      if (this.turnTimer) {
        clearInterval(this.turnTimer);
      }
      
      this.room.status = 'finished';
      this.gameState.isRoundEnded = true;
      // 第一名作为winner（兼容旧逻辑）
      const firstPlaceId = this.gameState.rankings[0];
      const winner = this.room.players.find(p => p.id === firstPlaceId);
      if (winner) {
        this.gameState.winner = winner.id;
        this.onGameEnd(winner);
      }
    }
    // 否则游戏继续，轮到下一家
  }
  
  // 检查是否可以抢牌出
  canJumpIn(playerId: string, cardId: string): boolean {
    // 检查房间设置是否允许抢牌出
    if (!this.room.settings.allowJumpIn) return false;
    
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return false;
    
    // 不能在自己的回合抢牌
    if (this.gameState.currentPlayerId === playerId) return false;
    
    const card = player.cards.find(c => c.id === cardId);
    if (!card) return false;
    
    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    if (!topCard) return false;
    
    // 抢牌出条件：必须和顶牌完全相同（颜色+类型+数值都相同）
    // 万能牌不能抢
    if (card.type === 'wild' || card.type === 'draw4') return false;
    
    // 必须是完全相同的牌
    if (card.color !== topCard.color) return false;
    if (card.type !== topCard.type) return false;
    if (card.value !== topCard.value) return false;
    
    return true;
  }
  
  // 获取可以抢牌出的牌列表（用于前端高亮）
  getJumpInCards(playerId: string): Card[] {
    if (!this.room.settings.allowJumpIn) return [];
    
    const player = this.room.players.find(p => p.id === playerId);
    if (!player || this.gameState.currentPlayerId === playerId) return [];
    
    const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
    if (!topCard) return [];
    
    return player.cards.filter(card => {
      if (card.type === 'wild' || card.type === 'draw4') return false;
      return card.color === topCard.color && 
             card.type === topCard.type && 
             card.value === topCard.value;
    });
  }
  
  // 执行抢牌出
  jumpIn(playerId: string, cardId: string): boolean {
    if (!this.canJumpIn(playerId, cardId)) return false;
    
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return false;
    
    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;
    
    const card = player.cards[cardIndex];
    
    // 清除连打状态（抢牌出可以打断连打）
    this.gameState.pendingDraw = undefined;
    this.gameState.pendingDrawType = undefined;
    
    // 记录动作
    this.gameState.lastAction = {
      type: 'jumpIn',
      playerId,
      card,
      timestamp: Date.now()
    };
    
    // 移除手牌
    player.cards.splice(cardIndex, 1);
    player.cardCount = player.cards.length;
    player.hasCalledUno = false; // 重置UNO状态
    
    // 添加到弃牌堆
    this.gameState.discardPile.push(card);
    this.gameState.currentColor = card.color;
    
    // 检查是否出完牌
    if (player.cardCount === 0) {
      this.endGame(player);
      // 如果游戏还没有真正结束（还有人在玩），抢牌者轮完轮到下一家
      if (this.room.status === 'playing') {
        this.gameState.currentPlayerId = playerId;
        this.handleCardEffect(card);
      }
      return true;
    }
    
    // 抢牌出后，轮到抢牌者的下一家
    // 暂时设置为抢牌者，然后nextTurn就会到下一家
    this.gameState.currentPlayerId = playerId;
    this.handleCardEffect(card);
    
    return true;
  }
  
  // 销毁游戏
  destroy(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
    }
  }
}
