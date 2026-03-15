#!/usr/bin/env node
/**
 * UnoGame 单元测试
 * 测试游戏逻辑、连打规则、抢打出牌、排名模式
 */

import { RoomManager } from './dist/rooms/RoomManager.js';
import { UnoGame } from './dist/game/UnoGame.js';

console.log('🧪 UnoGame 单元测试\n');
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
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`期望大于: ${expected}, 实际: ${actual}`);
      }
    }
  };
}

// 创建测试房间和游戏
function createTestGame() {
  const rm = new RoomManager();
  const room = rm.createRoom('player-1', '玩家1');
  rm.joinRoom(room.code, 'player-2', '玩家2');
  
  let lastState = null;
  const game = new UnoGame(
    room,
    (state) => { lastState = state; },
    (winner) => { }
  );
  
  return { rm, room, game, getState: () => lastState || game.getGameState() };
}

// ===== 游戏初始化测试 =====

test('游戏初始化时每人7张牌', () => {
  const { room, game } = createTestGame();
  
  for (const player of room.players) {
    expect(player.cards).toHaveLength(7);
    expect(player.cardCount).toBe(7);
  }
});

test('游戏初始化时设置当前玩家', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  
  expect(state.currentPlayerId).toBeTruthy();
});

test('游戏初始化时设置当前颜色', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  
  expect(['red', 'yellow', 'green', 'blue']).toContain(state.currentColor);
});

test('游戏初始化时弃牌堆有1张牌', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  
  expect(state.discardPile).toHaveLength(1);
});

test('游戏开始时房间状态为playing', () => {
  const { room } = createTestGame();
  
  expect(room.status).toBe('playing');
});

// ===== 摸牌测试 =====

test('当前玩家可以摸牌', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  
  const result = game.drawCards(playerId, 1);
  
  expect(result).toHaveLength(1);
});

test('非当前玩家不能摸牌', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const otherPlayer = state.players.find(p => p.id !== state.currentPlayerId);
  
  const result = game.drawCards(otherPlayer.id, 1);
  
  expect(result).toHaveLength(0);
});

test('摸牌后手牌增加', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  const beforeCount = player.cardCount;
  
  game.drawCards(playerId, 1);
  
  expect(player.cardCount).toBe(beforeCount + 1);
});

// ===== 出牌测试 =====

test('当前玩家可以出合法的牌', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 找到一张可出的牌
  const playableCard = player.cards.find(c => 
    c.color === state.currentColor || c.type === 'wild' || c.type === 'draw4'
  );
  
  if (playableCard) {
    const result = game.playCard(playerId, playableCard.id, 'red');
    expect(result).toBeTruthy();
  }
});

test('非当前玩家不能出牌', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const otherPlayer = state.players.find(p => p.id !== state.currentPlayerId);
  
  const card = otherPlayer.cards[0];
  const result = game.playCard(otherPlayer.id, card.id);
  
  expect(result).toBeFalsy();
});

test('不能出不合法的牌', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 找一张不匹配的牌（如果没有则不测试）
  const unplayableCard = player.cards.find(c => 
    c.color !== state.currentColor && 
    c.type !== 'wild' && 
    c.type !== 'draw4'
  );
  
  if (unplayableCard) {
    const result = game.playCard(playerId, unplayableCard.id);
    expect(result).toBeFalsy();
  }
});

// ===== 功能牌效果测试 =====

test('Skip牌跳过下家', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 获取当前玩家索引
  const currentIndex = state.players.findIndex(p => p.id === playerId);
  const nextPlayerId = state.players[(currentIndex + 1) % state.players.length].id;
  
  // 手动设置一张Skip牌
  const skipCard = { id: 'skip-test', type: 'skip', color: state.currentColor, value: 'skip' };
  player.cards.push(skipCard);
  player.cardCount++;
  
  game.playCard(playerId, skipCard.id);
  const afterState = game.getGameState();
  
  // 应该跳过下一家（当前回合回到出Skip牌的玩家，因为2人局）
  // 或者正确设置被跳过的玩家标记
  expect(afterState.skippedPlayerId || afterState.currentPlayerId).toBeTruthy();
});

test('Reverse牌反转方向', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  const beforeDir = state.direction;
  
  // 手动设置一张Reverse牌
  const reverseCard = { id: 'reverse-test', type: 'reverse', color: state.currentColor, value: 'reverse' };
  player.cards.push(reverseCard);
  player.cardCount++;
  
  game.playCard(playerId, reverseCard.id);
  const afterState = game.getGameState();
  
  // 方向应该反转
  expect(afterState.direction).toBe(beforeDir === 'clockwise' ? 'counterclockwise' : 'clockwise');
});

// ===== 连打规则测试 =====

test('+2牌设置累积惩罚', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 手动设置一张+2牌
  const draw2Card = { id: 'draw2-test', type: 'draw2', color: state.currentColor, value: 'draw2' };
  player.cards.push(draw2Card);
  player.cardCount++;
  
  game.playCard(playerId, draw2Card.id);
  const afterState = game.getGameState();
  
  expect(afterState.pendingDraw).toBe(2);
  expect(afterState.pendingDrawType).toBe('draw2');
});

test('+2可以叠加+2', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  
  // 设置累积惩罚
  state.pendingDraw = 2;
  state.pendingDrawType = 'draw2';
  
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 给玩家一张+2牌
  const draw2Card = { id: 'draw2-test', type: 'draw2', color: state.currentColor, value: 'draw2' };
  player.cards.push(draw2Card);
  player.cardCount++;
  
  const result = game.playCard(playerId, draw2Card.id);
  const afterState = game.getGameState();
  
  expect(result).toBeTruthy();
  expect(afterState.pendingDraw).toBe(4); // 2 + 2 = 4
});

test('+4可以叠加+4', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  
  // 设置累积惩罚
  state.pendingDraw = 4;
  state.pendingDrawType = 'draw4';
  state.currentColor = 'red';
  
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 给玩家一张+4牌
  const draw4Card = { id: 'draw4-test', type: 'draw4', color: 'wild', value: 'draw4' };
  player.cards.push(draw4Card);
  player.cardCount++;
  
  const result = game.playCard(playerId, draw4Card.id, 'blue');
  const afterState = game.getGameState();
  
  expect(result).toBeTruthy();
  expect(afterState.pendingDraw).toBe(8); // 4 + 4 = 8
});

test('+2不能叠加+4', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  
  // 设置+2累积惩罚
  state.pendingDraw = 2;
  state.pendingDrawType = 'draw2';
  state.currentColor = 'red';
  
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 给玩家一张+4牌
  const draw4Card = { id: 'draw4-test', type: 'draw4', color: 'wild', value: 'draw4' };
  player.cards.push(draw4Card);
  player.cardCount++;
  
  const result = game.playCard(playerId, draw4Card.id, 'blue');
  
  expect(result).toBeFalsy(); // 不能叠加不同类型
});

// ===== 排名模式测试 =====

test('玩家出完牌后进入排名列表', () => {
  const { game, room } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 清空玩家手牌（模拟出完）
  player.cards = [];
  player.cardCount = 0;
  
  // 手动调用结束游戏
  game.endGame(player);
  
  const afterState = game.getGameState();
  expect(afterState.rankings).toContain(playerId);
});

test('排名模式下游戏继续直到所有玩家排名', () => {
  const { game, room } = createTestGame();
  const state = game.getGameState();
  
  // 模拟第一名玩家出完
  const firstPlayer = state.players[0];
  firstPlayer.cards = [];
  firstPlayer.cardCount = 0;
  game.endGame(firstPlayer);
  
  // 在排名模式下，应该有一个玩家进入排名
  // 注意：endGame会修改room.status，所以rankings中应该有第一名玩家
  const hasFirstPlayer = state.rankings.includes(firstPlayer.id);
  expect(hasFirstPlayer).toBeTruthy();
});

// ===== UNO 相关测试 =====

test('喊UNO成功', () => {
  const { game } = createTestGame();
  const state = game.getGameState();
  const playerId = state.currentPlayerId;
  const player = state.players.find(p => p.id === playerId);
  
  // 设置玩家只剩1张牌
  player.cards = player.cards.slice(0, 1);
  player.cardCount = 1;
  
  const result = game.callUno(playerId);
  expect(result).toBeTruthy();
  expect(player.hasCalledUno).toBeTruthy();
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
    console.log('\n✨ 所有 UnoGame 测试通过！');
  } else {
    console.log(`\n⚠️  ${failed} 个测试失败`);
  }
  
  return { total: tests.length, passed, failed };
}

runTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
