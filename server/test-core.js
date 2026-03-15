#!/usr/bin/env node
/**
 * 核心逻辑单元测试
 * 不依赖外部服务器，直接测试核心模块
 */

import { CardManager } from './src/game/Card.js';
import { RoomManager } from './src/rooms/RoomManager.js';

console.log('🧪 Uno 核心逻辑单元测试\n');
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
    },
    not: {
      toEqual(expected) {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`期望不相等: ${JSON.stringify(expected)}`);
        }
      }
    }
  };
}

// ===== CardManager 测试 =====

test('CardManager.createDeck - 生成108张牌', () => {
  const deck = CardManager.createDeck();
  expect(deck).toHaveLength(108);
});

test('CardManager.createDeck - 包含正确颜色分布', () => {
  const deck = CardManager.createDeck();
  const redCards = deck.filter(c => c.color === 'red');
  const yellowCards = deck.filter(c => c.color === 'yellow');
  const greenCards = deck.filter(c => c.color === 'green');
  const blueCards = deck.filter(c => c.color === 'blue');
  
  expect(redCards).toHaveLength(19);
  expect(yellowCards).toHaveLength(19);
  expect(greenCards).toHaveLength(19);
  expect(blueCards).toHaveLength(19);
});

test('CardManager.createDeck - 包含8张万能牌', () => {
  const deck = CardManager.createDeck();
  const wildCards = deck.filter(c => c.type === 'wild');
  const draw4Cards = deck.filter(c => c.type === 'draw4');
  
  expect(wildCards).toHaveLength(4);
  expect(draw4Cards).toHaveLength(4);
});

test('CardManager.shuffleDeck - 洗牌改变顺序', () => {
  const deck1 = CardManager.createDeck();
  const deck2 = CardManager.shuffleDeck([...deck1]);
  
  expect(deck1.length).toBe(deck2.length);
  
  // 检查是否被打乱
  let different = false;
  for (let i = 0; i < 20; i++) {
    if (deck1[i].id !== deck2[i].id) {
      different = true;
      break;
    }
  }
  expect(different).toBeTruthy();
});

test('CardManager.canPlayCard - 相同颜色可出牌', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard = { id: '2', type: 'number', color: 'red', value: 7 };
  
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeTruthy();
});

test('CardManager.canPlayCard - 相同数字可出牌', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard = { id: '2', type: 'number', color: 'blue', value: 5 };
  
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeTruthy();
});

test('CardManager.canPlayCard - 万能牌随时可出', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const wildCard = { id: '2', type: 'wild', color: 'wild', value: 'wild' };
  const draw4Card = { id: '3', type: 'draw4', color: 'wild', value: 'draw4' };
  
  expect(CardManager.canPlayCard(wildCard, topCard, 'yellow')).toBeTruthy();
  expect(CardManager.canPlayCard(draw4Card, topCard, 'green')).toBeTruthy();
});

test('CardManager.canPlayCard - 不匹配不可出', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard = { id: '2', type: 'number', color: 'blue', value: 7 };
  
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeFalsy();
});

test('CardManager.canPlayDraw4 - 手牌有当前颜色时不可出+4', () => {
  const hand = [
    { id: '1', type: 'number', color: 'red', value: 3 },
    { id: '2', type: 'draw4', color: 'wild', value: 'draw4' }
  ];
  
  expect(CardManager.canPlayDraw4(hand, 'red')).toBeFalsy();
});

test('CardManager.canPlayDraw4 - 手牌无当前颜色时可出+4', () => {
  const hand = [
    { id: '1', type: 'number', color: 'blue', value: 3 },
    { id: '2', type: 'draw4', color: 'wild', value: 'draw4' }
  ];
  
  expect(CardManager.canPlayDraw4(hand, 'red')).toBeTruthy();
});

// ===== RoomManager 测试 =====

const roomManager = new RoomManager();

test('RoomManager.createRoom - 生成4位房间号', () => {
  const room = roomManager.createRoom('player-1', '玩家1');
  
  expect(room.code).toHaveLength(4);
  expect(/^[0-9]{4}$/.test(room.code)).toBeTruthy();
});

test('RoomManager.createRoom - 房主自动加入', () => {
  const room = roomManager.createRoom('player-2', '玩家2');
  
  expect(room.players).toHaveLength(1);
  expect(room.players[0].id).toBe('player-2');
  expect(room.players[0].isHost).toBeTruthy();
});

test('RoomManager.joinRoom - 正常加入房间', () => {
  const room1 = roomManager.createRoom('player-3', '房主');
  const room2 = roomManager.joinRoom(room1.code, 'player-4', '玩家4');
  
  expect(room2).toBeTruthy();
  expect(room2.players).toHaveLength(2);
});

test('RoomManager.joinRoom - 房间不存在返回null', () => {
  const room = roomManager.joinRoom('9999', 'player-5', '玩家5');
  
  expect(room).toBeFalsy();
});

test('RoomManager.addAI - 添加AI成功', () => {
  const room = roomManager.createRoom('player-6', '房主');
  const ai = roomManager.addAI(room.code, 'normal');
  
  expect(ai).toBeTruthy();
  expect(ai.isAI).toBeTruthy();
  expect(room.players).toHaveLength(2);
});

test('RoomManager.leaveRoom - 房主离开转让房主', () => {
  const room = roomManager.createRoom('player-7', '房主');
  roomManager.joinRoom(room.code, 'player-8', '玩家8');
  
  roomManager.leaveRoom('player-7');
  
  const updatedRoom = roomManager.getRoom(room.code);
  expect(updatedRoom.hostId).toBe('player-8');
  expect(updatedRoom.players[0].isHost).toBeTruthy();
});

test('RoomManager.getRoom - 获取房间信息', () => {
  const room1 = roomManager.createRoom('player-9', '玩家9');
  const room2 = roomManager.getRoom(room1.code);
  
  expect(room2).toBeTruthy();
  expect(room2.code).toBe(room1.code);
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
    console.log('\n✨ 所有核心逻辑测试通过！');
    console.log('API功能已实现并验证。');
  } else {
    console.log(`\n⚠️  ${failed} 个测试失败`);
  }
  
  return { total: tests.length, passed, failed };
}

runTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
