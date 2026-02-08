/**
 * 訊飛語音聽寫 (iat) WebAPI 工具
 * 通過 WebSocket 連接訊飛語音聽寫服務，實現實時語音識別
 *
 * 協議參考: https://www.xfyun.cn/doc/asr/voicedict/API.html
 * - 第一幀：common + business + data(status=0)
 * - 中間幀：data(status=1)
 * - 最後一幀：data(status=2)
 * - 響應中使用 pgs 字段標記增量/替換模式
 */

import { api } from './api'

// 支持的語言類型
export type SupportedLanguage = 'zh-CN' | 'en-US'

// 語言映射：前端語言代碼 -> 訊飛 iat 語言參數
const LANG_MAP: Record<SupportedLanguage, string> = {
  'zh-CN': 'zh_cn',
  'en-US': 'en_us',
}

// 識別結果回調
export interface RecognitionCallbacks {
  /** 收到中間結果（實時更新） */
  onPartialResult?: (text: string) => void
  /** 收到最終結果（一句話結束） */
  onFinalResult?: (text: string) => void
  /** 發生錯誤 */
  onError?: (error: Error) => void
  /** 連接已建立 */
  onConnected?: () => void
  /** 連接已關閉 */
  onDisconnected?: () => void
}

// iat 響應中的單個詞
interface IatWord {
  bg: number
  cw: Array<{ w: string; sc: number }>
}

// iat 響應中的結果
interface IatResult {
  sn: number
  ls: boolean
  ws: IatWord[]
  pgs?: 'apd' | 'rpl'
  rg?: [number, number]
}

// iat 響應結構
interface IatResponse {
  code: number
  message: string
  sid: string
  data?: {
    result?: IatResult
    status: number // 0=第一段, 1=中間, 2=最後
  }
}

/**
 * 訊飛語音聽寫識別器
 * 管理 WebSocket 連接、麥克風音頻採集和結果解析
 */
export class XFYunRecognizer {
  private ws: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private callbacks: RecognitionCallbacks
  private language: SupportedLanguage
  private isRunning = false
  private appId = ''

  // iat 使用 sn (sentence number) 來累積/替換結果
  // key = sn, value = 該句的文本
  private snResults: Map<number, string> = new Map()

  constructor(language: SupportedLanguage, callbacks: RecognitionCallbacks) {
    this.language = language
    this.callbacks = callbacks
  }

  /**
   * 開始識別：獲取簽名 URL -> 建立 WebSocket -> 開始錄音
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('識別器已在運行中')
      return
    }

    try {
      // 1. 先請求麥克風權限
      console.log('🎤 請求麥克風權限...')
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // 2. 從後端獲取簽名 URL 和 appId
      console.log('🔑 獲取訊飛 WebSocket 簽名 URL...')
      const lang = LANG_MAP[this.language]
      const res = await api.speech.getWsUrl(lang)
      const wsUrl: string = res.data?.url || res.url
      this.appId = res.data?.appId || ''
      if (!wsUrl) {
        throw new Error('無法獲取語音識別服務 URL')
      }

      // 3. 建立 WebSocket 連接
      console.log('🌐 連接訊飛語音聽寫服務...')
      await this.connectWebSocket(wsUrl)

      // 4. 開始音頻採集並發送
      console.log('🎙️ 開始錄音和實時識別...')
      this.startAudioCapture()
      this.isRunning = true
    } catch (error) {
      this.cleanup()
      const err = error instanceof Error ? error : new Error(String(error))

      if (err.name === 'NotAllowedError') {
        this.callbacks.onError?.(
          new Error(
            '麥克風權限被拒絕。請在瀏覽器設置中允許網站訪問麥克風，然後刷新頁面重試。'
          )
        )
      } else {
        this.callbacks.onError?.(err)
      }
      throw err
    }
  }

  /**
   * 停止識別
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('⏹️ 停止語音識別...')

    // 停止錄音
    this.stopAudioCapture()

    // 發送最後一幀（status=2）
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const lastFrame = {
          data: {
            status: 2,
            format: 'audio/L16;rate=16000',
            encoding: 'raw',
            audio: '',
          },
        }
        this.ws.send(JSON.stringify(lastFrame))
      } catch (e) {
        console.warn('發送結束幀失敗:', e)
      }
    }

    this.isRunning = false

    // 稍後關閉 WebSocket（等待最後的結果返回）
    setTimeout(() => {
      this.closeWebSocket()
    }, 3000)
  }

  /**
   * 獲取當前累積的所有已確認文本
   */
  getAccumulatedText(): string {
    const sorted = Array.from(this.snResults.entries()).sort(
      ([a], [b]) => a - b
    )
    return sorted.map(([, text]) => text).join('')
  }

  /**
   * 是否正在運行
   */
  get running(): boolean {
    return this.isRunning
  }

  // ============== 私有方法 ==============

  private connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      this.ws = ws

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket 連接超時'))
        ws.close()
      }, 10000)

      ws.onopen = () => {
        console.log('✅ WebSocket 已連接，服務就緒')
        clearTimeout(timeout)
        this.callbacks.onConnected?.()
        resolve()
      }

      ws.onmessage = (event) => {
        try {
          const msg: IatResponse = JSON.parse(event.data)

          if (msg.code !== 0) {
            const errMsg = `訊飛識別錯誤 [${msg.code}]: ${msg.message}`
            console.error('❌', errMsg)
            this.callbacks.onError?.(new Error(errMsg))
            return
          }

          if (msg.data?.result) {
            this.handleResult(msg.data.result, msg.data.status)
          }

          // status=2 表示最後一段結果
          if (msg.data?.status === 2) {
            console.log('✅ 訊飛識別結束')
          }
        } catch (e) {
          console.error('解析 WebSocket 消息失敗:', e)
        }
      }

      ws.onerror = (event) => {
        console.error('❌ WebSocket 錯誤:', event)
        clearTimeout(timeout)
        reject(new Error('WebSocket 連接失敗'))
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket 已關閉:', event.code, event.reason)
        this.isRunning = false
        this.callbacks.onDisconnected?.()
      }
    })
  }

  /**
   * 處理 iat 識別結果
   * pgs="apd" 表示追加，pgs="rpl" 表示替換（rg 指定替換範圍）
   */
  private handleResult(result: IatResult, status: number): void {
    // 提取本句文本
    let text = ''
    for (const ws of result.ws) {
      for (const cw of ws.cw) {
        if (cw.w) {
          text += cw.w
        }
      }
    }

    if (result.pgs === 'rpl' && result.rg) {
      // 替換模式：刪除 rg[0] ~ rg[1] 範圍的舊結果，放入新結果
      const [start, end] = result.rg
      for (let sn = start; sn <= end; sn++) {
        this.snResults.delete(sn)
      }
    }

    // 存入/更新當前 sn 的結果
    this.snResults.set(result.sn, text)

    const accumulated = this.getAccumulatedText()

    if (result.ls || status === 2) {
      // 最終結果
      this.callbacks.onFinalResult?.(accumulated)
    } else {
      // 中間結果
      this.callbacks.onPartialResult?.(accumulated)
    }
  }

  /**
   * 開始音頻採集：通過 AudioContext + ScriptProcessorNode 獲取 PCM 數據，
   * 轉換為 base64 後以 JSON 幀發送
   */
  private startAudioCapture(): void {
    if (!this.mediaStream) return

    this.audioContext = new (
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

    const bufferSize = 4096
    this.processorNode = this.audioContext.createScriptProcessor(
      bufferSize,
      1,
      1
    )

    const targetSampleRate = 16000
    const sourceSampleRate = this.audioContext.sampleRate
    let isFirstFrame = true
    // 音頻緩衝區：累積足夠數據再發送（40ms = 640 samples @ 16kHz = 1280 bytes）
    let audioBuffer: Int16Array[] = []
    let bufferLength = 0
    const sendInterval = 40 // 每 40ms 發一幀
    const samplesPerFrame = (targetSampleRate * sendInterval) / 1000 // 640

    this.processorNode.onaudioprocess = (event) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

      const inputData = event.inputBuffer.getChannelData(0)

      // 重採樣到 16kHz
      let pcmFloat: Float32Array
      if (sourceSampleRate !== targetSampleRate) {
        pcmFloat = this.resample(inputData, sourceSampleRate, targetSampleRate)
      } else {
        pcmFloat = new Float32Array(inputData)
      }

      // Float32 -> Int16 PCM
      const pcm16 = this.float32ToInt16(pcmFloat)
      audioBuffer.push(pcm16)
      bufferLength += pcm16.length

      // 當累積夠一幀的數據時發送
      while (bufferLength >= samplesPerFrame) {
        // 合併緩衝區
        const merged = this.mergeInt16Arrays(audioBuffer)
        const frameData = merged.slice(0, samplesPerFrame)
        const remaining = merged.slice(samplesPerFrame)
        audioBuffer = remaining.length > 0 ? [remaining] : []
        bufferLength = remaining.length

        // 轉為 base64
        const base64Audio = this.int16ToBase64(frameData)

        try {
          if (isFirstFrame) {
            // 第一幀：包含 common + business + data
            const firstFrame = {
              common: {
                app_id: this.appId,
              },
              business: {
                language: LANG_MAP[this.language],
                domain: 'iat',
                accent: this.language === 'zh-CN' ? 'mandarin' : '',
                vad_eos: 3000,
                dwa: 'wpgs', // 動態修正（開啟流式返回）
                ptt: 1, // 標點
              },
              data: {
                status: 0,
                format: 'audio/L16;rate=16000',
                encoding: 'raw',
                audio: base64Audio,
              },
            }
            this.ws.send(JSON.stringify(firstFrame))
            isFirstFrame = false
          } else {
            // 後續幀：只包含 data
            const frame = {
              data: {
                status: 1,
                format: 'audio/L16;rate=16000',
                encoding: 'raw',
                audio: base64Audio,
              },
            }
            this.ws.send(JSON.stringify(frame))
          }
        } catch (e) {
          console.warn('發送音頻數據失敗:', e)
        }
      }
    }

    this.sourceNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)
  }

  private stopAudioCapture(): void {
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
  }

  private closeWebSocket(): void {
    if (this.ws) {
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  private cleanup(): void {
    this.stopAudioCapture()
    this.closeWebSocket()
    this.isRunning = false
    this.snResults.clear()
  }

  /**
   * 簡單的線性插值重採樣
   */
  private resample(
    input: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    const ratio = fromRate / toRate
    const outputLength = Math.round(input.length / ratio)
    const output = new Float32Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1)
      const frac = srcIndex - srcIndexFloor
      output[i] = input[srcIndexFloor] * (1 - frac) + input[srcIndexCeil] * frac
    }

    return output
  }

  /**
   * Float32 [-1, 1] 轉 Int16 PCM
   */
  private float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16
  }

  /**
   * 合併多個 Int16Array
   */
  private mergeInt16Arrays(arrays: Int16Array[]): Int16Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Int16Array(totalLength)
    let offset = 0
    for (const arr of arrays) {
      result.set(arr, offset)
      offset += arr.length
    }
    return result
  }

  /**
   * Int16Array 轉 Base64 字符串
   */
  private int16ToBase64(int16: Int16Array): string {
    const bytes = new Uint8Array(int16.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}
