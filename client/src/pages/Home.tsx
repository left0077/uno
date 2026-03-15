import { useState, useEffect } from 'react';
import { Gamepad2, Plus, LogIn, Users, Settings } from 'lucide-react';

interface HomeProps {
  nickname: string;
  setNickname: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  error: string | null;
  isConnected: boolean;
  serverUrl: string;
  onOpenSettings: () => void;
}

export function Home({ 
  nickname, 
  setNickname, 
  onCreateRoom, 
  onJoinRoom, 
  error,
  isConnected,
  serverUrl,
  onOpenSettings
}: HomeProps) {
  const [roomCode, setRoomCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  
  // 检查是否有邀请链接的房间号
  useEffect(() => {
    const inviteRoom = localStorage.getItem('uno-invite-room');
    if (inviteRoom) {
      setRoomCode(inviteRoom);
      setShowJoinInput(true);
      localStorage.removeItem('uno-invite-room');
    }
  }, []);

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }
    onCreateRoom();
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 4) {
      alert('请输入4位房间号');
      return;
    }
    onJoinRoom(roomCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 rounded-2xl shadow-2xl mb-4 animate-pulse">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Uno Online</h1>
          <p className="text-slate-400">在线Uno游戏，支持2-8人同时游戏</p>
          
          {/* 连接状态 */}
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {isConnected ? '已连接' : '连接中...'}
          </div>
          
          {/* 服务器地址 */}
          <button
            onClick={onOpenSettings}
            className="mt-2 text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 mx-auto"
            title="点击修改服务器地址"
          >
            <Settings className="w-3 h-3" />
            <span className="font-mono truncate max-w-[200px]">{serverUrl}</span>
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 昵称输入 */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">
              你的昵称
            </label>
            {nickname && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                已保存
              </span>
            )}
          </div>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入昵称"
            maxLength={12}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <div className="mt-2 text-xs text-slate-500">
            昵称将自动保存，下次无需重复输入
          </div>
        </div>

        {/* 主按钮区域 */}
        <div className="space-y-4">
          {/* 创建房间按钮 */}
          <button
            onClick={handleCreateRoom}
            disabled={!isConnected}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-6 h-6" />
            创建房间
          </button>

          {/* 加入房间按钮 */}
          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              disabled={!isConnected}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="w-6 h-6" />
              加入房间
            </button>
          ) : (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                房间号
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="输入4位数字"
                  maxLength={4}
                  className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-center text-xl tracking-widest"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 4}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-all"
                >
                  进入
                </button>
              </div>
              <button
                onClick={() => {
                  setShowJoinInput(false);
                  setRoomCode('');
                }}
                className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>2-8人游戏</span>
          </div>
          <span>•</span>
          <span>支持AI对战</span>
        </div>

        {/* 游戏规则链接 */}
        <div className="mt-6 text-center">
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              alert('游戏规则：\n\n1. 每位玩家初始7张牌\n2. 轮流出牌，必须颜色或数字匹配\n3. 万能牌可随时出\n4. 功能牌：跳过、反转、+2\n5. 剩1张牌时必须喊UNO\n6. 先出完牌者获胜');
            }}
            className="text-sm text-slate-500 hover:text-blue-400 transition-colors"
          >
            查看游戏规则
          </a>
        </div>
      </div>
    </div>
  );
}
