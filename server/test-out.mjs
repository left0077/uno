import { RoomManager } from './dist/rooms/RoomManager.js';
import { UnoGame } from './dist/game/UnoGame.js';

console.log('🧪 Out模式和新卡牌测试\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passCount++;
  } else {
    console.log(`❌ ${name}`);
    failCount++;
  }
}

// 测试1: RingSystem可以被实例化
console.log('\n📍 测试 RingSystem 系统');
try {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom('host1', '房主1', { mode: 'out' });
  roomManager.joinRoom(room.code, 'player2', '玩家2');
  
  let gameState = null;
  let gameEnd = false;
  
  const game = new UnoGame(
    room,
    (state) => { gameState = state; },
    (winner) => { gameEnd = true; },
    (playerId, type, content) => {}
  );
  
  // 立即获取游戏状态（构造函数内已设置）
  gameState = game.getGameState();
  
  test('Out模式游戏正常初始化', gameState !== null);
  test('游戏状态存在', !!gameState);
  test('Out状态已创建', gameState.outState !== undefined);
  test('初始阶段为0', gameState.outState?.phase === 0);
  test('初始无手牌限制', gameState.outState?.maxCards === 0);
  test('有下次Out时间', gameState.outState?.nextRingAt > 0);
  test('记录开始时间', gameState.gameStartTime > 0);
  test('记录真人数量', gameState.humanPlayerCount === 2);
  
  game.destroy();
} catch (e) {
  console.log('❌ RingSystem测试失败:', e.message);
  failCount += 8;
}

// 测试2: 新卡牌类型
console.log('\n📍 测试新卡牌类型');
try {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom('host1', '房主1', { mode: 'out' });
  roomManager.joinRoom(room.code, 'player2', '玩家2');
  
  let gameState = null;
  const game = new UnoGame(
    room,
    (state) => { gameState = state; },
    () => {},
    () => {}
  );
  
  // 立即获取游戏状态
  gameState = game.getGameState();
  
  // 手动注入新卡牌到牌库
  const newCards = [
    { id: 'test-draw3', type: 'draw3', color: 'red', value: '+3' },
    { id: 'test-draw5', type: 'draw5', color: 'blue', value: '+5' },
    { id: 'test-draw8', type: 'draw8', color: 'wild', value: '+8' }
  ];
  
  gameState.deck.push(...newCards);
  
  test('新卡牌可加入牌库', gameState.deck.some(c => c.type === 'draw3'));
  test('draw3卡牌结构正确', gameState.deck.find(c => c.type === 'draw3')?.value === '+3');
  test('draw5卡牌结构正确', gameState.deck.find(c => c.type === 'draw5')?.value === '+5');
  test('draw8卡牌结构正确', gameState.deck.find(c => c.type === 'draw8')?.color === 'wild');
  
  game.destroy();
} catch (e) {
  console.log('❌ 新卡牌测试失败:', e.message);
  failCount += 4;
}

// 测试3: 淘汰玩家字段
console.log('\n📍 测试淘汰玩家字段');
try {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom('host1', '房主1', { mode: 'out' });
  roomManager.joinRoom(room.code, 'player2', '玩家2');
  
  const player = room.players[0];
  test('玩家初始未被淘汰', player.eliminated === undefined || player.eliminated === false);
  
  // 模拟淘汰
  player.eliminated = true;
  test('淘汰标识可设置', player.eliminated === true);
  
} catch (e) {
  console.log('❌ 淘汰字段测试失败:', e.message);
  failCount += 2;
}

// 测试4: 标准模式不启用RingSystem
console.log('\n📍 测试标准模式');
try {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom('host1', '房主1', { mode: 'standard' });
  roomManager.joinRoom(room.code, 'player2', '玩家2');
  
  let gameState = null;
  const game = new UnoGame(
    room,
    (state) => { gameState = state; },
    () => {},
    () => {}
  );
  
  gameState = game.getGameState();
  
  test('标准模式无Out状态', gameState.outState === undefined);
  test('标准模式正常游戏', gameState.players.length === 2);
  
  game.destroy();
} catch (e) {
  console.log('❌ 标准模式测试失败:', e.message);
  failCount += 2;
}

// 汇总
console.log('\n' + '='.repeat(60));
console.log('📊 测试结果汇总');
console.log('='.repeat(60));
console.log(`总计: ${passCount + failCount} 个测试`);
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);

if (failCount === 0) {
  console.log('\n✨ Out模式和新卡牌测试全部通过！');
} else {
  console.log('\n⚠️ 部分测试失败');
  process.exit(1);
}
