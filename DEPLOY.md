# 部署指南

## 方式一：Vercel 部署（推荐）

### 步骤 1：准备代码

1. 将代码推送到 GitHub 仓库
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 步骤 2：Vercel 配置

1. 访问 [vercel.com](https://vercel.com) 并登录（可用 GitHub 账号）
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库
4. 配置如下：
   - **Framework Preset**: Vite
   - **Build Command**: `yarn build`
   - **Output Directory**: `dist`
   - **Install Command**: `yarn install`

5. 点击 "Deploy"

### 步骤 3：自动部署

- 每次推送到 `main` 分支会自动触发部署
- Vercel 会提供永久公网链接（如 `https://你的项目名.vercel.app`）

---

## 方式二：ngrok 临时访问

适合临时分享，不需要部署。

### 步骤：

1. 确保开发服务器在运行：
```bash
yarn dev
```

2. 在另一个终端运行：
```bash
yarn tunnel
# 或
npx ngrok http 5173
```

3. 会生成一个公网 URL（如 `https://xxxx.ngrok-free.app`）
4. 将此 URL 分享给他人即可访问

**注意**：免费版 ngrok 每次重启会更换 URL。

---

## 方式三：局域网访问

适合同一 WiFi 下的设备访问。

### 步骤：

1. 开发服务器已配置为允许外部访问
2. 查看你的局域网 IP：
```bash
ifconfig | grep "inet "
```

3. 手机/其他设备访问：
```
http://你的局域网IP:5173
```

例如：`http://192.168.3.147:5173`

---

## 常见问题

### Q: Vercel 部署后页面空白？
A: 检查 `vercel.json` 配置是否正确，确保路由指向 `index.html`。

### Q: 如何绑定自定义域名？
A: 在 Vercel 项目设置中添加域名，按提示配置 DNS。

### Q: 部署后数据会保存吗？
A: 不会，这是纯前端应用，所有数据存储在浏览器本地。
