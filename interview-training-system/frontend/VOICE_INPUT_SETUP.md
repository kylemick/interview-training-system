# 语音输入功能设置说明

## 依赖安装

语音输入功能使用 `vosk-browser` 进行本地离线语音识别。需要安装依赖：

```bash
cd interview-training-system/frontend
npm install vosk-browser
```

**注意**：
- `vosk-browser` 已在 `package.json` 中声明为依赖
- 如果安装失败，请检查网络连接或使用国内镜像：
  ```bash
  npm install vosk-browser --registry=https://registry.npmmirror.com
  ```
- 安装完成后需要重启开发服务器才能生效

## 模型文件配置

Vosk 需要语言模型文件才能工作。每个语言模型约 50MB。

### 1. 下载模型文件

从 Vosk 官网下载模型：
- 中文模型：https://alphacephei.com/vosk/models
- 英文模型：https://alphacephei.com/vosk/models

推荐使用 `vosk-model-small-*` 系列（体积较小，适合浏览器使用）：
- `vosk-model-small-cn-0.22` (中文)
- `vosk-model-small-en-us-0.22` (英文)

### 2. 放置模型文件

将下载的模型文件（.tar.gz 格式）解压后，放置到以下位置：

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

模型路径已在 `src/utils/voskRecognition.ts` 中配置为解压后的目录路径：

```typescript
export const LANGUAGE_MODEL_PATHS: Record<SupportedLanguage, string> = {
  'zh-CN': '/models/vosk-model-small-cn-0.22',
  'en-US': '/models/vosk-model-small-en-us-0.22',
}
```

**重要提示**：
- 路径必须是解压后的目录路径，**不是** `.tar.gz` 压缩文件路径
- 确保模型目录包含 `am/` 和 `graph/` 等子目录
- 如果模型加载失败，请检查路径配置是否正确

## API 调整

由于 `vosk-browser` 的实际 API 可能与代码中的实现不同，需要根据实际文档调整：

1. 查看 `vosk-browser` 的官方文档：https://github.com/ccoreilly/vosk-browser
2. 调整 `src/utils/voskRecognition.ts` 中的模型加载和识别逻辑
3. 确保模型加载、识别器创建、音频处理等步骤符合实际 API

## 使用说明

1. 用户首次使用时，需要加载语音识别模型（约 50MB）
2. 模型会缓存到浏览器的 IndexedDB 中，后续无需重新下载
3. 支持中文和英文两种语言识别
4. 识别结果会自动填充到答案输入框，用户可以继续编辑

## 故障排除

### 模型加载失败
- 检查模型文件是否正确放置
- 检查模型路径配置是否正确
- 检查网络连接（首次下载需要网络）

### 识别不准确
- 确保环境安静，减少背景噪音
- 说话清晰，语速适中
- 可以多次录音并手动编辑结果

### 浏览器不支持
- 需要支持 WebAssembly 的现代浏览器
- Chrome、Edge、Firefox、Safari 等主流浏览器都支持
