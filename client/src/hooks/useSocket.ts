import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, Player, GameState, RoomSettings } from '../../../shared/types';

interface SocketState {
  isConnected: boolean;
  socketId: string | null;
  error: string | null;
}

interface UseSocketReturn extends SocketState {
  socket: Socket | null;
  createRoom: (nickname: string) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  leaveRoom: () => void;
  addAI: (roomCode: string, difficulty: 'easy' | 'normal' | 'hard', aiType?: 'bot' | 'host') => void;
  removeAI: (roomCode: string, aiId: string) => void;
  startGame: (roomCode: string) => void;
  playCard: (roomCode: string, cardId: string, chosenColor?: string) => void;
  drawCard: (roomCode: string) => void;
  callUno: (roomCode: string) => void;
  challengeUno: (roomCode: string, targetId: string) => void;
  jumpIn: (roomCode: string, cardId: string) => void;
  updateSettings: (roomCode: string, settings: Partial<RoomSettings>) => void;
  reconnect: (roomCode: string, playerId: string) => void;
  sendMessage: (roomCode: string, type: 'emoji' | 'text', content: string) => void;
}

export function useSocket(
  serverUrl: string,
  userId: string,
  nickname: string,
  onRoomCreated?: (room: Room) => void,
  onRoomJoined?: (room: Room) => void,
  onRoomUpdated?: (room: Room) => void,
  onPlayerJoined?: (data: { playerId: string; nickname: string; isAI?: boolean }) => void,
  onPlayerLeft?: (data: { playerId: string }) => void,
  onGameStarted?: (gameState: GameState) => void,
  onGameState?: (gameState: GameState) => void,
  onGameEnded?: (data: { winner: Player }) => void,
  onError?: (error: { code: string; message: string }) => void
): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    socketId: null,
    error: null
  });
  
  // 保存 userId 用于重连
  const userIdRef = useRef(userId);
  
  // 使用 ref 保存回调，避免闭包问题
  const callbacksRef = useRef({
    onRoomCreated,
    onRoomJoined,
    onRoomUpdated,
    onPlayerJoined,
    onPlayerLeft,
    onGameStarted,
    onGameState,
    onGameEnded,
    onError
  });
  
  // 更新 ref 中的回调
  useEffect(() => {
    callbacksRef.current = {
      onRoomCreated,
      onRoomJoined,
      onRoomUpdated,
      onPlayerJoined,
      onPlayerLeft,
      onGameStarted,
      onGameState,
      onGameEnded,
      onError
    };
  }, [onRoomCreated, onRoomJoined, onRoomUpdated, onPlayerJoined, onPlayerLeft, onGameStarted, onGameState, onGameEnded, onError]);

  // 初始化Socket连接
  useEffect(() => {
    console.log('Connecting to server:', serverUrl);
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setState({
        isConnected: true,
        socketId: socket.id || null,
        error: null
      });
      // 发送认证信息
      socket.emit('auth', { userId: userIdRef.current, nickname });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setState(prev => ({
        ...prev,
        isConnected: false
      }));
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setState(prev => ({
        ...prev,
        error: '连接服务器失败'
      }));
    });

    // 房间事件
    socket.on('room:create', (data) => {
      if (data.success && callbacksRef.current.onRoomCreated) {
        callbacksRef.current.onRoomCreated(data.room);
      }
    });

    socket.on('room:join', (data) => {
      if (data.success && callbacksRef.current.onRoomJoined) {
        callbacksRef.current.onRoomJoined(data.room);
      }
    });

    socket.on('room:updated', (room) => {
      console.log('Room updated:', room.code, 'players:', room.players.length);
      if (callbacksRef.current.onRoomUpdated) {
        callbacksRef.current.onRoomUpdated(room);
      }
    });

    socket.on('room:playerJoined', (data) => {
      if (callbacksRef.current.onPlayerJoined) {
        callbacksRef.current.onPlayerJoined(data);
      }
    });

    socket.on('room:playerLeft', (data) => {
      if (callbacksRef.current.onPlayerLeft) {
        callbacksRef.current.onPlayerLeft(data);
      }
    });

    // 游戏事件
    socket.on('game:start', (data) => {
      if (data.success && callbacksRef.current.onGameStarted) {
        callbacksRef.current.onGameStarted(data.gameState);
      }
    });

    socket.on('game:state', (gameState) => {
      if (callbacksRef.current.onGameState) {
        callbacksRef.current.onGameState(gameState);
      }
    });

    socket.on('game:ended', (data) => {
      if (callbacksRef.current.onGameEnded) {
        callbacksRef.current.onGameEnded(data);
      }
    });

    // 质疑结果
    socket.on('game:challengeResult', (data) => {
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError({ code: data.success ? 'CHALLENGE_SUCCESS' : 'CHALLENGE_FAILED', message: data.message });
      }
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  // 房间操作
  const createRoom = useCallback((nickname: string) => {
    socketRef.current?.emit('room:create', { nickname, userId: userIdRef.current });
  }, []);

  const joinRoom = useCallback((roomCode: string, nickname: string) => {
    socketRef.current?.emit('room:join', { roomCode, nickname, userId: userIdRef.current });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
  }, []);

  // AI管理
  const addAI = useCallback((roomCode: string, difficulty: 'easy' | 'normal' | 'hard', aiType?: 'bot' | 'host') => {
    socketRef.current?.emit('ai:add', { roomCode, difficulty, aiType });
  }, []);

  const removeAI = useCallback((roomCode: string, aiId: string) => {
    socketRef.current?.emit('ai:remove', { roomCode, aiId });
  }, []);

  // 游戏操作
  const startGame = useCallback((roomCode: string) => {
    socketRef.current?.emit('game:start', { roomCode });
  }, []);

  const playCard = useCallback((roomCode: string, cardId: string, chosenColor?: string) => {
    socketRef.current?.emit('game:playCard', { roomCode, cardId, chosenColor });
  }, []);

  const drawCard = useCallback((roomCode: string) => {
    socketRef.current?.emit('game:drawCard', { roomCode });
  }, []);

  const callUno = useCallback((roomCode: string) => {
    socketRef.current?.emit('game:callUno', { roomCode });
  }, []);

  const challengeUno = useCallback((roomCode: string, targetId: string) => {
    socketRef.current?.emit('game:challengeUno', { roomCode, targetId });
  }, []);

  const jumpIn = useCallback((roomCode: string, cardId: string) => {
    socketRef.current?.emit('game:jumpIn', { roomCode, cardId });
  }, []);

  const updateSettings = useCallback((roomCode: string, settings: Partial<RoomSettings>) => {
    socketRef.current?.emit('room:updateSettings', { roomCode, settings });
  }, []);

  const reconnect = useCallback((roomCode: string, _playerId: string) => {
    // 使用固定的 userId 而不是 playerId
    socketRef.current?.emit('player:reconnect', { roomCode, userId: userIdRef.current });
  }, []);

  const sendMessage = useCallback((roomCode: string, type: 'emoji' | 'text', content: string) => {
    socketRef.current?.emit('chat:send', { roomCode, type, content });
  }, []);

  return {
    socket: socketRef.current,
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    addAI,
    removeAI,
    startGame,
    playCard,
    drawCard,
    callUno,
    challengeUno,
    jumpIn,
    updateSettings,
    reconnect,
    sendMessage
  };
}
