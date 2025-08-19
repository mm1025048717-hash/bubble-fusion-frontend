# Bubble Fusion Lab · 创意气泡融合器 (Frontend MVP)
把“碎片灵感”拖一拖，融合成“可复用创意资产”。拖拽两枚气泡靠近并松手 → 💥 融合 → 生成新创意标题 + 四象限建议（卖点/反共识/最小验证/话术） → 保存/导出/复用。

## ✨ 功能特性
- 画布与气泡
  - 创建/编辑/拖拽；仅在“拖拽松手”时触发融合（避免误触）
  - 框选多选融合；结果类型关键字自动上色（pdf/image/video/doc/audio）
- AI 建议（DeepSeek V3）
  - 服务端优先（推荐）/前端直连兜底；严格 JSON 解析、失败回退本地规则  
  - 模型与价格参考官方文档：[模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) · [API 基本信息](https://api-docs.deepseek.com/zh-cn/api/deepseek-api)
- 交互与动效
  - 融合过程的连接线 + 涟漪动画；占位气泡 + 异步更新标题，交互更丝滑
  - 底部极简对话框（图标化）：Agent/Model/提示词/发送；顶部展示已选气泡标签
- 附件与摘要
  - 气泡详情（左侧不遮挡）：任意文件上传/下载/删除、自动摘要预览
- 历史与导出
  - 融合日志时间线；JSON 导出（包含 bubbles 与 fusionEvents）

## 🧱 技术栈
- 前端：React 18 · Vite · Tailwind CSS · Framer Motion
- 后端：Node 20 · Express（已在 `server/` 提供参考实现）
- 部署编排：`render.yaml`（前后端一键 Blueprint）

## 🚀 本地运行
```bash
# 前端
npm i
npm run dev   # http://localhost:3000

# 后端（推荐联调）
cd server
npm i
npm run dev   # http://localhost:7070
```

前端指向后端（临时）：
```js
// 浏览器控制台执行
window.__BFL_API__ = 'http://localhost:7070'
```

> 生产环境：请删除/禁用前端的 `window.__DEEPSEEK_KEY__`，只在后端配置 `DEEPSEEK_API_KEY`。

## 🔌 环境变量（后端）
- `DEEPSEEK_API_KEY`（必填）：DeepSeek 密钥
- `DEEPSEEK_BASE_URL`（可选，默认 `https://api.deepseek.com`）
- `PORT`（默认 `7070`）

## 🔗 API（后端）
- `GET /api/health` → `{ ok: true }`
- `POST /api/fuse/suggest`  
  Req: `{ a:string, b:string, context?:{ prompt?:string, model?:string, temperature?:number } }`  
  Res: `{ title:string, notes:string }`
- `POST /api/score` → `{ radar:{ novelty,brandFit,feasibility,cost,risk } }`（占位规则）

## 🧭 使用指南（前端）
- 添加气泡：顶部工具栏「+」
- 融合：拖拽 A 到 B 附近并“松手”触发；或框选多枚后点击底部发送
- 调模型/提示词：底部对话框左侧图标（Agent/Model/魔杖），中部输入提示词，右侧发送
- 附件：点击气泡打开左侧“附件/摘要”面板
- 导出：顶部工具栏「下载」导出 JSON

## 🧪 质量与体验
- 仅“松手”触发融合，靠近不自动融合（防误触）
- 融合锁避免重复创建；失败回退本地规则不令 UI 卡死
- 移动端目标：≥45fps；首个融合 <3s（含模型返回）

## ☁️ 一键部署（Render）
1) 推送本仓库到 GitHub（根目录已有 `render.yaml`）  
2) Render → Blueprints → New Blueprint Instance  
3) 设置后端环境变量：`DEEPSEEK_API_KEY=你的密钥`  
4) 部署完成后拿到：
   - 后端地址（Web Service）：`https://xxx.onrender.com`
   - 前端地址（Static Site）：`https://yyy.onrender.com`  
5) 在前端固定后端地址（`index.html` 加入）：
```html
<script>window.__BFL_API__='https://xxx.onrender.com'</script>
```

## 📦 目录结构（摘）
├─ src/ # 前端源码
│ ├─ components/ # 画布/气泡/面板/对话框等
│ ├─ utils/ # physics/colors/suggestions/summary
│ └─ styles/ # Tailwind 样式
├─ server/ # 参考后端（Express + DeepSeek 代理）
│ ├─ src/app.js
│ ├─ package.json
│ └─ Dockerfile
├─ render.yaml # Render 一键编排（前端+后端）
└─ README.md




