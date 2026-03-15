import { useState, useCallback, useEffect } from 'react';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { Game } from './pages/Game';
import { SettingsModal } from './components/SettingsModal';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './hooks/useGameStore';
import type { Room as RoomType, GameState, Player, RoomSettings } from '../../shared/types';

type Page = 'home' | 'room' | 'game';

function App() {
  const store = useGameStore();
  // 根据保存的状态初始化页面
  const [page, setPage] = useState<Page>(() => {
    const savedRoom = localStorage.getItem('uno-current-room');
    const savedGameState = localStorage.getItem('uno-game-state');
    if (savedGameState) return 'game';
    if (savedRoom) return 'room';
    return 'home';
  });
  
  // 页面加载时清除过期的房间状态（如果房间已结束）
  useEffect(() => {
    const savedRoom = localStorage.getItem('uno-current-room');
    if (savedRoom) {
      const room = JSON.parse(savedRoom) as RoomType;
      if (room.status === 'finished') {
        // 如果游戏已结束，清除保存的状态
        localStorage.removeItem('uno-current-room');
        localStorage.removeItem('uno-game-state');
        setPage('home');
      }
    }
  }, []);
  
  const handleRoomCreated = useCallback((room: RoomType) => {
    store.setCurrentRoom(room);
    localStorage.setItem('uno-player-id', room.players[0].id);
    setPage('room');
  }, [store]);

  const handleRoomJoined = useCallback((room: RoomType) => {
    store.setCurrentRoom(room);
    // 找到自己的player ID
    const myPlayer = room.players.find(p => p.nickname === store.nickname);
    if (myPlayer) {
      localStorage.setItem('uno-player-id', myPlayer.id);
    }
    setPage('room');
  }, [store]);

  const handleRoomUpdated = useCallback((room: RoomType) => {
    store.setCurrentRoom(room);
  }, [store]);

  const handleGameStarted = useCallback((gameState: GameState) => {
    store.setGameState(gameState);
    setPage('game');
  }, [store]);

  const handleGameState = useCallback((gameState: GameState) => {
    store.setGameState(gameState);
  }, [store]);

  const handleGameEnded = useCallback((data: { winner: Player; rankings?: { rank: number; playerId: string; nickname: string }[] }) => {
    // 显示完整的排名
    let message = '🎉 游戏结束！\n\n';
    if (data.rankings && data.rankings.length > 0) {
      message += '🏆 最终排名：\n';
      data.rankings.forEach((r) => {
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '  ';
        message += `${medal} 第${r.rank}名：${r.nickname}\n`;
      });
    } else {
      message += `🏆 获胜者：${data.winner.nickname}`;
    }
    
    setTimeout(() => {
      alert(message);
    }, 500);
    
    store.setGameState(null);
    if (store.currentRoom) {
      store.setCurrentRoom({
        ...store.currentRoom,
        status: 'finished'
      });
    }
    setPage('room');
  }, [store]);

  const handleError = useCallback((error: { code: string; message: string }) => {
    store.setError(error.message);
    console.error('Socket error:', error);
  }, [store]);

  const socket = useSocket(
    store.serverUrl,
    handleRoomCreated,
    handleRoomJoined,
    handleRoomUpdated,
    undefined,
    undefined,
    handleGameStarted,
    handleGameState,
    handleGameEnded,
    handleError
  );

  const handleCreateRoom = useCallback(() => {
    socket.createRoom(store.nickname);
  }, [socket, store.nickname]);

  const handleJoinRoom = useCallback((roomCode: string) => {
    socket.joinRoom(roomCode, store.nickname);
  }, [socket, store.nickname]);

  const handleLeaveRoom = useCallback(() => {
    socket.leaveRoom();
    store.reset();
    setPage('home');
  }, [socket, store]);

  const handleAddAI = useCallback((difficulty: 'easy' | 'normal' | 'hard') => {
    if (store.currentRoom) {
      socket.addAI(store.currentRoom.code, difficulty, 'bot');
    }
  }, [socket, store.currentRoom]);

  const handleRemoveAI = useCallback((aiId: string) => {
    if (store.currentRoom) {
      socket.removeAI(store.currentRoom.code, aiId);
    }
  }, [socket, store.currentRoom]);

  const handleKickPlayer = useCallback((playerId: string) => {
    // 踢人功能需要通过其他方式实现，目前后端支持
    console.log('Kick player:', playerId);
  }, []);

  const handleStartGame = useCallback(() => {
    if (store.currentRoom) {
      socket.startGame(store.currentRoom.code);
    }
  }, [socket, store.currentRoom]);

  const handleUpdateSettings = useCallback((settings: Partial<RoomSettings>) => {
    if (store.currentRoom) {
      socket.updateSettings(store.currentRoom.code, settings);
    }
  }, [socket, store.currentRoom]);

  const handleChallengeUno = useCallback((targetId: string) => {
    if (store.currentRoom) {
      socket.challengeUno(store.currentRoom.code, targetId);
    }
  }, [socket, store.currentRoom]);

  const handleJumpIn = useCallback((cardId: string) => {
    if (store.currentRoom) {
      socket.jumpIn(store.currentRoom.code, cardId);
    }
  }, [socket, store.currentRoom]);

  // 获取当前玩家ID
  const currentPlayerId = localStorage.getItem('uno-player-id') || '';

  // 渲染当前页面
  switch (page) {
    case 'home':
      return (
        <>
          <Home
            nickname={store.nickname}
            setNickname={store.setNickname}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            error={store.error}
            isConnected={socket.isConnected}
            serverUrl={store.serverUrl}
            onOpenSettings={() => store.setShowSettings(true)}
          />
          <SettingsModal
            isOpen={store.showSettings}
            onClose={() => store.setShowSettings(false)}
            serverUrl={store.serverUrl}
            onSave={store.setServerUrl}
            onReset={store.resetToDefaultServer}
          />
        </>
      );

    case 'room':
      if (!store.currentRoom) {
        setPage('home');
        return null;
      }
      return (
        <Room
          room={store.currentRoom}
          currentPlayerId={currentPlayerId}
          onLeaveRoom={handleLeaveRoom}
          onAddAI={handleAddAI}
          onRemoveAI={handleRemoveAI}
          onKickPlayer={handleKickPlayer}
          onStartGame={handleStartGame}
          onUpdateSettings={handleUpdateSettings}
          error={store.error}
        />
      );

    case 'game':
      if (!store.currentRoom || !store.gameState) {
        setPage('room');
        return null;
      }
      return (
        <Game
          room={store.currentRoom}
          gameState={store.gameState}
          currentPlayerId={currentPlayerId}
          onPlayCard={(cardId, chosenColor) => {
            if (store.currentRoom) {
              socket.playCard(store.currentRoom.code, cardId, chosenColor);
            }
          }}
          onDrawCard={() => {
            if (store.currentRoom) {
              socket.drawCard(store.currentRoom.code);
            }
          }}
          onCallUno={() => {
            if (store.currentRoom) {
              socket.callUno(store.currentRoom.code);
            }
          }}
          onChallengeUno={handleChallengeUno}
          onJumpIn={handleJumpIn}
          onLeaveGame={handleLeaveRoom}
        />
      );

    default:
      return null;
  }
}

export default App;
