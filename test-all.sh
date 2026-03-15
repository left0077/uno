#!/bin/bash
# Uno 项目完整测试脚本
# 每次修改后必须运行此脚本确保所有测试通过

set -e  # 遇到错误立即退出

echo "🧪 Uno 项目完整测试"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# 1. 后端构建测试
echo "📦 1. 后端构建测试..."
cd server
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端构建通过${NC}"
else
    echo -e "${RED}❌ 后端构建失败${NC}"
    FAILED=1
fi
cd ..

# 2. CardManager 测试
echo ""
echo "🃏 2. CardManager 测试..."
cd server
if node test-card.mjs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CardManager 测试通过${NC}"
else
    echo -e "${RED}❌ CardManager 测试失败${NC}"
    FAILED=1
fi
cd ..

# 3. RoomManager 测试
echo ""
echo "🏠 3. RoomManager 测试..."
cd server
if node test-room.mjs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RoomManager 测试通过${NC}"
else
    echo -e "${RED}❌ RoomManager 测试失败${NC}"
    FAILED=1
fi
cd ..

# 4. UnoGame 测试
echo ""
echo "🎮 4. UnoGame 测试..."
cd server
if node test-game.mjs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ UnoGame 测试通过${NC}"
else
    echo -e "${RED}❌ UnoGame 测试失败${NC}"
    FAILED=1
fi
cd ..

# 5. 前端构建测试
echo ""
echo "💻 5. 前端构建测试..."
cd client
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端构建通过${NC}"
else
    echo -e "${RED}❌ 前端构建失败${NC}"
    FAILED=1
fi
cd ..

# 总结
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ 所有测试通过！可以安全提交${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有测试失败，请修复后再提交${NC}"
    exit 1
fi
