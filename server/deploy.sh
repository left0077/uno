#!/bin/bash

# UNO Server 部署脚本
# 用法: ./deploy.sh [镜像标签]

set -e

# 配置
IMAGE_TAG=${1:-latest}
IMAGE_NAME="uno-server"
CONTAINER_NAME="uno-server"
REGISTRY="${REGISTRY:-}"  # 可选：阿里云镜像仓库地址
PORT="3001"

echo "🚀 开始部署 UNO Server..."
echo "   镜像标签: $IMAGE_TAG"

# 构建镜像
echo "📦 构建 Docker 镜像..."
docker build -t $IMAGE_NAME:$IMAGE_TAG .

# 如果有镜像仓库，推送镜像
if [ -n "$REGISTRY" ]; then
  echo "📤 推送到镜像仓库..."
  docker tag $IMAGE_NAME:$IMAGE_TAG $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
  docker push $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
fi

# 停止并删除旧容器（如果存在）
echo "🛑 停止旧容器..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 启动新容器
echo "▶️  启动新容器..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p $PORT:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  --memory="512m" \
  --cpus="1" \
  -v /var/log/uno:/app/logs \
  $IMAGE_NAME:$IMAGE_TAG

# 等待服务启动
sleep 3

# 健康检查
echo "🏥 健康检查..."
if curl -s http://localhost:$PORT/health > /dev/null; then
  echo "✅ 服务运行正常！"
  docker ps | grep $CONTAINER_NAME
else
  echo "❌ 服务启动失败，查看日志:"
  docker logs $CONTAINER_NAME --tail 20
  exit 1
fi

# 清理旧镜像
echo "🧹 清理旧镜像..."
docker image prune -f

echo ""
echo "🎉 部署完成！"
echo "   访问: http://$(curl -s ifconfig.me):$PORT/health"
