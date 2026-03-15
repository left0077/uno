#!/usr/bin/env node
/**
 * CardManager 单元测试
 * 测试牌组生成和出牌规则
 */

import { CardManager } from './dist/game/Card.js';

console.log('🧪 CardManager 单元测试\n');
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
    }
  };
}

// ===== 牌组生成测试 =====

test('生成108张牌', () => {
  const deck = CardManager.createDeck();
  expect(deck).toHaveLength(108);
});

test('各色牌数量正确（19张数字牌 + 6张功能牌 = 25张）', () => {
  const deck = CardManager.createDeck();
  const redCards = deck.filter(c => c.color === 'red');
  const yellowCards = deck.filter(c => c.color === 'yellow');
  const greenCards = deck.filter(c => c.color === 'green');
  const blueCards = deck.filter(c => c.color === 'blue');
  
  expect(redCards).toHaveLength(25);
  expect(yellowCards).toHaveLength(25);
  expect(greenCards).toHaveLength(25);
  expect(blueCards).toHaveLength(25);
});

test('包含8张万能牌（4张变色 + 4张+4）', () => {
  const deck = CardManager.createDeck();
  const wildCards = deck.filter(c => c.type === 'wild');
  const draw4Cards = deck.filter(c => c.type === 'draw4');
  
  expect(wildCards).toHaveLength(4);
  expect(draw4Cards).toHaveLength(4);
});

test('包含正确数量的数字牌', () => {
  const deck = CardManager.createDeck();
  const numberCards = deck.filter(c => c.type === 'number');
  
  // 4色 x (1张0 + 18张1-9各2张) = 76张
  expect(numberCards).toHaveLength(76);
});

test('包含正确数量的功能牌', () => {
  const deck = CardManager.createDeck();
  const skipCards = deck.filter(c => c.type === 'skip');
  const reverseCards = deck.filter(c => c.type === 'reverse');
  const draw2Cards = deck.filter(c => c.type === 'draw2');
  
  // 4色 x 各2张 = 8张每种
  expect(skipCards).toHaveLength(8);
  expect(reverseCards).toHaveLength(8);
  expect(draw2Cards).toHaveLength(8);
});

// ===== 洗牌测试 =====

test('洗牌改变顺序', () => {
  const deck1 = CardManager.createDeck();
  const deck2 = CardManager.shuffleDeck([...deck1]);
  
  expect(deck1.length).toBe(deck2.length);
  
  // 检查是否被打乱（比较前20张）
  let different = false;
  for (let i = 0; i < 20; i++) {
    if (deck1[i].id !== deck2[i].id) {
      different = true;
      break;
    }
  }
  expect(different).toBeTruthy();
});

// ===== 出牌规则测试 =====

test('相同颜色可以出牌', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard = { id: '2', type: 'number', color: 'red', value: 7 };
  
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeTruthy();
});

test('相同数字可以出牌', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard = { id: '2', type: 'number', color: 'blue', value: 5 };
  
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeTruthy();
});

test('万能牌随时可出', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const wildCard = { id: '2', type: 'wild', color: 'wild', value: 'wild' };
  const draw4Card = { id: '3', type: 'draw4', color: 'wild', value: 'draw4' };
  
  expect(CardManager.canPlayCard(wildCard, topCard, 'yellow')).toBeTruthy();
  expect(CardManager.canPlayCard(draw4Card, topCard, 'green')).toBeTruthy();
});

test('不同颜色不同数字不可出', () => {
  const topCard = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard = { id: '2', type: 'number', color: 'blue', value: 7 };
  
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeFalsy();
});

test('手牌有当前颜色时不可出+4', () => {
  const hand = [
    { id: '1', type: 'number', color: 'red', value: 3 },
    { id: '2', type: 'draw4', color: 'wild', value: 'draw4' }
  ];
  
  expect(CardManager.canPlayDraw4(hand, 'red')).toBeFalsy();
});

test('手牌无当前颜色时可出+4', () => {
  const hand = [
    { id: '1', type: 'number', color: 'blue', value: 3 },
    { id: '2', type: 'draw4', color: 'wild', value: 'draw4' }
  ];
  
  expect(CardManager.canPlayDraw4(hand, 'red')).toBeTruthy();
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
    console.log('\n✨ 所有 CardManager 测试通过！');
  } else {
    console.log(`\n⚠️  ${failed} 个测试失败`);
  }
  
  return { total: tests.length, passed, failed };
}

runTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
