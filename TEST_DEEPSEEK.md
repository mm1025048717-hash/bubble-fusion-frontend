# DeepSeek API 测试指南

## ✅ 已完成的优化

### 1. **优化了提示词系统**
   - 改进了 `server/index.js` 中的 `buildMessages` 函数
   - 提示词更详细、更智能，能更好地指导 DeepSeek 生成高质量内容
   - 支持不同的 agent 模式（fusion、pitch）和语言（中文、英文）
   - 支持详细模式（detail=true）和简化模式

### 2. **改进了前端 API 调用**
   - 优先使用简化代理端点 `/api/fuse/suggest`
   - 自动回退机制，确保稳定性
   - 正确的参数传递（model、provider、agent、language 等）

### 3. **配置了服务器**
   - DeepSeek API Key 已配置
   - 服务器运行在端口 7070

## 🔍 如何验证 DeepSeek 是否发挥作用

### 方法 1：浏览器控制台检查

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 进行气泡融合操作
4. 查找 `/api/fuse/suggest` 请求
5. 点击请求，查看 **Response**：
   - 如果 `provider` 字段是 `"deepseek-proxy"`，说明调用了 DeepSeek API ✅
   - 如果 `provider` 字段是 `"local"`，说明回退到了本地规则 ❌

### 方法 2：检查返回内容质量

DeepSeek 生成的内容应该：
- ✅ 标题具体、有创意，不是简单的 "A × B" 拼接
- ✅ notes 中的建议详细、具体，而不是模板化的文字
- ✅ structured 数据包含丰富的字段（如果 detail=true）
- ✅ 内容针对输入的概念有深度分析

如果返回的内容是：
- ❌ 标题只是简单的 "A × B"
- ❌ notes 是模板化的占位符文字
- ❌ 内容没有针对输入概念的具体分析

### 方法 3：使用 PowerShell 测试 API

```powershell
$body = @{
    a = "环保包装"
    b = "年轻用户"
    context = @{
        model = "deepseek-chat"
        provider = "deepseek"
        language = "zh"
        detail = $false
        agent = "fusion"
    }
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri 'http://localhost:7070/api/fuse/suggest' -Method Post -Body $body -ContentType 'application/json'
$response | ConvertTo-Json -Depth 10
```

查看返回的 `provider` 字段应该是 `"deepseek-proxy"`。

## 🛠️ 故障排除

### 问题 1：返回 `provider: "local"`

**可能原因：**
- 后端服务器未运行
- API 调用失败
- 网络问题

**解决方案：**
1. 检查服务器是否运行：`netstat -ano | findstr :7070`
2. 检查浏览器控制台的错误信息
3. 确保 `window.__BFL_API__` 设置为 `http://localhost:7070`

### 问题 2：返回内容质量差

**可能原因：**
- DeepSeek API Key 无效
- 提示词不够好（已优化）
- API 调用成功但内容质量一般

**解决方案：**
1. 验证 API Key 是否有效
2. 尝试使用 `detail: true` 获取更详细的内容
3. 在 prompt 中添加更具体的要求

### 问题 3：API 调用失败

**检查清单：**
- [ ] 后端服务器正在运行（端口 7070）
- [ ] DeepSeek API Key 已设置
- [ ] 网络连接正常
- [ ] 浏览器控制台没有 CORS 错误

## 📝 最佳实践

### 1. 使用合适的 agent 模式

- **fusion**：适合基础融合，生成简洁的建议
- **pitch**：适合生成详细的营销方案

### 2. 使用 detail 参数

- `detail: false`：快速生成，返回基础建议
- `detail: true`：详细生成，返回完整的结构化方案

### 3. 添加自定义 prompt

在融合时，可以在输入框中添加额外的提示词，帮助 DeepSeek 生成更符合需求的内容。

例如：
- "针对95后用户群体"
- "重点突出环保特性"
- "融入科技互动元素"

## 🎯 当前状态

- ✅ 后端服务器已优化并重启
- ✅ 提示词系统已优化
- ✅ 前端 API 调用逻辑已改进
- ✅ DeepSeek API Key 已配置

现在试试融合气泡，应该能看到更智能的 DeepSeek 生成内容了！
