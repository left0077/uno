# 使用 Node.js 20 轻量版
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache wget

# 复制 package 文件
COPY package*.json ./

# 安装依赖（仅生产环境）
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物和共享类型
COPY dist ./dist
COPY src/shared ./src/shared

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动服务
CMD ["node", "dist/index.js"]
