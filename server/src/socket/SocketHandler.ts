import { Server, Socket } from 'socket.io';
import { RoomManager, roomManager } from '../rooms/RoomManager.js';
import { UnoGame } from '../game/UnoGame.js';
import { SocketEvents, Player, Room, RoomSettings, UserSession } from '../shared/index.js';

// 存储 socket 到 userId 的映射
const socketUserMap = new Map<string, string>();

// 存储活跃的游戏实例
const activeGames = new Map<string, UnoGame>();

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);
    
    // ========== 房间事件 ==========
    
    // 用户认证/注册（连接时发送 userId）
    socket.on('auth', (data: { userId: string; nickname: string }) => {
      socketUserMap.set(socket.id, data.userId);
      console.log(`Socket ${socket.id} authenticated as user ${data.userId}`);
    });

    // 创建房间
    socket.on(SocketEvents.CREATE_ROOM, (data: { nickname: string; userId?: string }) => {
      try {
        // 优先使用传入的 userId，否则使用 socket id（兼容旧版本）
        const userId = data.userId || socketUserMap.get(socket.id) || socket.id;
        const room = roomManager.createRoom(userId, data.nickname);
        socket.join(room.code);
        socket.emit(SocketEvents.CREATE_ROOM, { success: true, room, userId });
        console.log(`Room created: ${room.code} by ${data.nickname} (${userId})`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'CREATE_ROOM_FAILED', message: '创建房间失败' });
      }
    });
    
    // 加入房间
    socket.on(SocketEvents.JOIN_ROOM, (data: { roomCode: string; nickname: string; userId?: string }) => {
      try {
        // 优先使用传入的 userId，否则使用 socket id
        const userId = data.userId || socketUserMap.get(socket.id) || socket.id;
        const room = roomManager.joinRoom(data.roomCode, userId, data.nickname);
        if (!room) {
          socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在或已满' });
          return;
        }
        
        socket.join(data.roomCode);
        // 广播完整的房间状态更新给所有玩家（包括新加入的玩家）
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        socket.emit(SocketEvents.JOIN_ROOM, { success: true, room, userId });
        console.log(`${data.nickname} joined room: ${data.roomCode} (${userId})`);
      } catch (error) {
        socket.emit(SocketEvents.ERROR, { code: 'JOIN_ROOM_FAILED', message: '加入房间失败' });
      }
    });
    
    // 离开房间
    socket.on(SocketEvents.LEAVE_ROOM, () => {
      const userId = socketUserMap.get(socket.id) || socket.id;
      const room = roomManager.leaveRoom(userId);
      if (room) {
        socket.leave(room.code);
        socket.to(room.code).emit(SocketEvents.PLAYER_LEFT, { playerId: userId });
        io.to(room.code).emit(SocketEvents.ROOM_UPDATED, room);
        socketUserMap.delete(socket.id);
      }
    });
    
    // 断开连接
    socket.on('disconnect', () => {
      const userId = socketUserMap.get(socket.id);
      console.log('Client disconnected:', socket.id, 'userId:', userId);
      
      if (userId) {
        const room = roomManager.getPlayerRoom(userId);
        
        if (room) {
          if (room.status === 'waiting') {
            // 等待状态：直接移除玩家，不需要重连
            const updatedRoom = roomManager.leaveRoom(userId);
            if (updatedRoom) {
              // 先广播事件，再离开房间
              io.to(room.code).emit(SocketEvents.ROOM_UPDATED, updatedRoom);
              socket.to(room.code).emit(SocketEvents.PLAYER_LEFT, { playerId: userId });
              socket.leave(room.code);
              console.log(`Player ${userId} left room ${room.code} (waiting status), remaining players: ${updatedRoom.players.length}`);
            }
          } else {
            // 游戏进行中：标记断开连接，支持重连
            const updatedRoom = roomManager.markPlayerDisconnected(userId);
            if (updatedRoom) {
              io.to(room.code).emit(SocketEvents.ROOM_UPDATED, updatedRoom);
              console.log(`Player ${userId} disconnected from room ${room.code} (playing status, can reconnect)`);
            }
          }
        }
        
        socketUserMap.delete(socket.id);
      }
    });
    
    // 重新连接（断线重连）- 使用固定的 userId
    socket.on('player:reconnect', (data: { roomCode: string; userId: string }) => {
      const room = roomManager.getRoom(data.roomCode);
      if (!room) {
        socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
        return;
      }
      
      // 查找断开的玩家（使用固定的 userId）
      const player = room.players.find(p => p.id === data.userId && !p.isConnected);
      if (!player) {
        socket.emit(SocketEvents.ERROR, { code: 'PLAYER_NOT_FOUND', message: '玩家不存在或已重新连接' });
        return;
      }
      
      // 更新 socket-user 映射
      socketUserMap.set(socket.id, data.userId);
      
      // 更新玩家状态（id 保持不变，只更新连接状态）
      player.isConnected = true;
      player.disconnectedAt = undefined;
      
      // 加入房间
      socket.join(data.roomCode);
      
      // 返回房间和游戏状态
      socket.emit('player:reconnected', {
        success: true,
        room,
        gameState: room.gameState,
        userId: data.userId
      });
      
      // 广播玩家重连（通知其他玩家）
      io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
      console.log(`Player ${data.userId} reconnected to room ${data.roomCode}`);
    });
    
    // ========== AI管理 ==========
    
    // 添加AI
    socket.on(SocketEvents.ADD_AI, (data: { roomCode: string; difficulty: 'easy' | 'normal' | 'hard'; aiType?: 'bot' | 'host' }) => {
      const room = roomManager.getRoom(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!room || room.hostId !== userId) {
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
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!room || room.hostId !== userId) {
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
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!room || room.hostId !== userId) {
        socket.emit(SocketEvents.ERROR, { code: 'PERMISSION_DENIED', message: '只有房主可以修改设置' });
        return;
      }
      
      if (room.status !== 'waiting') {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_ALREADY_STARTED', message: '游戏已开始，无法修改设置' });
        return;
      }
      
      if (roomManager.updateSettings(data.roomCode, userId, data.settings)) {
        io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
        console.log(`Room ${data.roomCode} settings updated:`, data.settings);
      }
    });
    
    // ========== 游戏事件 ==========
    
    // 开始游戏
    socket.on(SocketEvents.GAME_START, (data: { roomCode: string }) => {
      const room = roomManager.getRoom(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!room || room.hostId !== userId) {
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
          // 游戏结束处理
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
          
          // 重置房间状态
          room.status = 'waiting';
          room.gameState = undefined;
          room.players.forEach(p => {
            p.cards = [];
            p.cardCount = 0;
            p.hasCalledUno = false;
          });
          io.to(data.roomCode).emit(SocketEvents.ROOM_UPDATED, room);
          console.log(`Game ended in room: ${data.roomCode}, reset to waiting`);
        },
        // AI 发送消息回调
        (playerId, type, content) => {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            io.to(data.roomCode).emit(SocketEvents.RECEIVE_MESSAGE, {
              type,
              content,
              playerId,
              playerName: player.nickname,
              timestamp: Date.now()
            });
          }
        }
      );
      
      activeGames.set(data.roomCode, game);
      io.to(data.roomCode).emit(SocketEvents.GAME_START, { success: true, gameState: game.getGameState() });
      console.log(`Game started in room: ${data.roomCode}`);
    });
    
    // 出牌
    socket.on(SocketEvents.PLAY_CARD, (data: { roomCode: string; cardId: string; chosenColor?: string }) => {
      const game = activeGames.get(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      const success = game.playCard(userId, data.cardId, data.chosenColor);
      if (!success) {
        socket.emit(SocketEvents.ERROR, { code: 'INVALID_PLAY', message: '无效的出牌' });
      }
    });
    
    // 摸牌
    socket.on(SocketEvents.DRAW_CARD, (data: { roomCode: string }) => {
      const game = activeGames.get(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      // 检查是否是当前玩家
      const currentPlayer = game.getCurrentPlayer();
      if (!currentPlayer || currentPlayer.id !== userId) {
        socket.emit(SocketEvents.ERROR, { code: 'NOT_YOUR_TURN', message: '不是你的回合' });
        return;
      }
      
      // 如果有连打惩罚，摸累积的牌；否则摸1张
      const gameState = game.getGameState();
      const drawCount = gameState.pendingDraw && gameState.pendingDraw > 0 ? gameState.pendingDraw : 1;
      game.drawCards(userId, drawCount);
    });
    
    // 喊UNO
    socket.on(SocketEvents.CALL_UNO, (data: { roomCode: string }) => {
      const game = activeGames.get(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!game) return;
      
      const success = game.callUno(userId);
      if (success) {
        io.to(data.roomCode).emit('game:unoCalled', { playerId: userId });
      }
    });
    
    // 质疑UNO
    socket.on('game:challengeUno', (data: { roomCode: string; targetId: string }) => {
      const game = activeGames.get(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      const result = game.challengeUno(userId, data.targetId);
      // 无论成功失败，都广播结果给所有玩家
      io.to(data.roomCode).emit('game:challengeResult', { 
        success: result.success,
        challengerId: userId, 
        targetId: data.targetId, 
        message: result.message 
      });
    });
    
    // 抢牌出（Jump-in）
    socket.on(SocketEvents.JUMP_IN, (data: { roomCode: string; cardId: string }) => {
      const game = activeGames.get(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!game) {
        socket.emit(SocketEvents.ERROR, { code: 'GAME_NOT_FOUND', message: '游戏不存在' });
        return;
      }
      
      const success = game.jumpIn(userId, data.cardId);
      if (!success) {
        socket.emit(SocketEvents.ERROR, { code: 'INVALID_JUMP_IN', message: '无法抢牌出' });
      } else {
        // 广播抢牌出成功
        io.to(data.roomCode).emit('game:jumpInSuccess', { playerId: userId, cardId: data.cardId });
      }
    });
    
    // 发送聊天消息（emoji/文字）
    socket.on(SocketEvents.SEND_MESSAGE, (data: { roomCode: string; type: 'emoji' | 'text'; content: string }) => {
      const room = roomManager.getRoom(data.roomCode);
      const userId = socketUserMap.get(socket.id) || socket.id;
      if (!room) {
        socket.emit(SocketEvents.ERROR, { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
        return;
      }
      
      const player = room.players.find(p => p.id === userId);
      if (!player) {
        socket.emit(SocketEvents.ERROR, { code: 'PLAYER_NOT_FOUND', message: '玩家不在房间中' });
        return;
      }
      
      // 广播消息给房间所有玩家
      io.to(data.roomCode).emit(SocketEvents.RECEIVE_MESSAGE, {
        type: data.type,
        content: data.content,
        playerId: userId,
        playerName: player.nickname,
        timestamp: Date.now()
      });
    });
  });
}
