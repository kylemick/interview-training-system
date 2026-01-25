# 语音转文字方案对比

## 方案对比

### 方案 1: 浏览器原生 Web Speech API（推荐 - 更简单）

**优点**：
- ✅ **零配置**：无需安装 npm 包，无需下载模型文件
- ✅ **代码简单**：浏览器原生 API，代码量少
- ✅ **实时识别**：支持流式识别，实时显示结果
- ✅ **准确率高**：使用浏览器内置的语音识别引擎
- ✅ **本地处理**：使用 `processLocally = true` 可强制本地处理，保护隐私
- ✅ **自动语言检测**：支持自动检测语言

**缺点**：
- ⚠️ **浏览器兼容性**：
  - Chrome: ✅ 支持（v25+）
  - Safari: ✅ 支持（v14.1+，iOS 14.5+）
  - Firefox: ❌ 默认禁用
  - Edge: ❌ 不支持
- ⚠️ **隐私考虑**：默认可能使用云端服务（但可通过 `processLocally` 强制本地）
- ⚠️ **离线限制**：某些浏览器可能不支持完全离线

**实现复杂度**：⭐ (非常简单)

---

### 方案 2: Vosk (当前方案)

**优点**：
- ✅ **完全离线**：所有处理在本地完成
- ✅ **隐私保护**：数据完全不离开设备
- ✅ **跨浏览器**：支持所有支持 WebAssembly 的浏览器
- ✅ **可控性强**：完全控制识别过程

**缺点**：
- ❌ **需要安装包**：需要安装 `vosk-browser` npm 包
- ❌ **需要模型文件**：每种语言约 50MB，需要手动下载和配置
- ❌ **配置复杂**：需要正确配置模型路径
- ❌ **包较老**：vosk-browser 最新版本是 0.0.8（3年前）
- ❌ **准确率可能较低**：相比浏览器原生引擎

**实现复杂度**：⭐⭐⭐ (较复杂)

---

## 推荐方案

### 推荐使用：Web Speech API + processLocally

**理由**：
1. **简单可靠**：无需额外依赖，浏览器原生支持
2. **用户体验好**：实时识别，准确率高
3. **隐私可控**：通过 `processLocally = true` 强制本地处理
4. **维护成本低**：无需管理模型文件

**实现示例**：

```typescript
// 简单的 Web Speech API 实现
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'zh-CN' // 或 'en-US'
recognition.continuous = true // 持续识别
recognition.interimResults = true // 显示中间结果

// 强制本地处理（如果浏览器支持）
if ('processLocally' in recognition) {
  recognition.processLocally = true
}

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript
  onResult(transcript)
}

recognition.start()
```

---

## 迁移建议

如果选择切换到 Web Speech API：

1. **保留 Vosk 作为降级方案**：如果浏览器不支持 Web Speech API，可以降级到 Vosk
2. **检测浏览器支持**：自动检测并选择最佳方案
3. **用户选择**：允许用户选择使用哪种方案

---

## 浏览器支持情况

| 浏览器 | Web Speech API | processLocally | 推荐使用 |
|--------|---------------|----------------|----------|
| Chrome | ✅ | ✅ | ✅ 推荐 |
| Safari | ✅ | ✅ | ✅ 推荐 |
| Firefox | ❌ | ❌ | ❌ 不支持 |
| Edge | ❌ | ❌ | ❌ 不支持 |

**全球覆盖率**：约 88.2% 的用户可以使用
