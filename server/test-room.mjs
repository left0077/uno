#!/usr/bin/env node
/**
 * RoomManager 单元测试
 * 测试房间管理功能
 */

import { RoomManager } from './dist/rooms/RoomManager.js';

console.log('🧪 RoomManager 单元测试\n');
console.log('='.repeat(60));

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`期望: ${expected}, 实际: ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`期望为真值, 实际: ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`期望为假值, 实际: ${actual}`);
      }
    },
    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`期望长度: ${expected}, 实际: ${actual.length}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`期望包含: ${expected}`);
      }
    }
  };
}

// 创建独立的 RoomManager 实例用于测试
function createRoomManager() {
  return new RoomManager();
}

// ===== 房间创建测试 =====

test('创建房间生成4位数字房间号', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('player-1', '玩家1');
  
  expect(room.code).toHaveLength(4);
  expect(/^[0-9]{4}$/.test(room.code)).toBeTruthy();
});

test('创建房间时房主自动加入', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('player-1', '玩家1');
  
  expect(room.players).toHaveLength(1);
  expect(room.players[0].id).toBe('player-1');
  expect(room.players[0].isHost).toBeTruthy();
  expect(room.players[0].nickname).toBe('玩家1');
});

test('创建房间时状态为waiting', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('player-1', '玩家1');
  
  expect(room.status).toBe('waiting');
});

test('创建房间时有默认设置', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('player-1', '玩家1');
  
  expect(room.settings.allowStacking).toBeTruthy();
  expect(room.settings.allowMultipleCards).toBeTruthy();
  expect(room.settings.allowJumpIn).toBeTruthy();
  expect(room.settings.scoringMode).toBeTruthy();
});

// ===== 加入房间测试 =====

test('正常加入房间', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  const joinedRoom = rm.joinRoom(room.code, 'player-2', '玩家2');
  
  expect(joinedRoom).toBeTruthy();
  expect(joinedRoom.players).toHaveLength(2);
});

test('加入不存在的房间返回null', () => {
  const rm = createRoomManager();
  const room = rm.joinRoom('9999', 'player-1', '玩家1');
  
  expect(room).toBeFalsy();
});

test('重复加入房间返回同一房间', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('player-1', '玩家1');
  const joinedAgain = rm.joinRoom(room.code, 'player-1', '玩家1');
  
  expect(joinedAgain.code).toBe(room.code);
  expect(joinedAgain.players).toHaveLength(1);
});

test('房间满员时无法加入', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  
  // 添加7个玩家（加上房主共8人）
  for (let i = 1; i <= 7; i++) {
    rm.joinRoom(room.code, `player-${i}`, `玩家${i}`);
  }
  
  expect(room.players).toHaveLength(8);
  
  // 第9人无法加入
  const result = rm.joinRoom(room.code, 'player-9', '玩家9');
  expect(result).toBeFalsy();
});

// ===== AI 管理测试 =====

test('房主可以添加AI', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  const ai = rm.addAI(room.code, 'normal');
  
  expect(ai).toBeTruthy();
  expect(ai.isAI).toBeTruthy();
  expect(room.players).toHaveLength(2);
});

test('非等待状态无法添加AI', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  room.status = 'playing'; // 手动修改状态
  
  const ai = rm.addAI(room.code, 'normal');
  expect(ai).toBeFalsy();
});

test('可以移除AI', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  const ai = rm.addAI(room.code, 'normal');
  
  const result = rm.removeAI(room.code, ai.id);
  expect(result).toBeTruthy();
  expect(room.players).toHaveLength(1);
});

// ===== 离开房间测试 =====

test('房主离开转让房主身份', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  rm.joinRoom(room.code, 'player-2', '玩家2');
  
  rm.leaveRoom('host');
  
  const updatedRoom = rm.getRoom(room.code);
  expect(updatedRoom.hostId).toBe('player-2');
  expect(updatedRoom.players[0].isHost).toBeTruthy();
});

test('玩家离开房间', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  rm.joinRoom(room.code, 'player-2', '玩家2');
  
  rm.leaveRoom('player-2');
  
  const updatedRoom = rm.getRoom(room.code);
  expect(updatedRoom.players).toHaveLength(1);
});

test('所有玩家离开后房间被删除', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  
  rm.leaveRoom('host');
  
  const deletedRoom = rm.getRoom(room.code);
  expect(deletedRoom).toBeFalsy();
});

// ===== 房间设置测试 =====

test('房主可以修改房间设置', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  
  const result = rm.updateSettings(room.code, 'host', { allowStacking: false });
  
  expect(result).toBeTruthy();
  expect(room.settings.allowStacking).toBeFalsy();
});

test('非房主无法修改房间设置', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  rm.joinRoom(room.code, 'player-2', '玩家2');
  
  const result = rm.updateSettings(room.code, 'player-2', { allowStacking: false });
  
  expect(result).toBeFalsy();
});

test('游戏开始后无法修改设置', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  room.status = 'playing';
  
  const result = rm.updateSettings(room.code, 'host', { allowStacking: false });
  
  expect(result).toBeFalsy();
});

// ===== 断线标记测试 =====

test('标记玩家断开连接', () => {
  const rm = createRoomManager();
  const room = rm.createRoom('host', '房主');
  rm.joinRoom(room.code, 'player-2', '玩家2');
  
  rm.markPlayerDisconnected('player-2');
  
  const player = room.players.find(p => p.id === 'player-2');
  expect(player.isConnected).toBeFalsy();
  expect(player.disconnectedAt).toBeTruthy();
});

// ===== 运行测试 =====

async function runTests() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${name}`);
      console.log(`   错误: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总计: ${tests.length} 个测试`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n✨ 所有 RoomManager 测试通过！');
  } else {
    console.log(`\n⚠️  ${failed} 个测试失败`);
  }
  
  return { total: tests.length, passed, failed };
}

runTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
