# AI 语音转文字方案对比

## 可用的 AI 方案

### 方案 1: OpenAI Whisper API（推荐 - 最成熟）

**优点**：
- ✅ **准确率最高**：使用 OpenAI 的 Whisper 模型，识别准确率业界领先
- ✅ **支持多语言**：支持 99+ 种语言，包括中文、英文
- ✅ **API 简单**：RESTful API，易于集成
- ✅ **实时支持**：支持流式识别（Realtime API）
- ✅ **文件格式支持广**：支持多种音频格式（mp3, wav, m4a 等）
- ✅ **成本可控**：按使用量付费

**缺点**：
- ❌ **需要 API Key**：需要 OpenAI API Key（或兼容的 API）
- ❌ **需要后端代理**：音频需要发送到服务器
- ❌ **有成本**：每次调用需要付费
- ❌ **需要网络**：必须联网使用

**实现方式**：
```typescript
// 后端 API 路由
POST /api/ai/speech-to-text
Body: FormData (audio file)
Response: { text: string }
```

**成本**：约 $0.006/分钟（根据 OpenAI 定价）

---

### 方案 2: Whisper WebGPU（浏览器内运行）

**优点**：
- ✅ **完全离线**：在浏览器内运行，无需服务器
- ✅ **隐私保护**：音频不离开设备
- ✅ **使用 WebGPU**：利用 GPU 加速，性能好
- ✅ **免费**：无需 API 费用

**缺点**：
- ❌ **需要下载模型**：模型文件较大（~150MB+）
- ❌ **浏览器要求高**：需要支持 WebGPU 的浏览器
- ❌ **性能依赖硬件**：低端设备可能较慢
- ❌ **实现复杂**：需要集成 WebGPU 代码

**npm 包**：`whisper-web-transcriber` 或直接使用 WebGPU 实现

---

### 方案 3: whisper-web-transcriber（npm 包）

**优点**：
- ✅ **简单易用**：npm 包，开箱即用
- ✅ **浏览器内运行**：无需服务器
- ✅ **自动缓存**：模型自动缓存到 IndexedDB
- ✅ **支持多种模型**：tiny, base, quantized 等

**缺点**：
- ❌ **模型体积大**：即使 tiny 模型也有几十 MB
- ❌ **准确率可能较低**：小模型准确率不如 API
- ❌ **包维护情况**：需要检查包的活跃度

**安装**：
```bash
npm install whisper-web-transcriber
```

---

### 方案 4: OpenAI Realtime API（实时流式）

**优点**：
- ✅ **实时识别**：支持流式识别，延迟低
- ✅ **支持 WebRTC**：可以直接在浏览器中使用
- ✅ **准确率高**：使用最新的 Whisper 模型
- ✅ **支持多语言**：自动检测语言

**缺点**：
- ❌ **需要 API Key**：需要 OpenAI API
- ❌ **成本较高**：实时 API 价格可能更高
- ❌ **需要 WebSocket**：需要维护 WebSocket 连接
- ❌ **实现复杂**：需要处理实时流

---

## 推荐方案对比

| 方案 | 准确率 | 成本 | 复杂度 | 离线 | 推荐度 |
|------|--------|------|--------|------|--------|
| **OpenAI Whisper API** | ⭐⭐⭐⭐⭐ | 💰 | ⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ |
| **Whisper WebGPU** | ⭐⭐⭐⭐ | 免费 | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |
| **whisper-web-transcriber** | ⭐⭐⭐ | 免费 | ⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| **Web Speech API** | ⭐⭐⭐ | 免费 | ⭐ | ⚠️ | ⭐⭐⭐ |

---

## 针对本项目的推荐

### 推荐方案：OpenAI Whisper API（通过后端代理）

**理由**：
1. **已有后端架构**：项目已有 DeepSeek API 集成，可以复用相同模式
2. **准确率最高**：适合教育场景，需要高准确率
3. **实现简单**：只需添加一个后端 API 路由
4. **成本可控**：语音识别使用频率不高，成本可接受
5. **用户体验好**：识别准确，响应快

**实现步骤**：

1. **后端添加 Whisper API 路由**
   ```typescript
   // backend/src/routes/ai.ts
   POST /api/ai/speech-to-text
   - 接收音频文件（FormData）
   - 调用 OpenAI Whisper API
   - 返回识别文本
   ```

2. **前端调用**
   ```typescript
   // 录音后上传音频文件
   const formData = new FormData()
   formData.append('audio', audioBlob, 'recording.webm')
   const response = await fetch('/api/ai/speech-to-text', {
     method: 'POST',
     body: formData
   })
   const { text } = await response.json()
   ```

3. **配置 API Key**
   - 在环境变量中添加 `OPENAI_API_KEY`
   - 或使用兼容 OpenAI API 的其他服务

---

## 替代方案：使用兼容 OpenAI API 的服务

如果不想使用 OpenAI，可以使用兼容 OpenAI API 格式的其他服务：

1. **DeepSeek**：目前不支持语音转文字（只支持文本）
2. **其他兼容服务**：一些服务提供兼容 OpenAI API 的接口

---

## 实施建议

### 方案 A：OpenAI Whisper API（推荐）

**优点**：准确率高，实现简单，用户体验好

**实施**：
- 后端添加 `/api/ai/speech-to-text` 路由
- 前端录音后上传到后端
- 后端调用 OpenAI Whisper API
- 返回识别结果

**成本**：约 $0.006/分钟，假设每次录音 1 分钟，1000 次使用 = $6

### 方案 B：Whisper WebGPU（如果必须离线）

**优点**：完全离线，隐私保护

**实施**：
- 使用 `whisper-web-transcriber` npm 包
- 在浏览器内运行模型
- 无需后端支持

**成本**：免费，但需要下载模型文件

---

## 结论

**推荐使用 OpenAI Whisper API**，因为：
1. 准确率最高，适合教育场景
2. 实现简单，可以复用现有后端架构
3. 成本可控，使用频率不高
4. 用户体验好

如果需要完全离线，可以考虑 Whisper WebGPU 方案。
