# 启动服务器指南

为了让融合功能真正使用 DeepSeek API，你需要启动后端服务器。

## 🚀 快速启动（推荐 - 简化代理）

这是最简单的方式，**不需要数据库和认证**，直接调用 DeepSeek API：

### 1. 进入 server 目录
```bash
cd server
```

### 2. 安装依赖（如果还没安装）
```bash
npm install
```

### 3. 设置环境变量并启动

**Windows PowerShell:**
```powershell
$env:DEEPSEEK_API_KEY="sk-f72c5edd189144738e55632128dc02af"; node index.js
```

**Windows CMD:**
```cmd
set DEEPSEEK_API_KEY=sk-f72c5edd189144738e55632128dc02af && node index.js
```

**Linux/Mac:**
```bash
DEEPSEEK_API_KEY=sk-f72c5edd189144738e55632128dc02af node index.js
```

### 4. 或者创建 .env 文件

在 `server` 目录创建 `.env` 文件：
```
DEEPSEEK_API_KEY=sk-f72c5edd189144738e55632128dc02af
PORT=7070
DEEPSEEK_BASE=https://api.deepseek.com
```

然后启动：
```bash
node index.js
```

服务器将在 **http://localhost:7070** 启动。

---

## 🔧 完整后端服务器（需要 MongoDB）

如果需要完整功能（用户认证、项目保存等），需要启动完整后端：

### 1. 配置 MongoDB

创建 MongoDB Atlas 账号并获取连接字符串，或者使用本地 MongoDB。

### 2. 创建 server/.env 文件

```env
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/innofusion
# 或使用 MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/innofusion
JWT_SECRET=your-secret-key
DEEPSEEK_API_KEY=sk-f72c5edd189144738e55632128dc02af
CORS_ORIGIN=http://localhost:3000
```

### 3. 启动服务器

```bash
cd server
npm install
npm run dev
```

服务器将在 **http://localhost:3001** 启动。

---

## ✅ 验证服务器运行

打开浏览器访问：
- 简化代理：http://localhost:7070/api/health（如果实现了）
- 完整后端：http://localhost:3001/

你应该看到服务器响应。

---

## 🎯 前端配置

前端已经配置为：
1. **优先使用** `window.__BFL_API__`（在 `index.html` 中设置为 `http://localhost:7070`）
2. **备用方案**：使用 `VITE_API_URL` 环境变量
3. **最后备用**：使用完整后端 API（需要认证）

---

## 📝 注意事项

⚠️ **重要**：
- 简化代理服务器（`server/index.js`）不需要数据库，最适合快速开始
- 完整后端（`server/src/app.js`）需要 MongoDB 数据库
- DeepSeek API Key 必须正确配置，否则融合功能会回退到本地规则

---

## 🔍 故障排除

### 融合时没有调用 DeepSeek API？

1. **检查后端服务器是否运行**
   ```bash
   # 检查端口 7070 或 3001 是否有进程
   netstat -ano | findstr :7070
   ```

2. **检查浏览器控制台**
   - 打开开发者工具（F12）
   - 查看 Network 标签
   - 检查是否有 `/api/fuse/suggest` 或 `/api/ai/suggest` 请求
   - 查看是否有错误信息

3. **检查环境变量**
   - 确保 `DEEPSEEK_API_KEY` 已设置
   - 确保 API Key 有效

4. **查看服务器日志**
   - 简化代理会在控制台输出请求日志
   - 查看是否有错误信息

### API 调用失败？

- 检查 DeepSeek API Key 是否有效
- 检查网络连接
- 查看服务器日志中的错误信息
- 前端会自动回退到本地规则生成建议
