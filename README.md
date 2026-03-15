# 🎮 Uno Online

在线Uno游戏，支持2-8人同时游戏，支持真人+AI混合对战。

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

🔗 **在线试玩**: https://left0077.github.io/uno/

---

## ✨ 特性

### 核心功能
- ✅ **2-8人同时在线游戏**
- ✅ **真人玩家 + AI机器人混合对战**
- ✅ **三种AI难度**（简单/普通/困难）
- ✅ **断线重连** - 刷新页面自动恢复游戏
- ✅ **邀请链接** - 一键分享房间链接

### 游戏规则
- ✅ **多牌同出规则** - 相同数字/颜色可一起出
- ✅ **抢打出牌规则** - 相同牌可随时插队
- ✅ **连打规则** - +2/+4可叠加
- ✅ **排名模式** - 多轮积分赛
- ✅ **房间设置** - 房主可开关规则

### 用户体验
- ✅ **智能手牌提示**（可出牌高亮）
- ✅ **分类排序功能**（颜色/数字/智能）
- ✅ **Emoji快捷聊天**
- ✅ **响应式设计**（PC+移动端）
- ✅ **实时连接状态**显示

---

## 🚀 快速开始

### 在线试玩
直接访问：https://left0077.github.io/uno/

> 💡 **提示**: 后端使用 Render 免费版，首次访问可能需要等待 30 秒冷启动

### 本地运行

#### 环境要求
- Node.js 18+
- npm 9+

#### 安装运行

```bash
# 克隆项目
git clone <repo-url>
cd Kimi_Uno

# 安装依赖
cd client && npm install
cd ../server && npm install

# 启动后端（终端1）
cd server && npm run dev

# 启动前端（终端2）
cd client && npm run dev

# 打开浏览器
open http://localhost:5173
```

---

## 🎮 游戏截图

### 首页
<img src="docs/screenshots/home.png" alt="首页" width="600">

### 房间
<img src="docs/screenshots/room.png" alt="房间" width="600">

### 游戏
<img src="docs/screenshots/game.png" alt="游戏" width="600">

---

## 📋 游戏规则

### 基础规则
1. 每位玩家初始7张牌
2. 轮流出牌，必须颜色或数字匹配
3. 万能牌可随时出，+4需要满足条件
4. 剩1张牌时必须喊UNO
5. 先出完牌者获胜

### 扩展规则（可在房间设置中开关）

| 规则 | 说明 |
|------|------|
| **多牌同出** | 相同数字或颜色的牌可以一起出 |
| **抢打出牌** | 手中有与弃牌堆完全相同的牌时可以插队出 |
| **连打规则** | +2可以叠加+2，+4可以叠加+4，无法叠加者摸所有累计牌 |
| **排名模式** | 游戏继续直到所有玩家排名，按积分排序 |

详细规则请查看 [docs/GAME_RULES.md](docs/GAME_RULES.md)

---

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Vite + TailwindCSS
- Framer Motion（动画）
- Socket.IO Client

### 后端
- Node.js + Express
- Socket.IO
- TypeScript

### 部署
- 前端: GitHub Pages
- 后端: Render

---

## 📁 项目结构

```
Kimi_Uno/
├── client/          # 前端项目 (React + Vite)
├── server/          # 后端项目 (Express + Socket.IO)
├── shared/          # 共享类型定义
├── docs/            # 文档
├── e2e/             # 端到端测试
└── README.md        # 本文件
```

---

## 📚 文档

- [API文档](docs/API.md) - 后端接口文档
- [游戏规则](docs/GAME_RULES.md) - 详细游戏规则
- [UI设计](docs/UI_DESIGN.md) - 界面设计规范
- [测试计划](docs/TEST_PLAN.md) - 测试用例和结果
- [交付文档](DELIVERY.md) - 项目交付说明

---

## 🧪 测试

```bash
# 运行后端单元测试
cd server && npm test

# 运行前端构建测试
cd client && npm run build

# 运行E2E测试
cd e2e && npm test
```

---

## 🐛 已知问题

| 问题 | 说明 | 解决方案 |
|------|------|---------|
| Render冷启动 | 免费版15分钟无访问会休眠，首次连接需等待30秒 | 等待或考虑升级到付费版 |

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

## 📄 许可证

MIT License

---

**Enjoy playing Uno Online! 🎴**
