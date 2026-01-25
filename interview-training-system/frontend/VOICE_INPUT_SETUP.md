# 語音输入功能设置說明

## 依赖安装

語音输入功能使用 `vosk-browser` 進行本地离线語音識別。需要安装依赖：

```bash
cd interview-training-system/frontend
npm install vosk-browser
```

**注意**：
- `vosk-browser` 已在 `package.json` 中声明为依赖
- 如果安装失敗，请检查网络连接或使用国內镜像：
  ```bash
  npm install vosk-browser --registry=https://registry.npmmirror.com
  ```
- 安装完成後需要重启開發服務器才能生效

## 模型文件配置

Vosk 需要語言模型文件才能工作。每个語言模型约 50MB。

### 1. 下载模型文件

從 Vosk 官网下载模型：
- 中文模型：https://alphacephei.com/vosk/models
- 英文模型：https://alphacephei.com/vosk/models

推荐使用 `vosk-model-small-*` 係列（体积较小，适合浏览器使用）：
- `vosk-model-small-cn-0.22` (中文)
- `vosk-model-small-en-us-0.22` (英文)

### 2. 放置模型文件

将下载的模型文件（.tar.gz 格式）解压後，放置到以下位置：

```
interview-training-system/frontend/public/models/
├── vosk-model-small-cn-0.22/
│   ├── am/
│   ├── graph/
│   └── ...
└── vosk-model-small-en-us-0.22/
    ├── am/
    ├── graph/
    └── ...
```

### 3. 模型路径配置

模型路径已在 `src/utils/voskRecognition.ts` 中配置为解压後的目錄路径：

```typescript
export const LANGUAGE_MODEL_PATHS: Record<SupportedLanguage, string> = {
  'zh-CN': '/models/vosk-model-small-cn-0.22',
  'en-US': '/models/vosk-model-small-en-us-0.22',
}
```

**重要提示**：
- 路径必须是解压後的目錄路径，**不是** `.tar.gz` 压缩文件路径
- 確保模型目錄包含 `am/` 和 `graph/` 等子目錄
- 如果模型加载失敗，请检查路径配置是否正確

## API 調整

由于 `vosk-browser` 的实际 API 可能与代碼中的实现不同，需要根據实际文檔調整：

1. 查看 `vosk-browser` 的官方文檔：https://github.com/ccoreilly/vosk-browser
2. 調整 `src/utils/voskRecognition.ts` 中的模型加载和識別邏輯
3. 確保模型加载、識別器創建、音频处理等步骤符合实际 API

## 使用說明

1. 用户首次使用時，需要加载語音識別模型（约 50MB）
2. 模型會缓存到浏览器的 IndexedDB 中，後续无需重新下载
3. 支持中文和英文两種語言識別
4. 識別結果會自動填充到答案输入框，用户可以继续编輯

## 故障排除

### 模型加载失敗
- 检查模型文件是否正確放置
- 检查模型路径配置是否正確
- 检查网络连接（首次下载需要网络）

### 識別不準確
- 確保环境安静，减少背景噪音
- 說話清晰，語速适中
- 可以多次錄音并手動编輯結果

### 浏览器不支持
- 需要支持 WebAssembly 的现代浏览器
- Chrome、Edge、Firefox、Safari 等主流浏览器都支持
