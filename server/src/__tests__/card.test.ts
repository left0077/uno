// CardManager 测试
import { CardManager } from '../game/Card.js';
import type { Card } from '../shared/types.js';

console.log('🧪 CardManager 测试\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) throw new Error(`期望 ${expected}, 实际 ${actual}`);
    },
    toHaveLength: (expected: number) => {
      if (actual.length !== expected) throw new Error(`期望长度 ${expected}, 实际 ${actual.length}`);
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`期望为真值`);
    },
    toBeFalsy: () => {
      if (actual) throw new Error(`期望为假值`);
    }
  };
}

// 测试1: 牌组生成
test('应该生成108张牌', () => {
  const deck = CardManager.createDeck();
  expect(deck).toHaveLength(108);
});

// 测试2: 颜色分布（19张数字牌 + 6张功能牌 = 25张）
test('应该包含正确数量的各色牌', () => {
  const deck = CardManager.createDeck();
  const redCards = deck.filter((c: Card) => c.color === 'red');
  expect(redCards).toHaveLength(25);
});

// 测试3: 万能牌数量
test('应该包含8张万能牌', () => {
  const deck = CardManager.createDeck();
  const wildCards = deck.filter((c: Card) => c.type === 'wild' || c.type === 'draw4');
  expect(wildCards).toHaveLength(8);
});

// 测试4: 出牌检查
test('相同颜色可以出牌', () => {
  const topCard: Card = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard: Card = { id: '2', type: 'number', color: 'red', value: 7 };
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeTruthy();
});

// 测试5: 不同颜色不同数字不可出
test('不匹配不可出牌', () => {
  const topCard: Card = { id: '1', type: 'number', color: 'red', value: 5 };
  const playCard: Card = { id: '2', type: 'number', color: 'blue', value: 7 };
  expect(CardManager.canPlayCard(playCard, topCard, 'red')).toBeFalsy();
});

console.log(`\n📊 结果: ${passed}/${passed + failed} 通过`);
process.exit(failed > 0 ? 1 : 0);
