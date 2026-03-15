import { Server, Socket } from 'socket.io';
import { RoomManager, roomManager } from '../rooms/RoomManager.js';
import { UnoGame } from '../game/UnoGame.js';
import { SocketEvents, Player, Room, RoomSettings } from '../shared/index.js';

// 存储活跃的游戏实例
const activeGames = new Map<string, UnoGame>();

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);
    
    // ========== 房间事件 ==========
    
    // 创建房间
    socket.on(SocketEvents.CREATE_ROOM, (data: { nickname: string }) => {
      try {
        const room = roomManager.createRoom(socket.id, data.nickname);
        socket.join(room.code);
        socket.emit(SocketEvents.CREATE_ROOM, { success: true, room });
        console.log(`Room created: ${room.code} by ${data.nickname}`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'CREATE_ROOM_FAILED', message: '创建房间失败' });
      }
    });
    
    // 加入房间
    socket.on(SocketEvents.JOIN_ROOM, (data: { roomCode: string; nickname: string }) => {
      try {
        const room = roomManager.joinRoom(data.roomCode, socket.id, data.nickname);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在或已满' });
          return;
        }
        
        socket.join(data.roomCode);
        // 广播完整的房间状态更新给所有玩家（包括新加入的玩家）
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        socket.emit(SocketEvents.JOIN_ROOM, { success: true, room });
        console.log(`${data.nickname} joined room: ${data.roomCode}`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'JOIN_ROOM_FAILED', message: '加入房间失败' });
      }
    });
    
    // 离开房间
    socket.on(SocketEvents.LEAVE_ROOM, () => {
      const room = roomManager.leaveRoom(socket.id);
      if (room) {
        socket.leave(room.code);
        socket.to(room.code).emit(SocketEvents.PLAYER_LEFT, { playerId: socket.id });
        io.to(room.code).emit(SocketEvents.ROOM_UPDATED, room);
      }
    });
    
    // 断开连接
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // 先处理玩家离开房间（这会触发房主转让）
      const updatedRoom = roomManager.leaveRoom(socket.id);
      if (updatedRoom) {
        // 如果游戏正在进行，清理游戏实例
        if (updatedRoom.status === 'playing' && activeGames.has(updatedRoom.code)) {
          const game = activeGames.get(updatedRoom.code)!;
          game.destroy();
          activeGames.delete(updatedRoom.code);
          console.log(`Game destroyed for room: ${updatedRoom.code}`);
        }
        
        io.to(updatedRoom.code).emit(SocketEvents.PLAYER_LEFT, { playerId: socket.id });
        io.to(updatedRoom.code).emit(SocketEvents.ROOM_UPDATED, updatedRoom);
      }
    });
    
    // ========== AI管理 ==========
    
    // 添加AI
    socket.on(SocketEvents.ADD_AI, (data: { roomCode: string; difficulty: 'easy' | 'normal' | 'hard'; aiType?: 'bot' | 'host' }) => {
      const room = roomManager.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以添加AI' });
        return;
      }
      
      const aiPlayer = roomManager.addAI(data.roomCode, data.difficulty, data.aiType || 'bot');
      if (aiPlayer) {
        io.to(data.roomCode).emit(SocketEvents.PLAYER_JOINED, {
          playerId: aiPlayer.id,
          nickname: aiPlayer.nickname,
          isAI: true,
          aiType: aiPlayer.aiType
        });
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
      }
    });
    
    // 移除AI
    socket.on(SocketEvents.REMOVE_AI, (data: { roomCode: string; aiId: string }) => {
      const room = roomManager.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以移除AI' });
        return;
      }
      
      if (roomManager.removeAI(data.roomCode, data.aiId)) {
        io.to(data.roomCode).emit(SocketEvents.PLAYER_LEFT, { playerId: data.aiId });
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
      }
    });
    
    // 更新房间设置
    socket.on('room:updateSettings', (data: { roomCode: string; settings: Partial<RoomSettings> }) => {
      const room = roomManager.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以修改设置' });
        return;
      }
      
      if (room.status !== 'waiting') {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_ALREADY_STARTED', message: '游戏已开始，无法修改设置' });
        return;
      }
      
      if (roomManager.updateSettings(data.roomCode, socket.id, data.settings)) {
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`Room ${data.roomCode} settings updated:`, data.settings);
      }
    });
    
    // ========== 游戏事件 ==========
    
    // 开始游戏
    socket.on(SocketEvents.GAME_START, (data: { roomCode: string }) => {
      const room = roomManager.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以开始游戏' });
        return;
      }
      
      if (room.players.length < 2) {
        socket.emit(SocketEvents.ERROR, { code: 'NOT_ENOUGH_PLAYERS', message: '至少需要2人才能开始游戏' });
        return;
      }
      
      if (room.status !== 'waiting') {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_ALREADY_STARTED', message: '游戏已经开始' });
        return;
      }
      
      // 创建游戏实例
      const game = new UnoGame(
        room,
        (state) => {
          io.to(data.roomCode).emit(SocketEvents.GAME_STATE, state);
        },
        (winner) => {
          // 获取完整的排名信息
          const rankings = room.gameState?.rankings || [winner.id];
          const rankedPlayers = rankings.map((playerId, index) => {
            const player = room.players.find(p => p.id === playerId);
            return {
              rank: index + 1,
              playerId,
              nickname: player?.nickname || '未知玩家'
            };
          });
          
          io.to(data.roomCode).emit('game:ended', { winner, rankings: rankedPlayers });
          activeGames.delete(data.roomCode);
          
          // 重置房间状态，允许开始新游戏
          room.status = 'waiting';
          room.gameState = undefined;
          // 清空玩家手牌和UNO状态，但保留房主身份
          room.players.forEach(p => {
            p.cards = [];
            p.cardCount = 0;
            p.hasCalledUno = false;
            // 注意：不要修改isHost和hostId
          });
          io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
          console.log(`Game ended in room: ${data.roomCode}, reset to waiting`);
        }
      );
      
      activeGames.set(data.roomCode, game);
      io.to(data.roomCode).emit(SocketEvents.GAME_START, { success: true, gameState: game.getGameState() });
      console.log(`Game started in room: ${data.roomCode}`);
    });
    
    // 出牌
    socket.on(SocketEvents.PLAY_CARD, (data: { roomCode: string; cardId: string; chosenColor?: string }) => {
      const game = activeGames.get(data.roomCode);
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      const success = game.playCard(socket.id, data.cardId, data.chosenColor);
      if (!success) {
        socket.emit(SocketEvents.ERROR, { code: 'INVALID_PLAY', message: '无效的出牌' });
      }
    });
    
    // 摸牌
    socket.on(SocketEvents.DRAW_CARD, (data: { roomCode: string }) => {
      const game = activeGames.get(data.roomCode);
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      // 检查是否是当前玩家
      const currentPlayer = game.getCurrentPlayer();
      if (!currentPlayer || currentPlayer.id !== socket.id) {
        socket.emit(SocketEvents.ERROR, { code: 'NOT_YOUR_TURN', message: '不是你的回合' });
        return;
      }
      
      // 如果有连打惩罚，摸累积的牌；否则摸1张
      const gameState = game.getGameState();
      const drawCount = gameState.pendingDraw && gameState.pendingDraw > 0 ? gameState.pendingDraw : 1;
      game.drawCards(socket.id, drawCount);
    });
    
    // 喊UNO
    socket.on(SocketEvents.CALL_UNO, (data: { roomCode: string }) => {
      const game = activeGames.get(data.roomCode);
      if (!game) return;
      
      const success = game.callUno(socket.id);
      if (success) {
        io.to(data.roomCode).emit('game:unoCalled', { playerId: socket.id });
      }
    });
    
    // 质疑UNO
    socket.on('game:challengeUno', (data: { roomCode: string; targetId: string }) => {
      const game = activeGames.get(data.roomCode);
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      const result = game.challengeUno(socket.id, data.targetId);
      // 无论成功失败，都广播结果给所有玩家
      io.to(data.roomCode).emit('game:challengeResult', { 
        success: result.success,
        challengerId: socket.id, 
        targetId: data.targetId, 
        message: result.message 
      });
    });
    
    // 抢牌出（Jump-in）
    socket.on(SocketEvents.JUMP_IN, (data: { roomCode: string; cardId: string }) => {
      const game = activeGames.get(data.roomCode);
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      const success = game.jumpIn(socket.id, data.cardId);
      if (!success) {
        socket.emit(SocketEvents.ERROR, { code: 'INVALID_JUMP_IN', message: '无法抢牌出' });
      } else {
        // 广播抢牌出成功
        io.to(data.roomCode).emit('game:jumpInSuccess', { playerId: socket.id, cardId: data.cardId });
      }
    });
  });
}
