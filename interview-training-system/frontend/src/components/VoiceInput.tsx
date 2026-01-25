/**
 * 語音输入組件
 * 提供語音識別功能，支持中文和英文
 */

import { useState, useEffect, useRef } from 'react'
import { Button, Select, Progress, message, Space, Typography, Alert } from 'antd'
import { AudioOutlined, StopOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  createVoskRecognizer,
  AudioRecorder,
  isWebAssemblySupported,
  SupportedLanguage,
  VoskError,
  VoskErrorCode,
} from '../utils/voskRecognition'

const { Text } = Typography

export interface VoiceInputProps {
  onResult: (text: string) => void // 識別結果回調
  onError?: (error: Error) => void // 错误回調
  language?: SupportedLanguage // 識別語言
  disabled?: boolean // 是否禁用
  onModelLoading?: (progress: number) => void // 模型加载進度回調
}

type VoiceInputState =
  | 'idle' // 空闲
  | 'loading' // 加载模型中
  | 'ready' // 準備就绪
  | 'listening' // 錄音中
  | 'processing' // 識別中
  | 'completed' // 識別完成
  | 'error' // 错误狀態

export default function VoiceInput({
  onResult,
  onError,
  language = 'zh-CN',
  disabled = false,
  onModelLoading,
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceInputState>('idle')
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>(language)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [errorInfo, setErrorInfo] = useState<{
    message: string
    code: string
    canRetry: boolean
  } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRY_COUNT = 3

  const recognizerRef = useRef<any>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const durationTimerRef = useRef<number | null>(null)

  // 检查浏览器支持
  useEffect(() => {
    if (!isWebAssemblySupported()) {
      setState('error')
      onError?.(new Error('浏览器不支持 WebAssembly'))
    }
  }, [onError])

  // 清理資源
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stopRecording()
      }
      if (recognizerRef.current) {
        recognizerRef.current.destroy()
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
    }
  }, [])

  // 加载模型
  const loadModel = async () => {
    if (state === 'loading' || state === 'ready') return

    try {
      setState('loading')
      setLoadingProgress(0)
      setErrorInfo(null)
      console.log(`開始加载模型: ${selectedLanguage}`)

      const recognizer = await createVoskRecognizer(
        selectedLanguage,
        (progress) => {
          setLoadingProgress(progress)
          onModelLoading?.(progress)
        }
      )

      recognizerRef.current = recognizer
      setState('ready')
      setRetryCount(0) // 重置重試計數
      console.log('模型加载成功')
      message.success('模型加载完成，可以開始錄音')
    } catch (error) {
      console.error('模型加载失敗:', error)
      setState('error')
      
      let errorMessage = '模型加载失敗，请检查网络连接或稍後重試'
      let errorCode = 'UNKNOWN_ERROR'
      let canRetry = true

      if (error instanceof VoskError) {
        errorMessage = error.message
        errorCode = error.code
        
        // 某些错误不应该重試
        if (
          error.code === VoskErrorCode.WASM_NOT_SUPPORTED ||
          error.code === VoskErrorCode.MODULE_NOT_FOUND
        ) {
          canRetry = false
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setErrorInfo({
        message: errorMessage,
        code: errorCode,
        canRetry: canRetry && retryCount < MAX_RETRY_COUNT,
      })

      // 显示错误提示
      message.error(errorMessage, 8) // 显示8秒，让用户有時間阅读
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  // 重試加载模型
  const retryLoadModel = async () => {
    if (retryCount >= MAX_RETRY_COUNT) {
      message.warning('已達到最大重試次數，请检查配置後重試')
      return
    }

    setRetryCount((prev) => prev + 1)
    console.log(`重試加载模型 (${retryCount + 1}/${MAX_RETRY_COUNT})`)
    
    // 清除之前的错误狀態
    setErrorInfo(null)
    
    // 如果識別器已存在，先销毁
    if (recognizerRef.current) {
      try {
        recognizerRef.current.destroy()
      } catch (e) {
        console.warn('清理識別器時出错:', e)
      }
      recognizerRef.current = null
    }

    // 重新加载
    await loadModel()
  }

  // 開始錄音
  const startRecording = async () => {
    // 如果狀態不是 ready 或 idle，需要先处理
    if (state === 'loading' || state === 'processing' || state === 'listening' || state === 'error' || state === 'completed') {
      return
    }
    
    // 如果模型未加载，先加载模型
    if (state === 'idle') {
      await loadModel()
      // loadModel 內部會更新 state，如果加载失敗會设置为 'error'
      // 这里直接返回，让用户再次點击時如果狀態是 ready 就可以继续
      return
    }
    
    // 確保狀態是 ready
    if (state !== 'ready') {
      return
    }

    try {
      setState('listening')
      setRecordingDuration(0)
      audioChunksRef.current = []

      const recorder = new AudioRecorder()
      recorderRef.current = recorder

      // 開始錄音時長計時
      durationTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      // 開始錄音
      await recorder.startRecording((audioData) => {
        // 收集音频數據
        audioChunksRef.current.push(audioData)

        // 实時識別（可選，如果支持流式識別）
        // 注意：state 在闭包中可能不是最新值，使用 recognizerRef 來检查狀態
        if (recognizerRef.current) {
          // 这里可以实现实時識別邏輯
        }
      })

      message.info('開始錄音...')
    } catch (error) {
      console.error('錄音启動失敗:', error)
      setState('error')
      const errorMessage =
        error instanceof VoskError
          ? error.message
          : '錄音启動失敗，请检查麦克風权限'
      message.error(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
    }
  }

  // 停止錄音并識別
  const stopRecording = async () => {
    if (state !== 'listening' || !recorderRef.current) return

    try {
      // 停止錄音
      recorderRef.current.stopRecording()
      recorderRef.current = null

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      setState('processing')
      message.info('正在識別...')

      // 合并所有音频數據
      const totalLength = audioChunksRef.current.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      )
      const mergedAudio = new Float32Array(totalLength)
      let offset = 0
      for (const chunk of audioChunksRef.current) {
        mergedAudio.set(chunk, offset)
        offset += chunk.length
      }

      // 执行識別
      if (recognizerRef.current) {
        const result = await recognizerRef.current.recognize(mergedAudio)
        if (result) {
          onResult(result)
          setState('completed')
          message.success('識別完成')
        } else {
          throw new Error('識別結果为空')
        }
      } else {
        throw new Error('識別器未初始化')
      }
    } catch (error) {
      console.error('識別失敗:', error)
      setState('error')
      const errorMessage =
        error instanceof Error ? error.message : '識別失敗，请重試'
      message.error(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  // 格式化錄音時長
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 語言切换处理
  const handleLanguageChange = (lang: SupportedLanguage) => {
    if (state === 'listening' || state === 'processing') {
      message.warning('请先停止錄音')
      return
    }

    setSelectedLanguage(lang)
    // 如果模型已加载，需要重新加载新語言的模型
    if (recognizerRef.current) {
      recognizerRef.current.destroy()
      recognizerRef.current = null
      setState('idle')
    }
  }

  // 如果浏览器不支持，不显示組件（優雅降级）
  if (!isWebAssemblySupported()) {
    console.warn('浏览器不支持 WebAssembly，語音输入功能不可用')
    return null
  }

  const isRecording = state === 'listening'
  const isLoading = state === 'loading'
  const isProcessing = state === 'processing'
  const isReady = state === 'ready'
  const canStart = state === 'idle' || state === 'ready' || (state === 'error' && errorInfo?.canRetry)
  
  // 如果错误不可恢复，隐藏組件（優雅降级）
  const shouldHideComponent = 
    state === 'error' && 
    errorInfo && 
    !errorInfo.canRetry && 
    (errorInfo.code === VoskErrorCode.WASM_NOT_SUPPORTED || 
     errorInfo.code === VoskErrorCode.MODULE_NOT_FOUND)
  
  if (shouldHideComponent) {
    console.warn('語音输入功能不可用，已自動降级到文本输入')
    return null
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 語言選擇器 */}
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            識別語言：
          </Text>
          <Select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={disabled || isLoading || isRecording || isProcessing}
            size="small"
            style={{ width: 120 }}
            options={[
              { value: 'zh-CN', label: '中文' },
              { value: 'en-US', label: 'English' },
            ]}
          />
        </Space>

        {/* 模型加载進度 */}
        {isLoading && (
          <div>
            <Progress
              percent={loadingProgress}
              status="active"
              format={(percent) => `加载模型中 ${percent}%`}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              首次使用需要下载模型文件（约50MB），请耐心等待...
            </Text>
          </div>
        )}

        {/* 錄音控制按钮 */}
        <Space>
          {canStart && (
            <Button
              type="primary"
              icon={<AudioOutlined />}
              onClick={state === 'idle' ? loadModel : startRecording}
              disabled={disabled || isLoading}
              loading={isLoading}
            >
              {state === 'idle' ? '加载模型' : '開始錄音'}
            </Button>
          )}

          {isRecording && (
            <>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={stopRecording}
                disabled={disabled}
              >
                停止錄音 ({formatDuration(recordingDuration)})
              </Button>
              <Text type="danger" style={{ fontSize: 12 }}>
                ● 錄音中...
              </Text>
            </>
          )}

          {isProcessing && (
            <Space>
              <LoadingOutlined spin />
              <Text type="secondary">識別中...</Text>
            </Space>
          )}

          {isReady && !isRecording && !isProcessing && (
            <Text type="success" style={{ fontSize: 12 }}>
              ✓ 準備就绪
            </Text>
          )}
        </Space>

        {/* 错误提示 */}
        {state === 'error' && errorInfo && (
          <Alert
            message="語音输入功能暫時不可用"
            description={
              <div>
                <div style={{ marginBottom: 8 }}>{errorInfo.message}</div>
                {errorInfo.code === VoskErrorCode.MODEL_FILE_NOT_FOUND && (
                  <div style={{ fontSize: 12, color: '#666' }}>
                    请參考 VOICE_INPUT_SETUP.md 文檔配置模型文件
                  </div>
                )}
                {errorInfo.code === VoskErrorCode.MODULE_NOT_FOUND && (
                  <div style={{ fontSize: 12, color: '#666' }}>
                    请在 frontend 目錄下运行: npm install vosk-browser
                  </div>
                )}
              </div>
            }
            type="error"
            showIcon
            action={
              errorInfo.canRetry ? (
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={retryLoadModel}
                  disabled={isLoading}
                >
                  重試
                </Button>
              ) : null
            }
            style={{ marginTop: 8 }}
          />
        )}

        {/* 使用提示 */}
        {state === 'idle' && !errorInfo && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：首次使用需要加载語音識別模型，请確保网络连接正常
          </Text>
        )}
      </Space>
    </div>
  )
}
