# 腾讯云轻量应用服务器部署指南

## 方案优势
- ✅ 24小时运行，不休眠
- ✅ 国内访问速度快
- ✅ 支持WebSocket长连接
- ✅ 价格便宜（新用户约60元/年）
- ✅ 有独立公网IP

---

## 一、购买服务器

### 1. 访问腾讯云
打开：https://cloud.tencent.com/product/lighthouse

### 2. 选择配置
推荐配置：
- **地域**: 靠近你的用户（如上海、北京、广州）
- **镜像**: Ubuntu 22.04 LTS
- **套餐**: 2核2G4M（约60元/年，新用户价）
- **时长**: 1年

### 3. 购买并等待创建（约1-2分钟）

---

## 二、连接服务器

### 方式1：腾讯云控制台登录（推荐新手）
1. 进入轻量应用服务器控制台
2. 找到你的服务器，点击**登录**
3. 在浏览器中打开终端

### 方式2：本地 SSH 登录
```bash
ssh ubuntu@你的服务器IP
```
密码在腾讯云控制台查看

---

## 三、部署后端

### 1. 安装 Node.js

```bash
# 更新软件包
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v20.x.x
npm -v   # 应显示 10.x.x
```

### 2. 安装 PM2（进程管理）

```bash
sudo npm install -g pm2
```

### 3. 克隆代码并部署

```bash
# 进入用户目录
cd ~

# 克隆代码
git clone https://github.com/left0077/uno.git
cd uno

# 安装依赖
npm run install:all

# 构建
npm run build

# 启动服务（使用 PM2）
cd server
pm2 start dist/index.js --name uno-server

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 配置防火墙

在腾讯云控制台：
1. 进入服务器详情页
2. 点击**防火墙**标签
3. 点击**添加规则**
4. 添加以下规则：
   - 协议: TCP
   - 端口: 3001
   - 策略: 允许

---

## 四、配置域名（可选）

### 方式1：使用 IP 直接访问
前端直接连接：`http://你的服务器IP:3001`

### 方式2：绑定域名（推荐）

1. **购买域名**（腾讯云/阿里云/GoDaddy等）
2. **添加 DNS 解析**：
   - 类型: A记录
   - 主机记录: uno（或www）
   - 记录值: 你的服务器IP

3. **配置 Nginx 反向代理**：

```bash
# 安装 Nginx
sudo apt install nginx -y

# 创建配置文件
sudo nano /etc/nginx/sites-available/uno
```

粘贴以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/uno /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 五、配置 HTTPS（可选）

使用 Certbot 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

---

## 六、前端配置

1. 打开前端页面：https://left0077.github.io/uno/
2. 点击右上角 **⚙️ 设置**
3. 填入你的后端地址：
   - 如果使用IP：`http://你的服务器IP:3001`
   - 如果使用域名：`https://your-domain.com`
4. 保存并刷新

---

## 七、常用维护命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs uno-server

# 重启服务
pm2 restart uno-server

# 更新代码
cd ~/uno
git pull
npm run build
cd server
pm2 restart uno-server

# 查看服务器资源使用
htop
```

---

## 八、故障排查

### 问题1：端口连接不上
- 检查防火墙规则是否放行 3001 端口
- 检查服务是否运行：`pm2 status`

### 问题2：WebSocket 连接失败
- 如果使用 Nginx，确保配置了 WebSocket 支持
- 检查服务器安全组是否放行端口

### 问题3：服务自动停止
- 检查是否配置了 PM2 开机自启：`pm2 startup`
- 检查日志：`pm2 logs`

---

## 费用参考

| 项目 | 费用 |
|------|------|
| 轻量应用服务器（2核2G4M） | ~60元/年（新用户） |
| 域名（.com） | ~60元/年 |
| 总计 | ~120元/年 |

相比 Render 免费版的休眠问题，腾讯云轻量服务器可以24小时运行，体验更好！
