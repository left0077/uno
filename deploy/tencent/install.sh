#!/bin/bash

# 腾讯云轻量服务器一键部署脚本
# 使用方法：
# 1. 登录服务器
# 2. wget https://raw.githubusercontent.com/left0077/uno/main/deploy/tencent/install.sh
# 3. chmod +x install.sh
# 4. ./install.sh

set -e

echo "🚀 开始部署 UNO 游戏后端..."

# 更新系统
echo "📦 更新软件包..."
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
echo "📦 安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ NPM 版本: $(npm -v)"

# 安装 PM2
echo "📦 安装 PM2..."
sudo npm install -g pm2

# 克隆代码
echo "📦 克隆代码..."
cd ~
if [ -d "uno" ]; then
    echo "检测到已有代码，执行更新..."
    cd uno
    git pull
else
    git clone https://github.com/left0077/uno.git
    cd uno
fi

# 安装依赖
echo "📦 安装依赖..."
npm run install:all

# 构建
echo "🔨 构建项目..."
npm run build

# 启动服务
echo "🚀 启动服务..."
cd server
pm2 delete uno-server 2>/dev/null || true
pm2 start dist/index.js --name uno-server

# 设置开机自启
echo "⚙️ 配置开机自启..."
pm2 startup
pm2 save

# 显示状态
echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 服务状态："
pm2 status

# 获取IP
IP=$(curl -s http://metadata.tencentyun.com/latest/meta-data/public-ipv4 || echo "你的服务器IP")
echo ""
echo "🔗 后端地址：http://$IP:3001"
echo ""
echo "📖 查看日志：pm2 logs uno-server"
echo "🔄 重启服务：pm2 restart uno-server"
