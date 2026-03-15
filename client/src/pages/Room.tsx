import { useState, useEffect } from 'react';
import { 
  Users, 
  Crown, 
  Bot, 
  LogOut, 
  Play, 
  UserX, 
  MessageSquare,
  Copy,
  Check,
  Settings
} from 'lucide-react';
import type { Room as RoomType, Player, RoomSettings } from '../../../shared/types';

interface RoomProps {
  room: RoomType;
  currentPlayerId: string;
  onLeaveRoom: () => void;
  onAddAI: (difficulty: 'easy' | 'normal' | 'hard') => void;
  onRemoveAI: (aiId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  onUpdateSettings?: (settings: Partial<RoomSettings>) => void;
  error: string | null;
}

const AI_DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难'
};

const AI_DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  normal: 'text-yellow-400',
  hard: 'text-red-400'
};

export function Room({
  room,
  currentPlayerId,
  onLeaveRoom,
  onAddAI,
  onRemoveAI,
  onKickPlayer,
  onStartGame,
  onUpdateSettings,
  error
}: RoomProps) {
  const [copied, setCopied] = useState(false);
  const [showAddAI, setShowAddAI] = useState(false);

  const isHost = room.hostId === currentPlayerId;
  const canStart = room.players.length >= 2 && isHost && room.status === 'waiting';
  const isFull = room.players.length >= room.maxPlayers;

  // 调试：记录 room 变化
  useEffect(() => {
    console.log('Room updated:', room.code, 'players:', room.players.map(p => p.nickname));
  }, [room]);

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // const currentPlayer = room.players.find(p => p.id === currentPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">房间 {room.code}</h1>
            <p className="text-slate-400 text-sm">
              {room.status === 'waiting' ? '等待玩家加入...' : '游戏进行中'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyRoomCode}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制房间号'}
            </button>
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              离开
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：玩家列表 */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  玩家列表
                  <span className="text-sm text-slate-400">
                    ({room.players.length}/{room.maxPlayers})
                  </span>
                </h2>
                {isHost && !isFull && room.status === 'waiting' && (
                  <button
                    onClick={() => setShowAddAI(!showAddAI)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-lg text-blue-400 text-sm transition-colors"
                  >
                    <Bot className="w-4 h-4" />
                    添加AI
                  </button>
                )}
              </div>

              {/* 添加AI选项 */}
              {showAddAI && isHost && (
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 space-y-4">
                  {/* AI类型选择 */}
                  <div>
                    <p className="text-sm text-slate-400 mb-2">选择难度：</p>
                    <div className="flex gap-2">
                      {(['easy', 'normal', 'hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => {
                            onAddAI(diff);
                            setShowAddAI(false);
                          }}
                          className={`flex-1 py-3 px-3 rounded-lg border transition-all ${
                            diff === 'easy'
                              ? 'bg-green-600/20 border-green-600/50 text-green-400 hover:bg-green-600/30'
                              : diff === 'normal'
                              ? 'bg-yellow-600/20 border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/30'
                              : 'bg-red-600/20 border-red-600/50 text-red-400 hover:bg-red-600/30'
                          }`}
                        >
                          {AI_DIFFICULTY_LABELS[diff]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 玩家列表 */}
              <div className="p-4 space-y-3">
                {room.players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isHost={isHost}
                    isCurrentPlayer={player.id === currentPlayerId}
                    canKick={isHost && player.id !== currentPlayerId && !player.isAI}
                    onKick={() => onKickPlayer(player.id)}
                    onRemoveAI={() => onRemoveAI(player.id)}
                  />
                ))}

                {/* 空位提示 */}
                {Array.from({ length: Math.max(0, 4 - room.players.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-700/50 rounded-lg text-slate-600"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-sm">等待玩家加入...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 开始游戏/再来一局按钮 */}
            {isHost && (room.status === 'waiting' || room.status === 'finished') && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className="w-full mt-4 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg shadow-lg shadow-green-600/25 transition-all"
              >
                <Play className="w-6 h-6" />
                {room.players.length < 2 
                  ? '至少需要2人才能开始' 
                  : room.status === 'finished' 
                    ? '再来一局' 
                    : '开始游戏'}
              </button>
            )}
          </div>

          {/* 右侧：设置和信息 */}
          <div className="space-y-4">
            {/* 房间设置 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  房间设置
                </h3>
                {!isHost && <span className="text-xs text-slate-500">仅房主可修改</span>}
              </div>
              <div className="space-y-3">
                {/* 叠加规则 */}
                <label className={`flex items-center justify-between ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                  <div>
                    <span className="text-sm text-slate-400">叠加规则</span>
                    <p className="text-xs text-slate-600">+2/+4 可叠加</p>
                  </div>
                  <button
                    onClick={() => isHost && onUpdateSettings?.({ allowStacking: !room.settings.allowStacking })}
                    disabled={!isHost}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      room.settings.allowStacking ? 'bg-green-600' : 'bg-slate-600'
                    } ${!isHost && 'opacity-50'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      room.settings.allowStacking ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>

                {/* 多牌同出 */}
                <label className={`flex items-center justify-between ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                  <div>
                    <span className="text-sm text-slate-400">多牌同出</span>
                    <p className="text-xs text-slate-600">相同数字可一起出</p>
                  </div>
                  <button
                    onClick={() => isHost && onUpdateSettings?.({ allowMultipleCards: !room.settings.allowMultipleCards })}
                    disabled={!isHost}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      room.settings.allowMultipleCards ? 'bg-green-600' : 'bg-slate-600'
                    } ${!isHost && 'opacity-50'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      room.settings.allowMultipleCards ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>

                {/* 抢打出牌 */}
                <label className={`flex items-center justify-between ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                  <div>
                    <span className="text-sm text-slate-400">抢打出牌</span>
                    <p className="text-xs text-slate-600">相同牌可抢出</p>
                  </div>
                  <button
                    onClick={() => isHost && onUpdateSettings?.({ allowJumpIn: !room.settings.allowJumpIn })}
                    disabled={!isHost}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      room.settings.allowJumpIn ? 'bg-green-600' : 'bg-slate-600'
                    } ${!isHost && 'opacity-50'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      room.settings.allowJumpIn ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>

                {/* 计分模式 */}
                <label className={`flex items-center justify-between ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                  <div>
                    <span className="text-sm text-slate-400">计分模式</span>
                    <p className="text-xs text-slate-600">按手牌分数结算</p>
                  </div>
                  <button
                    onClick={() => isHost && onUpdateSettings?.({ scoringMode: !room.settings.scoringMode })}
                    disabled={!isHost}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      room.settings.scoringMode ? 'bg-green-600' : 'bg-slate-600'
                    } ${!isHost && 'opacity-50'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      room.settings.scoringMode ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                提示
              </h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• 房主可以踢出玩家</li>
                <li>• 可以添加AI填充空位</li>
                <li>• 至少需要2人开始游戏</li>
                <li>• 游戏开始后不能添加AI</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 玩家卡片组件
interface PlayerCardProps {
  player: Player;
  index: number;
  isHost: boolean;
  isCurrentPlayer: boolean;
  canKick: boolean;
  onKick: () => void;
  onRemoveAI: () => void;
}

function PlayerCard({
  player,
  isHost,
  isCurrentPlayer,
  canKick,
  onKick,
  onRemoveAI
}: Omit<PlayerCardProps, 'index'>) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isCurrentPlayer 
        ? 'bg-blue-600/20 border-blue-600/50' 
        : 'bg-slate-800/50 border-slate-700/50'
    }`}>
      {/* 头像 */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
        player.isAI 
          ? 'bg-purple-600/30 text-purple-400' 
          : 'bg-slate-700 text-slate-300'
      }`}>
        {player.isAI ? <Bot className="w-5 h-5" /> : player.nickname.charAt(0).toUpperCase()}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {player.nickname}
          </span>
          {player.isHost && (
            <Crown className="w-4 h-4 text-yellow-400" />
          )}
          {isCurrentPlayer && (
            <span className="text-xs text-blue-400">(你)</span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {player.isAI ? (
            <span className={AI_DIFFICULTY_COLORS[player.aiDifficulty || 'normal']}>
              🤖 机器人 - {AI_DIFFICULTY_LABELS[player.aiDifficulty || 'normal']}
            </span>
          ) : (
            '玩家'
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      {player.isAI ? (
        isHost && (
          <button
            onClick={onRemoveAI}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
            title="移除AI"
          >
            <UserX className="w-4 h-4" />
          </button>
        )
      ) : (
        canKick && (
          <button
            onClick={onKick}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
            title="踢出玩家"
          >
            <UserX className="w-4 h-4" />
          </button>
        )
      )}
    </div>
  );
}
