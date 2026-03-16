import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ArrowRight, Volume2, VolumeX, LogOut, Trophy, Ban } from 'lucide-react';
import { Card, ColorPicker } from '../components/Card';
import type { Room, GameState, Card as CardType, Player, ChatMessage } from '../../../shared/types';

interface GameProps {
  room: Room;
  gameState: GameState;
  currentPlayerId: string;
  onPlayCard: (cardId: string, chosenColor?: string) => void;
  onPlayCombo?: (comboType: 'pair' | 'three' | 'rainbow' | 'straight', cardIds: string[], targetId?: string) => void;
  onDrawCard: () => void;
  onCallUno: () => void;
  onChallengeUno?: (targetId: string) => void;
  onJumpIn?: (cardId: string) => void;
  onLeaveGame: () => void;
  onSendEmoji?: (emoji: string) => void;
  onToggleHost?: (enabled: boolean) => void;
  chatMessages?: ChatMessage[];
}

export function Game({ 
  room, 
  gameState, 
  currentPlayerId, 
  onPlayCard, 
  onPlayCombo,
  onDrawCard, 
  onCallUno,
  onChallengeUno,
  onJumpIn,
  onLeaveGame,
  onSendEmoji,
  onToggleHost,
  chatMessages = []
}: GameProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // 默认使用智能排序
  const [showUnoButton, setShowUnoButton] = useState(false);
  const [skipNotification, setSkipNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const lastSkippedIdRef = useRef<string | null>(null); // 防止重复显示跳过提示
  
  // Out倒计时
  const [outCountdown, setRingCountdown] = useState<number>(0);
  
  // 连打相关状态
  const [selectedComboCards, setSelectedComboCards] = useState<string[]>([]);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [pendingComboType, setPendingComboType] = useState<'pair' | 'three' | 'rainbow' | 'straight' | null>(null);
  
  const currentPlayer = gameState.players?.find(p => p.id === currentPlayerId) || room.players.find(p => p.id === currentPlayerId);
  const isMyTurn = gameState.currentPlayerId === currentPlayerId;
  
  // 托管状态
  const [isHosting, setIsHosting] = useState(currentPlayer?.isAI || false);
  
  // 更新Out倒计时
  useEffect(() => {
    if (!gameState.outState || gameState.outState.phase >= 3) {
      setRingCountdown(0);
      return;
    }
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, gameState.outState!.nextRingAt - now);
      setRingCountdown(remaining);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [gameState.outState]);
  
  // 获取其他玩家（按顺序）- 优先从 gameState 获取
  const allPlayers = gameState.players || room.players;
  const otherPlayers = useMemo(() => {
    const currentIndex = allPlayers.findIndex(p => p.id === currentPlayerId);
    const ordered = [];
    for (let i = 1; i < allPlayers.length; i++) {
      const idx = (currentIndex + i) % allPlayers.length;
      ordered.push(allPlayers[idx]);
    }
    return ordered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.players, room.players, currentPlayerId]);

  // 获取顶部卡牌
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  // 计算可出牌
  const playableCards = useMemo(() => {
    if (!currentPlayer || !isMyTurn) return new Set<string>();
    
    return new Set(
      currentPlayer.cards.filter(card => {
        // 连打规则：如果有待摸牌惩罚，只能出相同类型的+2或+4
        if (gameState.pendingDraw && gameState.pendingDraw > 0) {
          if (gameState.pendingDrawType === 'draw2' && card.type === 'draw2') return true;
          if (gameState.pendingDrawType === 'draw4' && card.type === 'draw4') return true;
          return false; // 不能叠加，只能摸牌
        }
        
        // 正常出牌规则
        if (card.type === 'wild' || card.type === 'draw4') return true;
        if (card.color === gameState.currentColor) return true;
        if (topCard && card.value === topCard.value) return true;
        return false;
      }).map(c => c.id)
    );
  }, [currentPlayer, gameState.currentColor, gameState.pendingDraw, gameState.pendingDrawType, topCard, isMyTurn]);

  // 计算可抢牌出的牌（不是自己的回合，且手中有与顶牌完全相同的牌）
  const jumpInCards = useMemo(() => {
    if (!currentPlayer || isMyTurn || !room.settings.allowJumpIn || !topCard) return new Set<string>();
    
    return new Set(
      currentPlayer.cards.filter(card => {
        // 万能牌不能抢
        if (card.type === 'wild' || card.type === 'draw4') return false;
        // 必须和顶牌完全相同（颜色、类型、数值都相同）
        return card.color === topCard.color && 
               card.type === topCard.type && 
               card.value === topCard.value;
      }).map(c => c.id)
    );
  }, [currentPlayer, isMyTurn, room.settings.allowJumpIn, topCard]);

  // 智能排序手牌（可出牌在前）
  const sortedHand = useMemo(() => {
    if (!currentPlayer) return [];
    
    const hand = [...currentPlayer.cards];
    const colorOrder: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
    
    return hand.sort((a, b) => {
      // 可出牌在前
      const aPlayable = playableCards.has(a.id) ? 0 : 1;
      const bPlayable = playableCards.has(b.id) ? 0 : 1;
      if (aPlayable !== bPlayable) return aPlayable - bPlayable;
      
      // 按颜色分组
      return colorOrder[a.color]! - colorOrder[b.color]!;
    });
  }, [currentPlayer, playableCards]);

  // 检测可用的连打组合（Out模式）
  const availableCombos = useMemo(() => {
    if (!currentPlayer || !isMyTurn || !room.settings.mode === 'out') return [];
    
    const combos: Array<{type: 'pair' | 'three' | 'rainbow' | 'straight'; cardIds: string[]}> = [];
    const cards = currentPlayer.cards.filter(c => c.type === 'number' && typeof c.value === 'number');
    
    // 按数字分组
    const byNumber = new Map<number, typeof cards>();
    const byColor = new Map<string, typeof cards>();
    
    for (const card of cards) {
      if (!byNumber.has(card.value)) byNumber.set(card.value, []);
      byNumber.get(card.value)!.push(card);
      
      if (card.color) {
        if (!byColor.has(card.color)) byColor.set(card.color, []);
        byColor.get(card.color)!.push(card);
      }
    }
    
    // 检测对子、三条、彩虹
    for (const [value, cardList] of byNumber) {
      if (cardList.length >= 4) {
        const colors = new Set(cardList.map(c => c.color));
        if (colors.size === 4) {
          const rainbowCards = cardList.filter((c, i, arr) => 
            arr.findIndex(x => x.color === c.color) === i
          );
          combos.push({ type: 'rainbow', cardIds: rainbowCards.map(c => c.id) });
        }
      }
      if (cardList.length >= 3) {
        combos.push({ type: 'three', cardIds: cardList.slice(0, 3).map(c => c.id) });
      }
      if (cardList.length >= 2) {
        combos.push({ type: 'pair', cardIds: cardList.slice(0, 2).map(c => c.id) });
      }
    }
    
    // 检测顺子
    for (const [color, cardList] of byColor) {
      const sorted = [...cardList].sort((a, b) => (a.value || 0) - (b.value || 0));
      let sequence: typeof cards = [];
      
      for (const card of sorted) {
        if (sequence.length === 0 || (card.value || 0) === (sequence[sequence.length - 1].value || 0) + 1) {
          sequence.push(card);
        } else {
          if (sequence.length >= 3) {
            combos.push({ type: 'straight', cardIds: sequence.map(c => c.id) });
          }
          sequence = [card];
        }
      }
      if (sequence.length >= 3) {
        combos.push({ type: 'straight', cardIds: sequence.map(c => c.id) });
      }
    }
    
    return combos;
  }, [currentPlayer, isMyTurn, room.settings.mode]);

  // 检查是否需要喊UNO（出牌后只剩1张牌时立即显示）
  useEffect(() => {
    // 只要手牌为1张且还没喊UNO，就显示按钮（不管是不是当前回合）
    if (currentPlayer && currentPlayer.cardCount === 1 && !currentPlayer.hasCalledUno) {
      setShowUnoButton(true);
    } else {
      setShowUnoButton(false);
    }
  }, [currentPlayer?.cardCount, currentPlayer?.hasCalledUno]);

  // 检测被跳过提示 - 轮到自己出牌时自动消除
  useEffect(() => {
    // 被跳过时显示提示
    if (gameState.skippedPlayerId === currentPlayerId && lastSkippedIdRef.current !== gameState.skippedPlayerId) {
      lastSkippedIdRef.current = gameState.skippedPlayerId;
      setSkipNotification({ show: true, message: '🚫 你被跳过了！' });
    }
    
    // 轮到自己出牌时自动消除提示
    if (isMyTurn && skipNotification.show) {
      setSkipNotification({ show: false, message: '' });
      lastSkippedIdRef.current = null;
    }
  }, [gameState.skippedPlayerId, currentPlayerId, isMyTurn, skipNotification.show]);

  // 处理出牌
  const handleCardClick = (card: CardType) => {
    // 抢牌出逻辑：不是自己的回合，但有可抢的牌
    if (!isMyTurn && jumpInCards.has(card.id) && onJumpIn) {
      onJumpIn(card.id);
      setSelectedCard(null);
      return;
    }
    
    // 连打模式：多选卡牌
    if (room.settings.mode === 'out' && isMyTurn) {
      // 只能选数字牌
      if (card.type !== 'number') {
        // 非数字牌直接出
        if (playableCards.has(card.id)) {
          if (card.type === 'wild' || card.type === 'draw4') {
            setPendingCard(card.id);
            setShowColorPicker(true);
          } else {
            onPlayCard(card.id);
          }
        }
        return;
      }
      
      // 切换选择状态
      setSelectedComboCards(prev => {
        if (prev.includes(card.id)) {
          return prev.filter(id => id !== card.id);
        }
        return [...prev, card.id];
      });
      return;
    }
    
    // 正常出牌逻辑
    if (!isMyTurn || !playableCards.has(card.id)) return;
    
    if (card.type === 'wild' || card.type === 'draw4') {
      setPendingCard(card.id);
      setShowColorPicker(true);
    } else {
      onPlayCard(card.id);
      setSelectedCard(null);
    }
  };
  
  // 执行连打
  const executeCombo = (comboType: 'pair' | 'three' | 'rainbow' | 'straight') => {
    if (!onPlayCombo || selectedComboCards.length === 0) return;
    
    // 彩虹需要选择目标
    if (comboType === 'rainbow') {
      setPendingComboType('rainbow');
      setShowTargetSelector(true);
      return;
    }
    
    onPlayCombo(comboType, selectedComboCards);
    setSelectedComboCards([]);
  };
  
  // 选择彩虹目标
  const handleTargetSelect = (targetId: string) => {
    if (pendingComboType === 'rainbow' && onPlayCombo) {
      onPlayCombo('rainbow', selectedComboCards, targetId);
      setSelectedComboCards([]);
      setPendingComboType(null);
      setShowTargetSelector(false);
    }
  };

  // 处理颜色选择
  const handleColorSelect = (color: 'red' | 'yellow' | 'green' | 'blue') => {
    if (pendingCard) {
      onPlayCard(pendingCard, color);
      setPendingCard(null);
      setShowColorPicker(false);
      setSelectedCard(null);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取当前玩家信息
  const activePlayer = (gameState.players || room.players).find((p: Player) => p.id === gameState.currentPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">房间 {room.code}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm">{room.players.length}人</span>
          </div>
          
          {/* 排名显示 */}
          {gameState.rankings && gameState.rankings.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <div className="flex items-center gap-1">
                {gameState.rankings.map((playerId, index) => {
                  const rankedPlayer = room.players.find(p => p.id === playerId);
                  return (
                    <span key={playerId} className={`text-xs font-medium ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-slate-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-slate-400'
                    }`}>
                      #{index + 1} {rankedPlayer?.nickname || '未知'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* 倒计时 */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${
            gameState.turnTimer <= 10 
              ? 'bg-red-500/20 text-red-400 animate-pulse' 
              : gameState.turnTimer <= 30 
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-slate-800 text-slate-300'
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(gameState.turnTimer)}
          </div>
          
          {/* Out倒计时 */}
          {gameState.outState && gameState.outState.phase < 3 && outCountdown > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold ${
              outCountdown <= 30000 
                ? 'bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse' 
                : outCountdown <= 60000 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}>
              <span className="text-xs">🔥</span>
              <span className="text-sm font-mono">{formatTime(Math.floor(outCountdown / 1000))}</span>
            </div>
          )}
          
          {/* Out阶段指示 */}
          {gameState.outState && gameState.outState.phase > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold ${
              gameState.outState.phase === 1 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : gameState.outState.phase === 2 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-purple-600/30 text-purple-400 border border-purple-500/50 animate-pulse'
            }`}>
              <span className="text-xs">
                {gameState.outState.phase === 1 ? '🔥 Out I - 上限15张' : 
                 gameState.outState.phase === 2 ? '🔥🔥 Out II - 上限8张' : 
                 '💀 终极圈 - 上限3张'}
              </span>
              <span className="text-xs text-red-400 font-bold">超出即淘汰！</span>
            </div>
          )}

          {/* 方向指示 - 更明显的版本 */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
            gameState.direction === 'clockwise' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
          }`}>
            <motion.div
              animate={{ rotate: gameState.direction === 'clockwise' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
            <span className="text-sm">
              {gameState.direction === 'clockwise' ? '顺时针 ↻' : '逆时针 ↺'}
            </span>
          </div>

          {/* 音量控制 */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* 离开按钮 */}
          <button 
            onClick={onLeaveGame}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 其他玩家区域 - 支持横向滚动 */}
      <div className="flex justify-start items-center gap-3 py-4 px-4 overflow-x-auto scrollbar-hide">
        {otherPlayers.map((player) => {
          const canChallenge = player.cardCount === 1 && !player.hasCalledUno && !player.eliminated;
          const isFinished = player.cardCount === 0 && !player.eliminated; // 已出完牌
          const isEliminated = player.eliminated; // 被淘汰
          // 获取该玩家最新的表情消息
          const playerEmoji = chatMessages
            .filter(msg => msg.playerId === player.id)
            .slice(-1)[0];
          return (
            <motion.div 
              key={player.id}
              onClick={() => canChallenge && onChallengeUno?.(player.id)}
              className="relative flex flex-col items-center"
            >
              {/* 表情显示 - 在头像右侧 */}
              <AnimatePresence>
                {playerEmoji && (
                  <motion.div
                    key={playerEmoji.timestamp}
                    initial={{ opacity: 0, x: -10, scale: 0.5 }}
                    animate={{ opacity: 1, x: 0, scale: 1.2 }}
                    exit={{ opacity: 0, x: 10, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-14 top-1/2 -translate-y-1/2 z-30"
                  >
                    <span className="text-3xl drop-shadow-lg filter">{playerEmoji.content}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div 
                className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all flex-shrink-0 ${
                  isEliminated
                    ? 'bg-gray-800/50 border-gray-600 opacity-60'
                    : isFinished
                      ? 'bg-yellow-600/20 border-yellow-500 shadow-lg shadow-yellow-500/20'
                      : player.id === gameState.currentPlayerId
                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20 animate-pulse'
                        : 'bg-slate-800/50 border-slate-700/50'
                } ${canChallenge ? 'border-red-500 ring-2 ring-red-500/50 cursor-pointer hover:bg-red-900/20' : ''}`}
                title={canChallenge ? '点击质疑！' : isFinished ? '已获胜！' : isEliminated ? '已淘汰' : ''}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  isEliminated
                    ? 'bg-gray-700 text-gray-500'
                    : isFinished
                      ? 'bg-yellow-500/30 text-yellow-400'
                      : player.isAI
                        ? 'bg-purple-600/30 text-purple-400'
                        : 'bg-slate-700'
                }`}>
                  {isEliminated ? '💀' : isFinished ? '👑' : player.isAI ? '🤖' : player.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-medium truncate max-w-[70px] sm:max-w-[80px] ${isEliminated ? 'text-gray-500' : ''}`}>{player.nickname}</div>
                  <div className={`text-xs ${canChallenge ? 'text-red-400 font-bold animate-pulse' : isFinished ? 'text-yellow-400 font-bold' : isEliminated ? 'text-gray-500' : 'text-slate-400'}`}>
                    {isEliminated ? '💀 淘汰' : isFinished ? '✨ 获胜' : `${player.cardCount}张${player.cardCount === 1 && player.hasCalledUno ? ' ✓UNO' : ''}`}
                  </div>
                </div>
                {player.id === gameState.currentPlayerId && !isFinished && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">
                    ▶
                  </div>
                )}
                {/* 质疑提示 */}
                {canChallenge && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg animate-bounce">
                    质疑!
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* 游戏区域 */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="flex items-center gap-12">
          {/* 牌堆 - 可点击摸牌 */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onDrawCard}
              disabled={!isMyTurn}
              className={`relative transition-all ${
                isMyTurn ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-70'
              }`}
            >
              <div className="w-28 h-40 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 shadow-lg flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded border-2 border-slate-600/50 flex items-center justify-center">
                  <span className="text-2xl">🎴</span>
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-400">
                {gameState.deck.length}张
              </div>
            </button>
            {isMyTurn && (
              <span className={`text-lg font-bold animate-pulse px-3 py-1 rounded-full ${
                gameState.pendingDraw && gameState.pendingDraw > 0
                  ? 'text-red-400 bg-red-900/30'
                  : 'text-blue-400 bg-blue-900/30'
              }`}>
                👆 点击摸 {gameState.pendingDraw && gameState.pendingDraw > 0 ? gameState.pendingDraw : ''} 牌
              </span>
            )}
          </div>

          {/* 当前颜色指示 */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">当前颜色:</span>
              <div className={`w-8 h-8 rounded-full border-2 border-white/20 ${
                gameState.currentColor === 'red' ? 'bg-red-500' :
                gameState.currentColor === 'yellow' ? 'bg-yellow-400' :
                gameState.currentColor === 'green' ? 'bg-green-500' :
                gameState.currentColor === 'blue' ? 'bg-blue-500' :
                'bg-slate-600'
              }`} />
            </div>
            
            {/* 连打惩罚提示 */}
            {gameState.pendingDraw && gameState.pendingDraw > 0 && (
              <div className={`px-4 py-2 rounded-lg font-bold animate-pulse ${
                gameState.pendingDrawType === 'draw2' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
              }`}>
                ⚠️ 累积 +{gameState.pendingDraw} 张
                {isMyTurn && (
                  <span className="ml-2 text-xs">
                    ({gameState.pendingDrawType === 'draw2' ? '+2' : '+4'} 可叠加)
                  </span>
                )}
              </div>
            )}
            
            {/* 弃牌堆 */}
            <div className="relative">
              {topCard && <Card card={topCard} size="lg" />}
            </div>

            {/* 当前玩家提示 */}
            <div className="text-center">
              <span className="text-sm text-slate-400">
                {activePlayer?.id === currentPlayerId ? '你的回合' : `${activePlayer?.nickname}的回合`}
              </span>
            </div>
          </div>
        </div>
      </div>



      {/* 手牌区域 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50">
        {/* Out警告 - 手牌接近上限时显示 */}
        {gameState.outState && gameState.outState.phase > 0 && currentPlayer && !currentPlayer.eliminated && currentPlayer.cards.length >= gameState.outState.maxCards && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white font-bold rounded-full shadow-lg shadow-red-600/50 animate-pulse z-30">
            ⚠️ 手牌{currentPlayer.cards.length}张！上限{gameState.outState.maxCards}张，再摸牌将被淘汰！
          </div>
        )}
        
        {/* 当前玩家表情显示 - 在手牌中央上方 */}
        {(() => {
          const myEmoji = chatMessages
            .filter(msg => msg.playerId === currentPlayerId)
            .slice(-1)[0];
          return (
            <AnimatePresence>
              {myEmoji && (
                <motion.div
                  key={myEmoji.timestamp}
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1.5 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-30"
                >
                  <span className="text-4xl drop-shadow-lg filter">{myEmoji.content}</span>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })()}
        
        {/* 工具栏 - Emoji 区域 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
          {/* 更多 Emoji - 横向滚动 */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
            {['😎', '🔥', '🤡', '👻', '💩', '🤮', '🙄', '🤔', '😭', '😡', '😂', '🎲', '🐸', '🍌', '⚡', '💀'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendEmoji?.(emoji)}
                className="text-xl p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          {/* 手牌数量 */}
          <div className="text-sm text-slate-400 flex-shrink-0 ml-2">
            {currentPlayer?.cardCount || 0}张
            {playableCards.size > 0 && (
              <span className="ml-1 text-green-400">({playableCards.size}可出)</span>
            )}
            {room.settings.mode === 'out' && selectedComboCards.length > 0 && (
              <span className="ml-1 text-blue-400">(已选{selectedComboCards.length}张)</span>
            )}
          </div>
          
          {/* 连打按钮（Out模式） */}
          {room.settings.mode === 'out' && isMyTurn && availableCombos.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              {availableCombos
                .filter((combo, index, self) => 
                  index === self.findIndex(c => c.type === combo.type)
                )
                .map(combo => {
                  const isSelected = selectedComboCards.length > 0 && 
                    combo.cardIds.every(id => selectedComboCards.includes(id));
                  return (
                    <button
                      key={combo.type}
                      onClick={() => isSelected && executeCombo(combo.type)}
                      disabled={!isSelected}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-600/25'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                      title={`选择${combo.type === 'pair' ? '对子' : combo.type === 'three' ? '三条' : combo.type === 'rainbow' ? '彩虹' : '顺子'}所需的牌`}
                    >
                      {combo.type === 'pair' && '对子'}
                      {combo.type === 'three' && '三条'}
                      {combo.type === 'rainbow' && '🌈 彩虹'}
                      {combo.type === 'straight' && '顺子'}
                    </button>
                  );
                })}
              {/* 取消选择按钮 */}
              {selectedComboCards.length > 0 && (
                <button
                  onClick={() => setSelectedComboCards([])}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
              )}
            </div>
          )}
        </div>

        {/* 聊天消息已改为在玩家头像附近显示 */}

        {/* 被跳过提示 - 移到顶部中央 */}
        <AnimatePresence>
          {skipNotification.show && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 border-2 border-red-500 rounded-lg shadow-lg shadow-red-500/20">
                <Ban className="w-6 h-6 text-red-400" />
                <span className="text-xl font-bold text-red-400">{skipNotification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 无牌可出提示 - 移到牌堆上方 */}
        {isMyTurn && playableCards.size === 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[280px] z-30">
            <div className="inline-block px-4 py-2 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg animate-pulse">
              <span className="text-lg font-bold text-yellow-400">👆 无牌可出，点击牌堆摸牌</span>
            </div>
          </div>
        )}

        {/* 手牌 */}
        <div className="flex items-end justify-center gap-2 py-4 px-4 overflow-x-auto">
          {sortedHand.map((card) => {
            const isPlayable = playableCards.has(card.id);
            const canJumpIn = jumpInCards.has(card.id);
            const isSelected = selectedCard === card.id;
            // Out模式连打选择
            const isComboSelected = room.settings.mode === 'out' && selectedComboCards.includes(card.id);
            const canSelectForCombo = room.settings.mode === 'out' && isMyTurn && card.type === 'number';
            
            return (
              <div
                onClick={() => handleCardClick(card)}
                className={`
                  relative flex-shrink-0 transition-all duration-200
                  ${isSelected || isComboSelected ? 'z-10 -translate-y-3' : 'z-0'}
                  ${!isPlayable && !canJumpIn && !canSelectForCombo ? 'opacity-50 brightness-75' : 'cursor-pointer'}
                `}
              >
                {/* 连打选择标记 */}
                {isComboSelected && (
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 border-2 border-white flex items-center justify-center z-20">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
                <Card
                  card={card}
                  size="md"
                  isSelected={isSelected || isComboSelected}
                  isPlayable={(isPlayable && isMyTurn) || canJumpIn || canSelectForCombo}
                  disabled={!isPlayable && !canJumpIn && !canSelectForCombo}
                  onClick={() => {
                    if (room.settings.mode !== 'out') {
                      setSelectedCard(isSelected ? null : card.id);
                    }
                  }}
                />
                {/* 可出牌标记（自己回合） */}
                {isPlayable && isMyTurn && room.settings.mode !== 'out' && (
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full animate-pulse shadow-lg border-2 border-white ${
                    gameState.pendingDraw && (card.type === 'draw2' || card.type === 'draw4') ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'
                  }`} />
                )}
                {/* 抢牌出标记（非自己回合） */}
                {canJumpIn && !isMyTurn && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full animate-pulse shadow-lg shadow-yellow-500/50 border-2 border-white flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">抢</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 操作按钮 - 只有UNO按钮 */}
        <div className="flex items-center justify-center gap-4 pb-4">
          <button
            onClick={() => {
              onCallUno();
              setShowUnoButton(false);
            }}
            disabled={currentPlayer?.cardCount !== 1}
            className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
              currentPlayer?.cardCount === 1
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 animate-pulse border-2 border-yellow-400'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            UNO!
          </button>
          {/* 托管按钮 */}
          <button
            onClick={() => {
              const newState = !isHosting;
              setIsHosting(newState);
              onToggleHost?.(newState);
            }}
            className={`px-4 py-3 rounded-lg font-bold text-lg transition-all ${
              isHosting
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
            title={isHosting ? '关闭托管模式' : '开启托管模式'}
          >
            {isHosting ? '🤖 托管中' : '托管'}
          </button>
        </div>
      </div>

      {/* 颜色选择器 */}
      <AnimatePresence>
        {showColorPicker && (
          <ColorPicker
            onSelect={handleColorSelect}
            onCancel={() => {
              setShowColorPicker(false);
              setPendingCard(null);
            }}
          />
        )}
      </AnimatePresence>
      
      {/* 彩虹目标选择弹窗 */}
      <AnimatePresence>
        {showTargetSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowTargetSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2 text-center">🌈 选择彩虹目标</h3>
              <p className="text-slate-400 text-center mb-6">选择一名玩家承受 +3 惩罚</p>
              
              <div className="grid grid-cols-2 gap-3">
                {otherPlayers.filter(p => !p.eliminated).map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleTargetSelect(player.id)}
                    className="flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      player.isAI ? 'bg-purple-600/30 text-purple-400' : 'bg-slate-600'
                    }`}>
                      {player.isAI ? '🤖' : player.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white truncate max-w-[100px]">{player.nickname}</div>
                      <div className="text-xs text-slate-400">{player.cardCount}张牌</div>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowTargetSelector(false)}
                className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
