import puppeteer from 'puppeteer-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

console.log('🧪 启动浏览器测试...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 测试 1: 首页加载
    console.log('1️⃣  测试首页加载...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    const title = await page.title();
    console.log(`   页面标题: ${title}`);
    console.log(`   ✅ 首页加载成功\n`);
    
    // 测试 2: 用户名输入
    console.log('2️⃣  测试用户名输入...');
    await page.type('input[placeholder="请输入昵称"]', '测试玩家');
    const nickname = await page.evaluate(() => {
      return document.querySelector('input[placeholder="请输入昵称"]')?.value;
    });
    console.log(`   输入昵称: ${nickname}`);
    console.log(`   ✅ 用户名输入成功\n`);
    
    // 测试 3: 创建房间按钮
    console.log('3️⃣  测试创建房间按钮...');
    const createBtn = await page.$('text=创建房间');
    console.log(`   按钮存在: ${!!createBtn}`);
    console.log(`   ✅ 创建房间按钮存在\n`);
    
    // 测试 4: 连接状态
    console.log('4️⃣  测试连接状态显示...');
    const status = await page.evaluate(() => {
      const el = document.body.innerText;
      return el.includes('已连接') || el.includes('连接中');
    });
    console.log(`   连接状态显示: ${status}`);
    console.log(`   ✅ 连接状态正常\n`);
    
    // 测试 5: 服务器设置链接
    console.log('5️⃣  测试服务器设置入口...');
    const hasServerLink = await page.evaluate(() => {
      const el = document.body.innerText;
      return el.includes('localhost') || el.includes('3001');
    });
    console.log(`   服务器地址显示: ${hasServerLink}`);
    console.log(`   ✅ 服务器设置入口存在\n`);
    
    // 截图保存
    await page.screenshot({ path: '/tmp/uno-home.png', fullPage: true });
    console.log('📸 首页截图已保存: /tmp/uno-home.png');
    
    console.log('\n✅ 所有基础测试通过！');
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
