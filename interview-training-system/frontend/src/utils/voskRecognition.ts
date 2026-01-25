/**
 * Vosk 语音识别工具函数
 * 提供本地离线语音识别功能，支持中文和英文
 */

// 检查 WebAssembly 支持
export function isWebAssemblySupported(): boolean {
  try {
    if (
      typeof WebAssembly === 'object' &&
      typeof WebAssembly.instantiate === 'function'
    ) {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      )
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance
      }
    }
  } catch (e) {
    // WebAssembly 不支持
  }
  return false
}

// 语言代码映射
export type SupportedLanguage = 'zh-CN' | 'en-US'

export const LANGUAGE_MODEL_PATHS: Record<SupportedLanguage, string> = {
  'zh-CN': '/models/vosk-model-small-cn-0.22',
  'en-US': '/models/vosk-model-small-en-us-0.22',
}

// 错误代码枚举
export enum VoskErrorCode {
  MODEL_FILE_NOT_FOUND = 'MODEL_FILE_NOT_FOUND',
  MODEL_LOAD_NETWORK_ERROR = 'MODEL_LOAD_NETWORK_ERROR',
  MODEL_LOAD_FORMAT_ERROR = 'MODEL_LOAD_FORMAT_ERROR',
  MODEL_LOAD_PERMISSION_ERROR = 'MODEL_LOAD_PERMISSION_ERROR',
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  WASM_NOT_SUPPORTED = 'WASM_NOT_SUPPORTED',
  RECOGNITION_ERROR = 'RECOGNITION_ERROR',
  RECOGNIZER_CREATE_ERROR = 'RECOGNIZER_CREATE_ERROR',
  RECORDING_START_ERROR = 'RECORDING_START_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MODEL_LOAD_ERROR = 'MODEL_LOAD_ERROR',
}

// 错误类型
export class VoskError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
    public helpUrl?: string
  ) {
    super(message)
    this.name = 'VoskError'
  }
}

/**
 * 检查模型文件是否存在
 * 通过尝试访问模型目录下的关键文件来判断
 */
export async function checkModelFileExists(
  language: SupportedLanguage
): Promise<{ exists: boolean; error?: string }> {
  const modelPath = LANGUAGE_MODEL_PATHS[language]
  
  // 尝试访问模型目录下的关键文件
  // Vosk 模型通常包含 am/final.mdl 或 graph/HCLr.fst 等文件
  const testFiles = [
    `${modelPath}/am/final.mdl`,
    `${modelPath}/graph/HCLr.fst`,
    `${modelPath}/graph/words.txt`,
  ]

  for (const testFile of testFiles) {
    try {
      const response = await fetch(testFile, { method: 'HEAD' })
      if (response.ok) {
        console.log(`模型文件检查通过: ${testFile}`)
        return { exists: true }
      }
    } catch (error) {
      // 继续尝试下一个文件
      continue
    }
  }

  // 如果所有测试文件都访问失败，尝试访问模型目录本身
  try {
    const response = await fetch(modelPath, { method: 'HEAD' })
    if (response.ok || response.status === 403 || response.status === 405) {
      // 403/405 可能表示目录存在但无法直接访问，这是正常的
      console.warn(`模型目录可能存在但无法直接访问: ${modelPath}`)
      return { exists: true }
    }
  } catch (error) {
    // 忽略错误，继续
  }

  const errorMessage = `模型文件不存在: ${modelPath}。请确保模型文件已正确解压并放置在 public/models/ 目录下。`
  console.error(errorMessage)
  return {
    exists: false,
    error: errorMessage,
  }
}

// 模型加载进度回调
export type ModelLoadingProgressCallback = (progress: number) => void

// Vosk 识别器接口
export interface VoskRecognizer {
  recognize: (audioData: Float32Array) => Promise<string | null>
  destroy: () => void
}

// 模型加载器
export class VoskModelLoader {
  private static models: Map<string, any> = new Map()

  /**
   * 加载 Vosk 模型
   */
  static async loadModel(
    language: SupportedLanguage,
    onProgress?: ModelLoadingProgressCallback
  ): Promise<any> {
    // 检查是否已加载
    if (this.models.has(language)) {
      console.log(`模型已加载，使用缓存: ${language}`)
      return this.models.get(language)!
    }

    console.log(`开始加载模型: ${language}`)

    try {
      // 首先检查模型文件是否存在
      console.log('检查模型文件是否存在...')
      const fileCheck = await checkModelFileExists(language)
      if (!fileCheck.exists) {
        const modelPath = LANGUAGE_MODEL_PATHS[language]
        const helpMessage = `模型文件不存在。\n\n` +
          `模型路径: ${modelPath}\n\n` +
          `请按照以下步骤配置模型：\n` +
          `1. 从 https://alphacephei.com/vosk/models 下载模型文件\n` +
          `2. 解压模型文件（.tar.gz）\n` +
          `3. 将解压后的目录放置到 public/models/ 目录下\n` +
          `4. 确保目录结构为: public/models/vosk-model-small-cn-0.22/ (包含 am/ 和 graph/ 子目录)\n\n` +
          `详细说明请参考: VOICE_INPUT_SETUP.md`
        
        throw new VoskError(
          helpMessage,
          VoskErrorCode.MODEL_FILE_NOT_FOUND,
          new Error(fileCheck.error || '模型文件不存在'),
          'VOICE_INPUT_SETUP.md'
        )
      }

      console.log('模型文件检查通过，开始加载...')

      // 动态导入 vosk-browser（如果未安装则抛出错误）
      let voskBrowser: any;
      try {
        // 使用 Function 构造器来完全避免静态分析，防止 Vite 在构建时检查
        // vosk-browser 是可选依赖，可能未安装
        const voskModule = 'vosk-browser';
        const dynamicImport = new Function('module', 'return import(module)');
        voskBrowser = await dynamicImport(voskModule);
        console.log('vosk-browser 模块加载成功')
      } catch (importError: any) {
        if (importError.code === 'ERR_MODULE_NOT_FOUND' || 
            importError.message?.includes('Failed to resolve') ||
            importError.message?.includes('Cannot find module') ||
            importError.message?.includes('does not exist') ||
            importError.message?.includes('Unknown variable dynamic import')) {
          throw new VoskError(
            'vosk-browser 包未安装。语音识别功能暂时不可用。\n\n' +
            '解决方案：\n' +
            '1. 在 frontend 目录下运行: npm install vosk-browser\n' +
            '2. 重启开发服务器',
            VoskErrorCode.MODULE_NOT_FOUND,
            importError
          );
        }
        throw importError;
      }
      const { Model } = voskBrowser;

      const modelPath = LANGUAGE_MODEL_PATHS[language]
      console.log(`加载模型路径: ${modelPath}`)

      // 加载模型（这里需要根据 vosk-browser 的实际 API 调整）
      // 注意：vosk-browser 需要模型文件路径或 URL
      try {
        const model = await Model.load(modelPath, {
          onProgress: (progress: number) => {
            console.log(`模型加载进度: ${progress}%`)
            onProgress?.(progress)
          },
        })

        console.log(`模型加载成功: ${language}`)
        this.models.set(language, model)
        return model
      } catch (loadError: any) {
        // 区分不同类型的加载错误
        const errorMessage = loadError.message || String(loadError)
        let errorCode = VoskErrorCode.MODEL_LOAD_ERROR
        let helpMessage = `模型加载失败: ${errorMessage}`

        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          errorCode = VoskErrorCode.MODEL_FILE_NOT_FOUND
          helpMessage = `模型文件未找到。请检查模型路径配置是否正确，模型文件是否已正确放置。\n\n模型路径: ${modelPath}`
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorCode = VoskErrorCode.MODEL_LOAD_NETWORK_ERROR
          helpMessage = `网络错误，无法加载模型。请检查网络连接后重试。\n\n模型路径: ${modelPath}`
        } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
          errorCode = VoskErrorCode.MODEL_LOAD_PERMISSION_ERROR
          helpMessage = `权限错误，无法访问模型文件。请检查文件权限设置。\n\n模型路径: ${modelPath}`
        } else if (errorMessage.includes('format') || errorMessage.includes('parse')) {
          errorCode = VoskErrorCode.MODEL_LOAD_FORMAT_ERROR
          helpMessage = `模型格式错误。请确保模型文件已正确解压，目录结构完整。\n\n模型路径: ${modelPath}`
        }

        throw new VoskError(
          helpMessage,
          errorCode,
          loadError as Error,
          'VOICE_INPUT_SETUP.md'
        )
      }
    } catch (error) {
      // 如果已经是 VoskError，直接抛出
      if (error instanceof VoskError) {
        console.error(`模型加载失败 [${error.code}]:`, error.message)
        throw error
      }
      
      // 否则包装为 VoskError
      console.error('模型加载失败（未知错误）:', error)
      throw new VoskError(
        `模型加载失败: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `请检查：\n` +
        `1. 模型文件是否存在\n` +
        `2. 模型路径配置是否正确\n` +
        `3. 网络连接是否正常\n` +
        `4. 浏览器控制台是否有详细错误信息`,
        VoskErrorCode.MODEL_LOAD_ERROR,
        error as Error,
        'VOICE_INPUT_SETUP.md'
      )
    }
  }

  /**
   * 从 IndexedDB 检查模型缓存
   */
  static async checkModelCache(language: SupportedLanguage): Promise<boolean> {
    try {
      const dbName = 'vosk-models'
      const storeName = 'models'
      const key = language

      return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 1)

        request.onerror = () => resolve(false)
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains(storeName)) {
            resolve(false)
            return
          }
          const transaction = db.transaction([storeName], 'readonly')
          const store = transaction.objectStore(storeName)
          const getRequest = store.get(key)
          getRequest.onsuccess = () => {
            resolve(getRequest.result !== undefined)
          }
          getRequest.onerror = () => resolve(false)
        }

        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName)
          }
        }
      })
    } catch (error) {
      return false
    }
  }

  /**
   * 清除模型缓存
   */
  static async clearModelCache(language?: SupportedLanguage): Promise<void> {
    // 实现缓存清理逻辑
    if (language) {
      this.models.delete(language)
    } else {
      this.models.clear()
    }
  }
}

// 创建 Vosk 识别器
export async function createVoskRecognizer(
  language: SupportedLanguage,
  onProgress?: ModelLoadingProgressCallback
): Promise<VoskRecognizer> {
  if (!isWebAssemblySupported()) {
    throw new VoskError(
      '浏览器不支持 WebAssembly。语音识别功能需要支持 WebAssembly 的现代浏览器（Chrome、Edge、Firefox、Safari 等）。',
      VoskErrorCode.WASM_NOT_SUPPORTED
    )
  }

  try {
    const model = await VoskModelLoader.loadModel(language, onProgress)
    // 动态导入 vosk-browser（如果未安装则抛出错误）
    let voskBrowser: any;
    try {
      // 使用 Function 构造器来完全避免静态分析，防止 Vite 在构建时检查
      // vosk-browser 是可选依赖，可能未安装
      const voskModule = 'vosk-browser';
      const dynamicImport = new Function('module', 'return import(module)');
      voskBrowser = await dynamicImport(voskModule);
    } catch (importError: any) {
      if (importError.code === 'ERR_MODULE_NOT_FOUND' || 
          importError.message?.includes('Failed to resolve') ||
          importError.message?.includes('Cannot find module') ||
          importError.message?.includes('does not exist') ||
          importError.message?.includes('Unknown variable dynamic import')) {
        throw new VoskError(
          'vosk-browser 包未安装。语音识别功能暂时不可用。如需使用语音识别，请运行: npm install vosk-browser',
          'MODULE_NOT_FOUND',
          importError
        );
      }
      throw importError;
    }
    const { KaldiRecognizer } = voskBrowser;

    // 创建识别器（需要根据 vosk-browser 的实际 API 调整）
    const recognizer = new KaldiRecognizer(model, 16000) // 16kHz 采样率

    return {
      recognize: async (audioData: Float32Array): Promise<string | null> => {
        try {
          // 将 Float32Array 转换为识别器需要的格式
          // 注意：需要根据 vosk-browser 的实际 API 调整
          if (recognizer.acceptWaveform(audioData)) {
            const result = recognizer.result()
            const parsed = JSON.parse(result)
            return parsed.text || null
          } else {
            const partial = recognizer.partialResult()
            const parsed = JSON.parse(partial)
            return parsed.partial || null
          }
        } catch (error) {
          throw new VoskError(
            `语音识别失败: ${error instanceof Error ? error.message : String(error)}`,
            VoskErrorCode.RECOGNITION_ERROR,
            error as Error
          )
        }
      },
      destroy: () => {
        recognizer.free()
      },
    }
  } catch (error) {
    if (error instanceof VoskError) {
      throw error
    }
    throw new VoskError(
      `创建识别器失败: ${error instanceof Error ? error.message : String(error)}`,
      VoskErrorCode.RECOGNIZER_CREATE_ERROR,
      error as Error
    )
  }
}

// 音频采集工具
export class AudioRecorder {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null

  /**
   * 请求麦克风权限并开始录音
   */
  async startRecording(
    onAudioData: (data: Float32Array) => void
  ): Promise<void> {
    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // 创建 AudioContext
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      })

      // 创建音频源
      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream
      )

      // 创建处理器（使用 ScriptProcessorNode，较旧的 API，但兼容性好）
      const bufferSize = 4096
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        1,
        1
      )

      this.processorNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        const float32Data = new Float32Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          float32Data[i] = inputData[i]
        }
        onAudioData(float32Data)
      }

      // 连接节点
      this.sourceNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        throw new VoskError(
          '麦克风权限被拒绝。请在浏览器设置中允许网站访问麦克风，然后刷新页面重试。',
          VoskErrorCode.PERMISSION_DENIED,
          error as Error
        )
      }
      throw new VoskError(
        `启动录音失败: ${error instanceof Error ? error.message : String(error)}`,
        VoskErrorCode.RECORDING_START_ERROR,
        error as Error
      )
    }
  }

  /**
   * 停止录音
   */
  stopRecording(): void {
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // 重置录音状态
  }

  /**
   * 检查是否正在录音
   */
  isRecording(): boolean {
    return this.mediaStream !== null && this.mediaStream.active
  }
}

/**
 * 检查语音输入功能的配置状态
 * 用于调试和诊断问题
 */
export interface VoiceInputSetupStatus {
  webAssemblySupported: boolean
  voskBrowserInstalled: boolean
  modelFilesExist: {
    'zh-CN': boolean
    'en-US': boolean
  }
  microphonePermission: 'granted' | 'denied' | 'prompt' | 'unknown'
  errors: string[]
}

export async function checkVoiceInputSetup(): Promise<VoiceInputSetupStatus> {
  const status: VoiceInputSetupStatus = {
    webAssemblySupported: isWebAssemblySupported(),
    voskBrowserInstalled: false,
    modelFilesExist: {
      'zh-CN': false,
      'en-US': false,
    },
    microphonePermission: 'unknown',
    errors: [],
  }

  // 检查 vosk-browser 是否安装
  try {
    const voskModule = 'vosk-browser'
    const dynamicImport = new Function('module', 'return import(module)')
    await dynamicImport(voskModule)
    status.voskBrowserInstalled = true
  } catch (error) {
    status.voskBrowserInstalled = false
    status.errors.push('vosk-browser 包未安装')
  }

  // 检查模型文件
  for (const lang of ['zh-CN', 'en-US'] as SupportedLanguage[]) {
    try {
      const check = await checkModelFileExists(lang)
      status.modelFilesExist[lang] = check.exists
      if (!check.exists && check.error) {
        status.errors.push(`模型文件不存在 (${lang}): ${check.error}`)
      }
    } catch (error) {
      status.modelFilesExist[lang] = false
      status.errors.push(`检查模型文件失败 (${lang}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 检查麦克风权限
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      status.microphonePermission = result.state as 'granted' | 'denied' | 'prompt'
    } else {
      status.microphonePermission = 'unknown'
    }
  } catch (error) {
    status.microphonePermission = 'unknown'
    status.errors.push(`检查麦克风权限失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  return status
}
