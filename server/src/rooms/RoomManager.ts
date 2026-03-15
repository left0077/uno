import { Room, Player, RoomSettings } from '../shared/index.js';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map();
  
  // 生成4位房间号
  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(code));
    return code;
  }
  
  // 创建房间
  createRoom(hostId: string, hostNickname: string, settings?: Partial<RoomSettings>): Room {
    const code = this.generateRoomCode();
    const room: Room = {
      id: uuidv4(),
      code,
      players: [{
        id: hostId,
        nickname: hostNickname,
        isHost: true,
        isAI: false,
        cards: [],
        cardCount: 0,
        isConnected: true,
        isReady: false
      }],
      status: 'waiting',
      hostId,
      maxPlayers: 8,
      createdAt: Date.now(),
      settings: {
        allowStacking: true,
        allowMultipleCards: true,
        allowJumpIn: true,
        scoringMode: true,
        ...settings
      }
    };
    
    this.rooms.set(code, room);
    this.playerRoomMap.set(hostId, code);
    
    return room;
  }
  
  // 加入房间
  joinRoom(roomCode: string, playerId: string, nickname: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.status !== 'waiting') return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.players.some(p => p.id === playerId)) return room;
    
    const player: Player = {
      id: playerId,
      nickname,
      isHost: false,
      isAI: false,
      cards: [],
      cardCount: 0,
      isConnected: true,
      isReady: false
    };
    
    room.players.push(player);
    this.playerRoomMap.set(playerId, roomCode);
    
    return room;
  }
  
  // 离开房间
  leaveRoom(playerId: string): Room | null {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return null;
    
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);
    
    // 如果房主离开，转让房主
    if (room.hostId === playerId && room.players.length > 0) {
      const firstHuman = room.players.find(p => !p.isAI);
      if (firstHuman) {
        room.hostId = firstHuman.id;
        // 先清除所有玩家的isHost，再设置新房主
        room.players.forEach(p => p.isHost = false);
        firstHuman.isHost = true;
      } else {
        // 全是AI，解散房间
        this.rooms.delete(roomCode);
        return null;
      }
    }
    
    // 房间空了，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      return null;
    }
    
    return room;
  }
  
  // 获取房间
  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }
  
  // 获取玩家所在房间
  getPlayerRoom(playerId: string): Room | undefined {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }
  
  // 添加AI
  addAI(roomCode: string, difficulty: 'easy' | 'normal' | 'hard', aiType: 'bot' | 'host' = 'bot'): Player | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.status !== 'waiting') return null;
    if (room.players.length >= room.maxPlayers) return null;
    
    // 抽象名字 - 机器人（4/5/7字，有节奏感）
    const botNames = [
      // 四字
      '纯真顶针', '赛博顶针', '悦刻五代', '雪豹闭嘴', '一眼鉴定',
      '疯狂奶龙', '暗黑奶龙', '超级奶龙', '奶龙战神', '暴龙战士',
      '耗子尾汁', '不讲武德', '浑元形意', '闪电五鞭', '松果痰抖',
      '鸡你太美', '练习两年', '篮球坤坤', '中分背带', '你干嘛哎',
      '儒雅随和', '天皇陛下', '独立宣言', '好果汁儿', '土豆刀哥',
      '咬打火机', '烂活刀哥', '沈阳大街', '东百往事', '白金汉宫',
      '我爱实话', '画画的北', '葬爱家族', '贵族气质', '火星文字',
      '大马猴王', '套你猴子', '十七张牌', '伞兵一号', '给阿姨倒',
      // 五字
      '理塘最速传', '电子鉴定师', '悦刻五代针', '雪豹我们走',
      '一眼真鉴定', '狂暴奶龙王', '奶龙毁灭者', '超级奶龙人',
      '闪电五连鞭', '浑元太极门', '耗子尾汁啊', '年轻人不讲',
      '练习两年半', '鸡你太美坤', '中分背带裤', '你干嘛哎哟',
      '沈阳好果汁', '咬打火机呀', '土豆炖刀哥', '葬爱大家族',
      // 七字
      '纯真丁真鉴定为真', '雪豹闭嘴理塘传说', '悦刻五代雪豹同款',
      '疯狂奶龙毁灭世界', '暗黑奶龙战士变身', '超级奶龙暴龙合体',
      '年轻人不讲武德啊', '耗子尾汁好好反思', '浑元形意太极掌门',
      '闪电五连鞭法大师', '松果痰抖闪电鞭法', '练习时长两年半了',
      '鸡你太美篮球坤坤', '你干嘛哎哟你好烦', '中分头背带裤坤',
      '沈阳大街好果汁儿', '独立宣言整活虎哥', '咬打火机烂活刀哥',
      '葬爱家族贵族气质', '火星文字杀马特啊', '套你猴子大马猴王'
    ];
    // 抽象名字 - 托管
    const hostNames = [
      // 四字
      '电子丁真', '蒸汽顶针', '理塘王子', '雪豹朋友', '一眼假啊',
      '狂暴奶龙', '奶龙之神', '暗黑暴龙', '超级赛亚', '毁灭战士',
      '抽象带篮', '秋秋文学', '腾杨天下', '山泥若啊', '少主若子',
      '动物园长', '电棍otto', '选购炫狗', ' pigff ', '小猪佩奇',
      // 五字
      '理塘纯真王', '雪豹我的朋友', '悦刻五代针', '一眼鉴定师',
      '暗黑奶龙王', '狂暴奶龙人', '超级赛亚龙', '毁灭奶龙神',
      '抽象工作室', '秋秋大魔王', '腾杨大少主', '山泥若少主',
      // 七字
      '理塘丁真纯真眼神', '雪豹我的朋友快跑', '悦刻五代理塘特产',
      '狂暴奶龙毁灭一切', '暗黑奶龙超级进化', '抽象带篮子大师',
      '秋秋文学带专王者', '腾杨天下山泥若啊', '动物园长电棍王',
      '选购炫狗pigff啊', '小猪佩奇身上纹啊'
    ];
    const usedNames = new Set(room.players.map(p => p.nickname));
    
    const namePool = aiType === 'bot' ? botNames : hostNames;
    // 随机打乱名字池，然后找一个未被使用的
    const shuffledNames = [...namePool].sort(() => Math.random() - 0.5);
    const availableName = shuffledNames.find(name => !usedNames.has(name)) || 
                          `网友${room.players.length}号`;
    
    const aiPlayer: Player = {
      id: `ai-${uuidv4()}`,
      nickname: availableName,
      isHost: false,
      isAI: true,
      aiType, // 'bot'=机器人(立即出牌), 'host'=托管
      aiDifficulty: difficulty,
      cards: [],
      cardCount: 0,
      isConnected: true,
      isReady: true
    };
    
    room.players.push(aiPlayer);
    return aiPlayer;
  }
  
  // 移除AI
  removeAI(roomCode: string, aiId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.status !== 'waiting') return false;
    
    const aiIndex = room.players.findIndex(p => p.id === aiId && p.isAI);
    if (aiIndex === -1) return false;
    
    room.players.splice(aiIndex, 1);
    return true;
  }
  
  // 踢出玩家（房主权限）
  kickPlayer(roomCode: string, targetId: string, hostId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.hostId !== hostId) return false;
    if (room.status !== 'waiting') return false;
    
    const target = room.players.find(p => p.id === targetId);
    if (!target) return false;
    if (target.isHost) return false;
    
    room.players = room.players.filter(p => p.id !== targetId);
    this.playerRoomMap.delete(targetId);
    
    return true;
  }
  
  // 更新房间设置（房主权限，仅限waiting状态）
  updateSettings(roomCode: string, hostId: string, settings: Partial<RoomSettings>): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.hostId !== hostId) return false;
    if (room.status !== 'waiting') return false;
    
    room.settings = {
      ...room.settings,
      ...settings
    };
    return true;
  }
  
  // 清理过期房间（30分钟无活动，或游戏已结束，或房间为空）
  cleanupExpiredRooms(): void {
    const now = Date.now();
    const expiredRooms: string[] = [];
    
    this.rooms.forEach((room, code) => {
      // 1. 房间为空，立即删除
      if (room.players.length === 0) {
        expiredRooms.push(code);
        return;
      }
      
      // 2. 检查是否全是AI（没有真人玩家），立即删除
      const hasHumanPlayer = room.players.some(p => !p.isAI);
      if (!hasHumanPlayer) {
        expiredRooms.push(code);
        return;
      }
      
      // 3. 检查是否有玩家断开连接超过5分钟
      const disconnectedPlayers = room.players.filter(p => !p.isConnected && p.disconnectedAt);
      const allDisconnected = room.players.length > 0 && disconnectedPlayers.length === room.players.length;
      const allDisconnectedExpired = allDisconnected && disconnectedPlayers.every(p => 
        p.disconnectedAt && now - p.disconnectedAt > 5 * 60 * 1000
      );
      if (allDisconnectedExpired) {
        expiredRooms.push(code);
        return;
      }
      
      // 4. 30分钟过期的房间
      const isExpired = now - room.createdAt > 30 * 60 * 1000;
      const shouldCleanup = (room.status === 'waiting' || room.status === 'finished') && isExpired;
      
      if (shouldCleanup) {
        expiredRooms.push(code);
      }
    });
    
    expiredRooms.forEach(code => {
      const room = this.rooms.get(code);
      if (room) {
        room.players.forEach(p => this.playerRoomMap.delete(p.id));
        this.rooms.delete(code);
        console.log(`Room ${code} cleaned up`);
      }
    });
    
    if (expiredRooms.length > 0) {
      console.log(`Cleaned up ${expiredRooms.length} rooms`);
    }
  }
  
  // 标记玩家断开连接
  markPlayerDisconnected(playerId: string): Room | null {
    const roomCode = this.playerRoomMap.get(playerId);
    if (!roomCode) return null;
    
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = false;
      player.disconnectedAt = Date.now();
    }
    
    return room;
  }
  
  // 更新玩家房间映射（用于重连）
  updatePlayerRoomMap(playerId: string, roomCode: string, removeOnly: boolean = false): void {
    if (removeOnly) {
      this.playerRoomMap.delete(playerId);
    } else {
      this.playerRoomMap.set(playerId, roomCode);
    }
  }
}

// 单例实例
export const roomManager = new RoomManager();
