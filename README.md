# 🎮 Uno Online

在线Uno游戏，支持2-8人同时游戏，支持真人+AI混合对战。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ 特性

- ✅ **2-8人同时在线游戏**
- ✅ **真人玩家 + AI机器人混合对战**
- ✅ **三种AI难度**（简单/普通/困难）
- ✅ **多牌同出规则**
- ✅ **抢打出牌规则**
- ✅ **智能手牌提示**（可出牌高亮）
- ✅ **分类排序功能**（颜色/数字/智能）
- ✅ **响应式设计**（PC+移动端）

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+

### 安装运行

```bash
# 安装依赖
cd client && npm install
cd ../server && npm install

# 启动后端（终端1）
cd server && npm run dev

# 启动前端（终端2）
cd client && npm run dev

# 打开浏览器
open http://localhost:3000
```

## 🎮 游戏截图

### 首页
<img src="docs/screenshots/home.png" alt="首页" width="600">

### 房间
<img src="docs/screenshots/room.png" alt="房间" width="600">

### 游戏
<img src="docs/screenshots/game.png" alt="游戏" width="600">

## 📋 游戏规则

1. 每位玩家初始7张牌
2. 轮流出牌，必须颜色或数字匹配
3. 万能牌可随时出，+4需要满足条件
4. 剩1张牌时必须喊UNO
5. 先出完牌者获胜

详细规则请查看 [docs/GAME_RULES.md](docs/GAME_RULES.md)

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Vite + TailwindCSS
- Framer Motion
- Socket.IO Client

### 后端
- Node.js + Express
- Socket.IO
- TypeScript

## 📁 项目结构

```
Kimi_Uno/
├── client/          # 前端项目
├── server/          # 后端项目
├── shared/          # 共享类型
├── docs/            # 文档
└── README.md        # 本文件
```

## 📚 文档

- [API文档](docs/API.md) - 后端接口文档
- [游戏规则](docs/GAME_RULES.md) - 详细游戏规则
- [UI设计](docs/UI_DESIGN.md) - 界面设计规范
- [交付文档](DELIVERY.md) - 项目交付说明

## 🧪 测试

```bash
# 运行后端测试
cd server && node test-api-live.js

# 运行前端构建测试
cd client && npm run build
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**Enjoy playing Uno Online! 🎴**
