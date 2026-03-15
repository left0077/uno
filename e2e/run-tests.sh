#!/bin/bash
# Uno Online E2E 测试运行脚本

echo "🎮 Uno Online E2E 测试"
echo "======================"
echo ""

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 安装 Playwright 浏览器（如果需要）
if ! npx playwright install chromium 2>/dev/null; then
  echo "🌐 安装 Playwright 浏览器..."
  npx playwright install chromium
fi

echo ""
echo "选择测试类型:"
echo "1) 运行所有测试 (headless)"
echo "2) 运行所有测试 (headed - 可见浏览器)"
echo "3) 运行基础功能测试"
echo "4) 运行断线重连测试"
echo "5) 运行游戏流程测试"
echo "6) 运行特色功能测试"
echo "7) 运行 UI 模式 (调试)"
echo "8) 生成测试报告"
echo ""

# 如果没有参数，提示选择
if [ -z "$1" ]; then
  read -p "请输入选项 (1-8): " choice
else
  choice=$1
fi

case $choice in
  1)
    echo "🧪 运行所有测试..."
    npx playwright test
    ;;
  2)
    echo "🧪 运行所有测试 (headed)..."
    npx playwright test --headed
    ;;
  3)
    echo "🧪 运行基础功能测试..."
    npx playwright test basic.spec.ts
    ;;
  4)
    echo "🧪 运行断线重连测试..."
    npx playwright test reconnect.spec.ts
    ;;
  5)
    echo "🧪 运行游戏流程测试..."
    npx playwright test gameplay.spec.ts
    ;;
  6)
    echo "🧪 运行特色功能测试..."
    npx playwright test features.spec.ts
    ;;
  7)
    echo "🧪 启动 UI 模式..."
    npx playwright test --ui
    ;;
  8)
    echo "📊 生成测试报告..."
    npx playwright show-report
    ;;
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "✅ 测试完成!"
echo ""
echo "查看报告:"
echo "  HTML 报告: npx playwright show-report"
echo "  截图: ls test-results/"
