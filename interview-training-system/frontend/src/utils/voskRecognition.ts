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
  'zh-CN': '/models/vosk-model-small-cn-0.22.tar.gz',
  'en-US': '/models/vosk-model-small-en-us-0.22.tar.gz',
}

// 错误类型
export class VoskError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'VoskError'
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
      return this.models.get(language)!
    }

    try {
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
      const { Model } = voskBrowser;

      const modelPath = LANGUAGE_MODEL_PATHS[language]

      // 加载模型（这里需要根据 vosk-browser 的实际 API 调整）
      // 注意：vosk-browser 需要模型文件路径或 URL
      const model = await Model.load(modelPath, {
        onProgress: (progress: number) => {
          onProgress?.(progress)
        },
      })

      this.models.set(language, model)
      return model
    } catch (error) {
      throw new VoskError(
        `Failed to load model for ${language}`,
        'MODEL_LOAD_ERROR',
        error as Error
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
      'WebAssembly is not supported in this browser',
      'WASM_NOT_SUPPORTED'
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
            'Recognition failed',
            'RECOGNITION_ERROR',
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
      'Failed to create recognizer',
      'RECOGNIZER_CREATE_ERROR',
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
          'Microphone permission denied',
          'PERMISSION_DENIED',
          error as Error
        )
      }
      throw new VoskError(
        'Failed to start recording',
        'RECORDING_START_ERROR',
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
