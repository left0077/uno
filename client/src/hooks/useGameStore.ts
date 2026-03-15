import { useState, useCallback } from 'react';
import type { Room, Player, GameState, Card } from '../../../shared/types';

// 默认服务器地址 - Render 部署的后端
const DEFAULT_SERVER_URL = 'https://uno-server-jbbr.onrender.com';

interface GameStore {
  // 玩家信息
  currentPlayer: Player | null;
  nickname: string;
  setNickname: (name: string) => void;
  
  // 服务器配置
  serverUrl: string;
  setServerUrl: (url: string) => void;
  resetToDefaultServer: () => void;
  
  // 房间信息
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
  
  // 游戏状态
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
  
  // 错误信息
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 手牌排序
  handSortMode: 'color' | 'number' | 'type' | 'smart';
  setHandSortMode: (mode: 'color' | 'number' | 'type' | 'smart') => void;
  
  // 设置面板
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  
  // 获取当前玩家
  getCurrentPlayerInRoom: () => Player | undefined;
  
  // 获取可出牌
  getPlayableCards: () => Card[];
  
  // 是否是当前玩家的回合
  isMyTurn: () => boolean;
  
  // 重置状态
  reset: () => void;
}

export function useGameStore(): GameStore {
  const [nickname, setNicknameState] = useState<string>(() => {
    return localStorage.getItem('uno-nickname') || '';
  });
  
  const [serverUrl, setServerUrlState] = useState<string>(() => {
    return localStorage.getItem('uno-server-url') || DEFAULT_SERVER_URL;
  });
  
  const [showSettings, setShowSettingsState] = useState(false);
  
  // 从 localStorage 恢复房间和游戏状态
  const [currentRoom, setCurrentRoomState] = useState<Room | null>(() => {
    const saved = localStorage.getItem('uno-current-room');
    return saved ? JSON.parse(saved) : null;
  });
  const [gameState, setGameStateState] = useState<GameState | null>(() => {
    const saved = localStorage.getItem('uno-game-state');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setErrorState] = useState<string | null>(null);
  const [handSortMode, setHandSortMode] = useState<'color' | 'number' | 'type' | 'smart'>('color');

  const setNickname = useCallback((name: string) => {
    localStorage.setItem('uno-nickname', name);
    setNicknameState(name);
  }, []);
  
  const setServerUrl = useCallback((url: string) => {
    localStorage.setItem('uno-server-url', url);
    setServerUrlState(url);
  }, []);
  
  const resetToDefaultServer = useCallback(() => {
    localStorage.removeItem('uno-server-url');
    setServerUrlState(DEFAULT_SERVER_URL);
  }, []);
  
  const setShowSettings = useCallback((show: boolean) => {
    setShowSettingsState(show);
  }, []);

  const setCurrentRoom = useCallback((room: Room | null) => {
    setCurrentRoomState(room);
    if (room) {
      localStorage.setItem('uno-current-room', JSON.stringify(room));
      // 更新当前玩家信息
      const currentPlayerId = localStorage.getItem('uno-player-id');
      if (currentPlayerId) {
        const player = room.players.find(p => p.id === currentPlayerId);
        if (player) {
          localStorage.setItem('uno-player-id', player.id);
        }
      }
    } else {
      localStorage.removeItem('uno-current-room');
      localStorage.removeItem('uno-game-state');
    }
  }, []);

  const setGameState = useCallback((state: GameState | null) => {
    setGameStateState(state);
    if (state) {
      localStorage.setItem('uno-game-state', JSON.stringify(state));
    } else {
      localStorage.removeItem('uno-game-state');
    }
  }, []);

  const setError = useCallback((err: string | null) => {
    setErrorState(err);
    if (err) {
      // 3秒后自动清除错误
      setTimeout(() => {
        setErrorState(null);
      }, 3000);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const getCurrentPlayerInRoom = useCallback(() => {
    if (!currentRoom) return undefined;
    const currentPlayerId = localStorage.getItem('uno-player-id');
    return currentRoom.players.find(p => p.id === currentPlayerId);
  }, [currentRoom]);

  const getPlayableCards = useCallback(() => {
    const player = getCurrentPlayerInRoom();
    if (!player || !gameState) return [];
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const currentColor = gameState.currentColor;
    
    return player.cards.filter(card => {
      // 万能牌随时可出
      if (card.type === 'wild' || card.type === 'draw4') {
        return true;
      }
      // 颜色匹配
      if (card.color === currentColor) {
        return true;
      }
      // 数字/类型匹配
      if (topCard && card.value === topCard.value) {
        return true;
      }
      return false;
    });
  }, [getCurrentPlayerInRoom, gameState]);

  const isMyTurn = useCallback(() => {
    if (!gameState) return false;
    const currentPlayerId = localStorage.getItem('uno-player-id');
    return gameState.currentPlayerId === currentPlayerId;
  }, [gameState]);

  const reset = useCallback(() => {
    setCurrentRoomState(null);
    setGameStateState(null);
    setErrorState(null);
    localStorage.removeItem('uno-current-room');
    localStorage.removeItem('uno-game-state');
  }, []);

  return {
    currentPlayer: getCurrentPlayerInRoom() || null,
    nickname,
    setNickname,
    serverUrl,
    setServerUrl,
    resetToDefaultServer,
    currentRoom,
    setCurrentRoom,
    gameState,
    setGameState,
    error,
    setError,
    clearError,
    handSortMode,
    setHandSortMode,
    showSettings,
    setShowSettings,
    getCurrentPlayerInRoom,
    getPlayableCards,
    isMyTurn,
    reset
  };
}
