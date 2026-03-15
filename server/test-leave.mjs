import { RoomManager } from './dist/rooms/RoomManager.js';

const rm = new RoomManager();

// 创建房间
const room = rm.createRoom('player-1', '房主');
console.log('创建房间:', room.code);
console.log('初始玩家数:', room.players.length);

// 另一个玩家加入
rm.joinRoom(room.code, 'player-2', '玩家2');
console.log('玩家2加入后玩家数:', room.players.length);
console.log('玩家列表:', room.players.map(p => p.nickname));

// 模拟玩家2离开（等待状态）
const updatedRoom = rm.leaveRoom('player-2');
console.log('玩家2离开后:', updatedRoom ? '房间还在' : '房间已删除');
if (updatedRoom) {
  console.log('剩余玩家数:', updatedRoom.players.length);
  console.log('剩余玩家列表:', updatedRoom.players.map(p => p.nickname));
}

console.log('✅ 测试完成');
