# 📡 Uno Online API 文档

> 版本：v1.0  
> 更新日期：2026-03-15  
> 基础路径：`http://localhost:3001`

---

## 一、REST API

### 1.1 健康检查

#### GET /health
检查服务器运行状态

**请求示例：**
```bash
curl http://localhost:3001/health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T12:00:00.000Z",
  "uptime": 3600
}
```

---

### 1.2 房间信息

#### GET /api/room/:code
获取指定房间的详细信息

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 4位房间号 |

**请求示例：**
```bash
curl http://localhost:3001/api/room/1234
```

**响应示例（成功）：**
```json
{
  "id": "uuid",
  "code": "1234",
  "players": [
    {
      "id": "socket-id",
      "nickname": "玩家1",
      "isHost": true,
      "isAI": false,
      "cardCount": 0,
      "isConnected": true,
      "isReady": false
    }
  ],
  "status": "waiting",
  "hostId": "socket-id",
  "maxPlayers": 8,
  "createdAt": 1710500000000,
  "settings": {
    "allowStacking": true,
    "allowMultipleCards": true,
    "allowJumpIn": true,
    "scoringMode": true
  }
}
```

**响应示例（失败）：**
```json
{
  "error": "Room not found"
}
```

**状态码：**
- `200` - 成功
- `404` - 房间不存在

---

## 二、Socket.IO 事件

### 2.1 连接管理

#### 连接
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

#### 断开连接
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

---

### 2.2 房间事件

#### room:create - 创建房间
**发送：**
```javascript
socket.emit('room:create', {
  nickname: '玩家昵称'
});
```

**参数：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 是 | 玩家昵称 |

**接收成功：**
```javascript
socket.on('room:create', (data) => {
  // data.success === true
  // data.room - 房间对象
});
```

**接收失败：**
```javascript
socket.on('error', (error) => {
  // error.code: 'CREATE_ROOM_FAILED'
  // error.message: '创建房间失败'
});
```

---

#### room:join - 加入房间
**发送：**
```javascript
socket.emit('room:join', {
  roomCode: '1234',
  nickname: '玩家昵称'
});
```

**参数：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomCode | string | 是 | 4位房间号 |
| nickname | string | 是 | 玩家昵称 |

**接收成功：**
```javascript
socket.on('room:join', (data) => {
  // data.success === true
  // data.room - 房间对象
});
```

**接收失败：**
```javascript
socket.on('error', (error) => {
  // error.code: 'ROOM_NOT_FOUND'
  // error.message: '房间不存在或已满'
});
```

**广播事件（其他玩家收到）：**
```javascript
socket.on('room:playerJoined', (data) => {
  // data.playerId
  // data.nickname
});
```

---

#### room:leave - 离开房间
**发送：**
```javascript
socket.emit('room:leave');
```

**广播事件（其他玩家收到）：**
```javascript
socket.on('room:playerLeft', (data) => {
  // data.playerId
});

socket.on('room:updated', (room) => {
  // 更新后的房间信息
});
```

---

### 2.3 AI管理事件

#### ai:add - 添加AI
**发送：**
```javascript
socket.emit('ai:add', {
  roomCode: '1234',
  difficulty: 'normal'  // 'easy' | 'normal' | 'hard'
});
```

**权限：** 仅限房主

**参数：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomCode | string | 是 | 房间号 |
| difficulty | string | 是 | AI难度 |

**接收失败：**
```javascript
socket.on('error', (error) => {
  // error.code: 'PERMISSION_DENIED'
  // error.message: '只有房主可以添加AI'
});
```

**广播事件：**
```javascript
socket.on('room:playerJoined', (data) => {
  // data.playerId - AI的ID
  // data.nickname - AI名称
  // data.isAI - true
});
```

---

#### ai:remove - 移除AI
**发送：**
```javascript
socket.emit('ai:remove', {
  roomCode: '1234',
  aiId: 'ai-uuid'
});
```

**权限：** 仅限房主

---

### 2.4 游戏事件

#### game:start - 开始游戏
**发送：**
```javascript
socket.emit('game:start', {
  roomCode: '1234'
});
```

**权限：** 仅限房主

**条件：**
- 房间人数 >= 2
- 房间状态为 waiting

**接收成功：**
```javascript
socket.on('game:start', (data) => {
  // data.success === true
  // data.gameState - 游戏初始状态
});
```

**接收失败：**
```javascript
socket.on('error', (error) => {
  // error.code: 'NOT_ENOUGH_PLAYERS' | 'PERMISSION_DENIED' | 'GAME_ALREADY_STARTED'
});
```

---

#### game:state - 游戏状态更新
**接收（服务器广播）：**
```javascript
socket.on('game:state', (gameState) => {
  // gameState.currentPlayerId - 当前玩家ID
  // gameState.direction - 'clockwise' | 'counterclockwise'
  // gameState.deck.length - 牌堆剩余
  // gameState.discardPile - 弃牌堆
  // gameState.currentColor - 当前颜色
  // gameState.turnTimer - 剩余时间（秒）
});
```

---

#### game:playCard - 出牌
**发送：**
```javascript
socket.emit('game:playCard', {
  roomCode: '1234',
  cardId: 'card-uuid',
  chosenColor: 'red'  // 出万能牌时必填
});
```

**参数：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomCode | string | 是 | 房间号 |
| cardId | string | 是 | 卡牌ID |
| chosenColor | string | 出万能牌时 | red/yellow/green/blue |

**条件：**
- 是当前玩家的回合
- 卡牌可以打出（颜色/数字匹配）

**接收失败：**
```javascript
socket.on('error', (error) => {
  // error.code: 'GAME_NOT_FOUND' | 'NOT_YOUR_TURN' | 'INVALID_PLAY'
});
```

---

#### game:drawCard - 摸牌
**发送：**
```javascript
socket.emit('game:drawCard', {
  roomCode: '1234'
});
```

**条件：**
- 是当前玩家的回合

**效果：**
- 摸1张牌
- 自动结束回合

**接收失败：**
```javascript
socket.on('error', (error) => {
  // error.code: 'GAME_NOT_FOUND' | 'NOT_YOUR_TURN'
});
```

---

#### game:callUno - 喊UNO
**发送：**
```javascript
socket.emit('game:callUno', {
  roomCode: '1234'
});
```

**条件：**
- 手牌剩余1张

---

### 2.5 游戏结束

#### game:ended - 游戏结束
**接收（服务器广播）：**
```javascript
socket.on('game:ended', (data) => {
  // data.winner - 获胜者信息
});
```

---

## 三、错误码列表

### 3.1 房间错误

| 错误码 | 说明 | 触发条件 |
|--------|------|----------|
| `CREATE_ROOM_FAILED` | 创建房间失败 | 服务器内部错误 |
| `ROOM_NOT_FOUND` | 房间不存在 | 加入不存在的房间 |
| `PERMISSION_DENIED` | 权限不足 | 非房主执行房主操作 |
| `NOT_ENOUGH_PLAYERS` | 玩家不足 | 开始游戏时少于2人 |
| `GAME_ALREADY_STARTED` | 游戏已开始 | 重复开始游戏 |

### 3.2 游戏错误

| 错误码 | 说明 | 触发条件 |
|--------|------|----------|
| `GAME_NOT_FOUND` | 游戏不存在 | 操作不存在的游戏 |
| `NOT_YOUR_TURN` | 不是你的回合 | 非当前玩家操作 |
| `INVALID_PLAY` | 非法出牌 | 卡牌不能打出 |

---

## 四、数据类型定义

### 4.1 Player（玩家）

```typescript
interface Player {
  id: string;              // 玩家ID
  nickname: string;        // 昵称
  avatar?: string;         // 头像（可选）
  isHost: boolean;         // 是否房主
  isAI: boolean;           // 是否AI
  aiDifficulty?: 'easy' | 'normal' | 'hard';  // AI难度
  cards: Card[];           // 手牌（仅自己可见）
  cardCount: number;       // 手牌数量（对外显示）
  isConnected: boolean;    // 是否在线
  isReady: boolean;        // 是否准备
}
```

### 4.2 Card（卡牌）

```typescript
interface Card {
  id: string;              // 卡牌ID
  type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4';
  color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
  value: number | string;  // 数字或类型标识
}
```

### 4.3 GameState（游戏状态）

```typescript
interface GameState {
  currentPlayerId: string;           // 当前玩家ID
  direction: 'clockwise' | 'counterclockwise';  // 出牌方向
  deck: Card[];                      // 牌堆
  discardPile: Card[];               // 弃牌堆
  currentColor: string;              // 当前颜色
  turnTimer: number;                 // 剩余时间（秒）
  turnStartTime: number;             // 回合开始时间
  lastAction?: GameAction;           // 最后一次操作
  winner?: string;                   // 获胜者ID
}
```

### 4.4 Room（房间）

```typescript
interface Room {
  id: string;              // 房间ID
  code: string;            // 4位房间号
  players: Player[];       // 玩家列表
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;          // 房主ID
  maxPlayers: number;      // 最大人数（8）
  createdAt: number;       // 创建时间戳
  gameState?: GameState;   // 游戏状态
  settings: RoomSettings;  // 房间设置
}
```

---

## 五、使用示例

### 5.1 完整游戏流程

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// 1. 创建房间
socket.emit('room:create', { nickname: '玩家1' });

socket.on('room:create', (data) => {
  if (data.success) {
    const roomCode = data.room.code;
    console.log('房间号:', roomCode);
    
    // 2. 添加AI
    socket.emit('ai:add', { roomCode, difficulty: 'normal' });
    
    // 3. 开始游戏
    socket.emit('game:start', { roomCode });
  }
});

// 4. 监听游戏状态
socket.on('game:state', (gameState) => {
  console.log('当前玩家:', gameState.currentPlayerId);
  console.log('剩余时间:', gameState.turnTimer);
  
  // 如果是我的回合
  if (gameState.currentPlayerId === socket.id) {
    // 出牌或摸牌
  }
});

// 5. 出牌
function playCard(cardId, chosenColor) {
  socket.emit('game:playCard', {
    roomCode: '1234',
    cardId,
    chosenColor
  });
}

// 6. 摸牌
function drawCard() {
  socket.emit('game:drawCard', { roomCode: '1234' });
}

// 7. 游戏结束
socket.on('game:ended', (data) => {
  console.log('获胜者:', data.winner.nickname);
});
```

---

## 六、更新记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-03-15 | v1.0 | 初始API文档 |