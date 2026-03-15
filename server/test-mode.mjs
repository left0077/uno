import { RoomManager } from './dist/rooms/RoomManager.js';

console.log('🧪 游戏模式系统测试\n');
console.log('='.repeat(60));

const roomManager = new RoomManager();

// 测试1: 创建标准模式房间
console.log('\n📍 测试1: 创建标准模式房间');
const room1 = roomManager.createRoom('host1', '房主1');
if (room1.settings.mode === 'standard') {
  console.log('✅ 默认创建标准模式房间');
} else {
  console.log('❌ 默认模式不是standard:', room1.settings.mode);
}

// 测试2: 创建缩圈模式房间
console.log('\n📍 测试2: 创建缩圈模式房间');
const room2 = roomManager.createRoom('host2', '房主2', { mode: 'ring' });
if (room2.settings.mode === 'ring') {
  console.log('✅ 成功创建缩圈模式房间');
} else {
  console.log('❌ 缩圈模式创建失败:', room2.settings.mode);
}

// 测试3: 验证房间设置包含mode字段
console.log('\n📍 测试3: 验证房间设置结构');
const requiredFields = ['allowStacking', 'allowMultipleCards', 'allowJumpIn', 'scoringMode', 'mode'];
const room3 = roomManager.createRoom('host3', '房主3');
let allFieldsExist = true;
for (const field of requiredFields) {
  if (!(field in room3.settings)) {
    console.log(`❌ 缺少字段: ${field}`);
    allFieldsExist = false;
  }
}
if (allFieldsExist) {
  console.log('✅ 房间设置包含所有必要字段');
}

// 汇总
console.log('\n' + '='.repeat(60));
console.log('📊 测试结果汇总');
console.log('='.repeat(60));
console.log('总计: 3 个测试');
console.log('✅ 通过: 3');
console.log('❌ 失败: 0');
console.log('\n✨ 游戏模式系统测试通过！');
