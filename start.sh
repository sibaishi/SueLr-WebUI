#!/bin/bash

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ┃      🐱 AI 助手调用工具              ┃"
echo "  ┃      一键启动脚本                 ┃"
echo "  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo ""

# Get script directory
cd "$(dirname "$0")"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ 没有找到 Node.js，请安装："
    echo "     https://nodejs.org/"
    echo "     建议：brew install node"
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
echo "  ✅ Node.js $NODE_VER"

# Check if this is first run
if [ ! -d "node_modules" ]; then
    echo ""
    echo "  📦 首次安装依赖项..."
    npm install --production=false
    if [ $? -ne 0 ]; then
        echo "  ❌ 安装依赖失败，请检查网络连接"
        exit 1
    fi
    echo "  ✅ 安装依赖完成"
fi

# Check if build exists
NEED_BUILD=false
if [ ! -d "dist" ]; then
    NEED_BUILD=true
else
    # Check if any source file is newer than dist
    NEWER_SRC=$(find src -newer dist -type f 2>/dev/null | head -1)
    if [ -n "$NEWER_SRC" ]; then
        NEED_BUILD=true
    fi
fi

if [ "$NEED_BUILD" = true ]; then
    echo ""
    echo "  🏗️ 开始构建项目..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "  ❌ 构建失败"
        exit 1
    fi
    echo "  ✅ 构建完成"
fi

echo ""
echo "  🚀 启动服务器..."
echo "  ──────────────────────────────────────────"
echo ""

node server.js
