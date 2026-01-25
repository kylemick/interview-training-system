/**
 * 语音输入组件
 * 提供语音识别功能，支持中文和英文
 */

import { useState, useEffect, useRef } from 'react'
import { Button, Select, Progress, message, Space, Typography } from 'antd'
import { AudioOutlined, StopOutlined, LoadingOutlined } from '@ant-design/icons'
import {
  createVoskRecognizer,
  AudioRecorder,
  isWebAssemblySupported,
  SupportedLanguage,
  VoskError,
} from '../utils/voskRecognition'

const { Text } = Typography

export interface VoiceInputProps {
  onResult: (text: string) => void // 识别结果回调
  onError?: (error: Error) => void // 错误回调
  language?: SupportedLanguage // 识别语言
  disabled?: boolean // 是否禁用
  onModelLoading?: (progress: number) => void // 模型加载进度回调
}

type VoiceInputState =
  | 'idle' // 空闲
  | 'loading' // 加载模型中
  | 'ready' // 准备就绪
  | 'listening' // 录音中
  | 'processing' // 识别中
  | 'completed' // 识别完成
  | 'error' // 错误状态

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

  // 清理资源
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

      const recognizer = await createVoskRecognizer(
        selectedLanguage,
        (progress) => {
          setLoadingProgress(progress)
          onModelLoading?.(progress)
        }
      )

      recognizerRef.current = recognizer
      setState('ready')
      message.success('模型加载完成，可以开始录音')
    } catch (error) {
      console.error('模型加载失败:', error)
      setState('error')
      const errorMessage =
        error instanceof VoskError
          ? error.message
          : '模型加载失败，请检查网络连接或稍后重试'
      message.error(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  // 开始录音
  const startRecording = async () => {
    // 如果状态不是 ready 或 idle，需要先处理
    if (state === 'loading' || state === 'processing' || state === 'listening' || state === 'error' || state === 'completed') {
      return
    }
    
    // 如果模型未加载，先加载模型
    if (state === 'idle') {
      await loadModel()
      // loadModel 内部会更新 state，如果加载失败会设置为 'error'
      // 这里直接返回，让用户再次点击时如果状态是 ready 就可以继续
      return
    }
    
    // 确保状态是 ready
    if (state !== 'ready') {
      return
    }

    try {
      setState('listening')
      setRecordingDuration(0)
      audioChunksRef.current = []

      const recorder = new AudioRecorder()
      recorderRef.current = recorder

      // 开始录音时长计时
      durationTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      // 开始录音
      await recorder.startRecording((audioData) => {
        // 收集音频数据
        audioChunksRef.current.push(audioData)

        // 实时识别（可选，如果支持流式识别）
        // 注意：state 在闭包中可能不是最新值，使用 recognizerRef 来检查状态
        if (recognizerRef.current) {
          // 这里可以实现实时识别逻辑
        }
      })

      message.info('开始录音...')
    } catch (error) {
      console.error('录音启动失败:', error)
      setState('error')
      const errorMessage =
        error instanceof VoskError
          ? error.message
          : '录音启动失败，请检查麦克风权限'
      message.error(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
    }
  }

  // 停止录音并识别
  const stopRecording = async () => {
    if (state !== 'listening' || !recorderRef.current) return

    try {
      // 停止录音
      recorderRef.current.stopRecording()
      recorderRef.current = null

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      setState('processing')
      message.info('正在识别...')

      // 合并所有音频数据
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

      // 执行识别
      if (recognizerRef.current) {
        const result = await recognizerRef.current.recognize(mergedAudio)
        if (result) {
          onResult(result)
          setState('completed')
          message.success('识别完成')
        } else {
          throw new Error('识别结果为空')
        }
      } else {
        throw new Error('识别器未初始化')
      }
    } catch (error) {
      console.error('识别失败:', error)
      setState('error')
      const errorMessage =
        error instanceof Error ? error.message : '识别失败，请重试'
      message.error(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  // 格式化录音时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 语言切换处理
  const handleLanguageChange = (lang: SupportedLanguage) => {
    if (state === 'listening' || state === 'processing') {
      message.warning('请先停止录音')
      return
    }

    setSelectedLanguage(lang)
    // 如果模型已加载，需要重新加载新语言的模型
    if (recognizerRef.current) {
      recognizerRef.current.destroy()
      recognizerRef.current = null
      setState('idle')
    }
  }

  // 如果浏览器不支持，不显示组件
  if (!isWebAssemblySupported()) {
    return null
  }

  const isRecording = state === 'listening'
  const isLoading = state === 'loading'
  const isProcessing = state === 'processing'
  const isReady = state === 'ready'
  const canStart = state === 'idle' || state === 'ready' || state === 'error'

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 语言选择器 */}
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            识别语言：
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

        {/* 模型加载进度 */}
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

        {/* 录音控制按钮 */}
        <Space>
          {canStart && (
            <Button
              type="primary"
              icon={<AudioOutlined />}
              onClick={state === 'idle' ? loadModel : startRecording}
              disabled={disabled || isLoading}
              loading={isLoading}
            >
              {state === 'idle' ? '加载模型' : '开始录音'}
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
                停止录音 ({formatDuration(recordingDuration)})
              </Button>
              <Text type="danger" style={{ fontSize: 12 }}>
                ● 录音中...
              </Text>
            </>
          )}

          {isProcessing && (
            <Space>
              <LoadingOutlined spin />
              <Text type="secondary">识别中...</Text>
            </Space>
          )}

          {isReady && !isRecording && !isProcessing && (
            <Text type="success" style={{ fontSize: 12 }}>
              ✓ 准备就绪
            </Text>
          )}
        </Space>

        {/* 使用提示 */}
        {state === 'idle' && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：首次使用需要加载语音识别模型，请确保网络连接正常
          </Text>
        )}
      </Space>
    </div>
  )
}
