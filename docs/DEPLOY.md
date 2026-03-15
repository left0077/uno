# UNO Online 部署指南

## 📋 目录
- [前端部署到 GitHub Pages](#前端部署到-github-pages)
- [后端部署到 ECS](#后端部署到-ecs)
- [域名配置](#域名配置可选)

---

## 前端部署到 GitHub Pages

### 方式一：GitHub Actions 自动部署（推荐）

#### 1. 配置 Vite 基础路径

编辑 `client/vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Kimi_Uno/',  // 添加这一行，替换为你的仓库名
  server: {
    port: 3000,
    host: true
  }
});
```

#### 2. 创建 GitHub Actions 工作流

创建文件 `.github/workflows/deploy-frontend.yml`：

```yaml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: |
          cd client
          npm ci
          npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './client/dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 3. 启用 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 推送代码后自动部署

#### 4. 配置前端默认服务器地址

编辑 `client/src/hooks/useGameStore.ts`，修改默认地址为你的 ECS 地址：

```typescript
const DEFAULT_SERVER_URL = 'http://your-ecs-ip:3001';
// 或者使用 HTTPS
// const DEFAULT_SERVER_URL = 'https://uno-api.yourdomain.com';
```

---

### 方式二：手动部署

```bash
# 1. 构建前端
cd client
npm run build

# 2. 部署到 gh-pages 分支
npx gh-pages -d dist

# 3. 或者直接复制到 docs 目录（如果启用 docs 分支）
cp -r dist/* ../docs/
```

---

## 后端部署到 ECS

### 方案一：Docker 部署（推荐）

#### 1. 创建 Dockerfile

```dockerfile
# server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY dist ./dist
COPY src/shared ./src/shared

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动服务
CMD ["node", "dist/index.js"]
```

#### 2. 创建 .dockerignore

```
node_modules
npm-debug.log
.env
.env.local
coverage
.vscode
.idea
```

#### 3. 构建并推送镜像

```bash
# 登录阿里云镜像仓库（或其他仓库）
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 构建镜像
cd server
docker build -t registry.cn-hangzhou.aliyuncs.com/your_namespace/uno-server:latest .

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/your_namespace/uno-server:latest
```

#### 4. ECS 部署脚本

创建 `server/deploy.sh`：

```bash
#!/bin/bash

# 配置
IMAGE="registry.cn-hangzhou.aliyuncs.com/your_namespace/uno-server:latest"
CONTAINER_NAME="uno-server"
PORT="3001"

# 停止并删除旧容器
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

# 拉取最新镜像
docker pull $IMAGE

# 启动新容器
docker run -d \
  --name $CONTAINER_NAME \
  --restart always \
  -p $PORT:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -v /var/log/uno:/app/logs \
  $IMAGE

# 清理旧镜像
docker image prune -f

echo "部署完成！"
docker ps | grep $CONTAINER_NAME
```

---

### 方案二：PM2 直接部署

#### 1. 构建后端

```bash
cd server
npm ci
npm run build
```

#### 2. 创建 ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'uno-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
```

#### 3. 部署脚本

```bash
#!/bin/bash

# 上传到服务器
rsync -avz --exclude=node_modules --exclude=.env ./ server:/opt/uno-server/

# SSH 到服务器执行
ssh server "
  cd /opt/uno-server
  npm ci --production
  npm run build
  pm2 reload ecosystem.config.js --env production
  pm2 save
"
```

---

## 安全组/防火墙配置

### ECS 安全组规则

| 类型 | 端口 | 来源 | 说明 |
|------|------|------|------|
| 自定义TCP | 3001 | 0.0.0.0/0 | Socket.IO 服务 |
| 自定义TCP | 3001 | ::/0 | Socket.IO 服务(IPv6) |

### 使用 Nginx 反向代理（生产推荐）

```nginx
# /etc/nginx/conf.d/uno.conf
upstream uno_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name uno-api.yourdomain.com;
    
    # 升级到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name uno-api.yourdomain.com;

    # SSL 证书
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Socket.IO 支持
    location / {
        proxy_pass http://uno_backend;
        proxy_http_version 1.1;
        
        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 转发真实 IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 域名配置（可选）

### 前端自定义域名

1. 在你的域名 DNS 添加 CNAME 记录：
   ```
   uno.yourdomain.com → yourusername.github.io
   ```

2. 在仓库 Settings → Pages → Custom domain 添加域名

3. 等待 DNS 生效（通常几分钟到几小时）

### 后端域名

1. 添加 A 记录指向 ECS IP：
   ```
   uno-api.yourdomain.com → A → 你的ECS公网IP
   ```

2. 配置 SSL 证书（使用 Let's Encrypt）：
   ```bash
   sudo certbot --nginx -d uno-api.yourdomain.com
   ```

---

## 完整部署流程示例

```bash
# 1. 推送代码到 GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main

# 2. 前端自动部署（通过 GitHub Actions）
# 访问 https://yourusername.github.io/Kimi_Uno/

# 3. 部署后端到 ECS
./server/deploy.sh

# 4. 验证部署
curl http://your-ecs-ip:3001/health
```

---

## 常见问题

### Q: 前端连接后端失败？
A: 检查：
1. ECS 安全组是否放行 3001 端口
2. 前端配置的 serverUrl 是否正确
3. 浏览器控制台是否有 CORS 错误

### Q: WebSocket 连接失败？
A: 确保：
1. Nginx 配置了 WebSocket 支持
2. 安全组允许 WebSocket 端口
3. 前端使用 `transports: ['websocket', 'polling']`

### Q: 如何更新部署？
A: 
- 前端：推送代码到 main 分支自动部署
- 后端：重新运行 `deploy.sh` 脚本

---

## 成本估算

| 服务 | 配置 | 月费用（参考） |
|------|------|---------------|
| GitHub Pages | 免费版 | ¥0 |
| ECS（按量） | 1核2G | ¥50-100 |
| 域名 | .com | ¥50-100/年 |
| 总计 | - | ¥100-200/月 |

---

## 参考链接

- [GitHub Pages 文档](https://docs.github.com/pages)
- [阿里云 ECS 文档](https://help.aliyun.com/ecs)
- [Socket.IO 部署指南](https://socket.io/docs/v4/reverse-proxy/)
