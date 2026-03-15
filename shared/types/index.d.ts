export interface Player {
    id: string;
    nickname: string;
    avatar?: string;
    isHost: boolean;
    isAI: boolean;
    aiType?: 'bot' | 'host';
    aiDifficulty?: 'easy' | 'normal' | 'hard';
    cards: Card[];
    cardCount: number;
    isConnected: boolean;
    isReady: boolean;
    disconnectedAt?: number;
    hasCalledUno?: boolean;
}
export interface Card {
    id: string;
    type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4';
    color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
    value: number | string;
}
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
export interface RoomSettings {
    allowStacking: boolean;
    allowMultipleCards: boolean;
    allowJumpIn: boolean;
    scoringMode: boolean;
}
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
    pendingDraw?: number;
    pendingDrawType?: 'draw2' | 'draw4';
    rankings?: string[];
    isRoundEnded?: boolean;
    skippedPlayerId?: string;
}
export interface GameAction {
    type: 'play' | 'draw' | 'skip' | 'uno' | 'challenge' | 'jumpIn';
    playerId: string;
    card?: Card;
    cards?: Card[];
    color?: string;
    timestamp: number;
}
export declare enum SocketEvents {
    CONNECT = "connect",
    DISCONNECT = "disconnect",
    CREATE_ROOM = "room:create",
    JOIN_ROOM = "room:join",
    LEAVE_ROOM = "room:leave",
    ROOM_UPDATED = "room:updated",
    PLAYER_JOINED = "room:playerJoined",
    PLAYER_LEFT = "room:playerLeft",
    GAME_START = "game:start",
    GAME_STATE = "game:state",
    PLAY_CARD = "game:playCard",
    DRAW_CARD = "game:drawCard",
    CALL_UNO = "game:callUno",
    CHALLENGE_UNO = "game:challengeUno",
    JUMP_IN = "game:jumpIn",
    TURN_TIMEOUT = "game:turnTimeout",
    ADD_AI = "ai:add",
    REMOVE_AI = "ai:remove",
    ERROR = "error"
}
export interface SocketError {
    code: string;
    message: string;
}
//# sourceMappingURL=index.d.ts.map