// 玩家类型
export interface Player {
  id: string;
  nickname: string;
  avatar?: string;
  isHost: boolean;
  isAI: boolean;
  aiType?: 'bot' | 'host'; // 'bot'=机器人(自动立即出牌), 'host'=托管(玩家离线)
  aiDifficulty?: 'easy' | 'normal' | 'hard';
  cards: Card[];
  cardCount: number;
  isConnected: boolean;
  isReady: boolean;
  disconnectedAt?: number;
  hasCalledUno?: boolean; // 是否已喊UNO
}

// 卡牌类型
export interface Card {
  id: string;
  type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4';
  color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
  value: number | string;
}

// 房间状态
export interface Room {
  id: string;
  code: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  maxPlayers: number;
  createdAt: number;
  gameState?: GameState;
  settings: RoomSettings;
}

// 房间设置
export interface RoomSettings {
  allowStacking: boolean;
  allowMultipleCards: boolean;
  allowJumpIn: boolean;
  scoringMode: boolean;
}

// 游戏状态
export interface GameState {
  currentPlayerId: string;
  direction: 'clockwise' | 'counterclockwise';
  deck: Card[];
  discardPile: Card[];
  currentColor: string;
  turnTimer: number;
  turnStartTime: number;
  lastAction?: GameAction;
  winner?: string;
  players: Player[]; // 包含每个玩家的手牌信息
  // 连打（叠加）状态
  pendingDraw?: number; // 待摸牌数（连打累计）
  pendingDrawType?: 'draw2' | 'draw4'; // 连打类型（+2和+4不能混）
  // 排名模式
  rankings?: string[]; // 出完牌的玩家排名（按先后顺序）
  isRoundEnded?: boolean; // 本轮是否已结束
  // UI提示
  skippedPlayerId?: string; // 被跳过的玩家ID（用于显示跳过提示）
}

// 游戏动作
export interface GameAction {
  type: 'play' | 'draw' | 'skip' | 'uno' | 'challenge' | 'jumpIn';
  playerId: string;
  card?: Card;
  cards?: Card[];
  color?: string;
  timestamp: number;
}

// 聊天消息
export interface ChatMessage {
  type: 'emoji' | 'text';
  content: string;
  playerId: string;
  playerName: string;
  timestamp: number;
}

// Socket 事件类型
export enum SocketEvents {
  // 连接
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // 房间
  CREATE_ROOM = 'room:create',
  JOIN_ROOM = 'room:join',
  LEAVE_ROOM = 'room:leave',
  ROOM_UPDATED = 'room:updated',
  PLAYER_JOINED = 'room:playerJoined',
  PLAYER_LEFT = 'room:playerLeft',
  
  // 游戏
  GAME_START = 'game:start',
  GAME_STATE = 'game:state',
  PLAY_CARD = 'game:playCard',
  DRAW_CARD = 'game:drawCard',
  CALL_UNO = 'game:callUno',
  CHALLENGE_UNO = 'game:challengeUno',
  JUMP_IN = 'game:jumpIn',
  TURN_TIMEOUT = 'game:turnTimeout',
  
  // AI
  ADD_AI = 'ai:add',
  REMOVE_AI = 'ai:remove',
  
  // 聊天
  SEND_MESSAGE = 'chat:send',
  RECEIVE_MESSAGE = 'chat:receive',
  
  // 错误
  ERROR = 'error',
}

// 用户会话信息
export interface UserSession {
  userId: string;  // 客户端生成的固定 UUID
  nickname: string;
}

// 错误类型
export interface SocketError {
  code: string;
  message: string;
}
