/**
 * 語音輸入組件
 * 基於訊飛實時語音轉寫，提供實時語音識別功能
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Select, message, Space, Typography } from 'antd'
import { AudioOutlined, StopOutlined } from '@ant-design/icons'
import { XFYunRecognizer, SupportedLanguage } from '../utils/xfyunRecognition'

const { Text } = Typography

export interface VoiceInputProps {
  onResult: (text: string) => void
  onError?: (error: Error) => void
  language?: SupportedLanguage
  disabled?: boolean
}

type VoiceInputState = 'idle' | 'connecting' | 'listening'

export default function VoiceInput({
  onResult,
  onError,
  language = 'zh-CN',
  disabled = false,
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceInputState>('idle')
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language)
  const [partialText, setPartialText] = useState('')
  const [recordingDuration, setRecordingDuration] = useState(0)

  const recognizerRef = useRef<XFYunRecognizer | null>(null)
  const durationTimerRef = useRef<number | null>(null)
  // 用 ref 追踪最新的累積文本，避免閉包問題
  const lastFinalTextRef = useRef('')

  // 清理資源
  useEffect(() => {
    return () => {
      if (recognizerRef.current?.running) {
        recognizerRef.current.stop()
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
    }
  }, [])

  // 開始錄音
  const startRecording = useCallback(async () => {
    if (state !== 'idle' || disabled) return

    try {
      setState('connecting')
      setPartialText('')
      setRecordingDuration(0)
      lastFinalTextRef.current = ''

      const recognizer = new XFYunRecognizer(selectedLanguage, {
        onConnected: () => {
          setState('listening')
          message.info('開始錄音，請說話...')

          // 開始計時
          durationTimerRef.current = window.setInterval(() => {
            setRecordingDuration((prev) => prev + 1)
          }, 1000)
        },
        onPartialResult: (text) => {
          setPartialText(text)
        },
        onFinalResult: (text) => {
          lastFinalTextRef.current = text
          setPartialText(text)
        },
        onError: (error) => {
          console.error('❌ 語音識別錯誤:', error)
          message.error(`語音識別錯誤: ${error.message}`)
          onError?.(error)
          setState('idle')
          cleanupTimer()
        },
        onDisconnected: () => {
          // 連接斷開時，如果有累積結果，回傳給父組件
          const finalText = lastFinalTextRef.current
          if (finalText) {
            onResult(finalText)
          }
          setState('idle')
          cleanupTimer()
        },
      })

      recognizerRef.current = recognizer
      await recognizer.start()
    } catch (error) {
      console.error('❌ 啟動語音識別失敗:', error)
      setState('idle')
      cleanupTimer()
      const err = error instanceof Error ? error : new Error(String(error))
      message.error(`啟動語音識別失敗: ${err.message}`)
      onError?.(err)
    }
  }, [state, disabled, selectedLanguage, onResult, onError])

  // 停止錄音
  const stopRecording = useCallback(() => {
    if (!recognizerRef.current?.running) return

    console.log('⏹️ 用戶停止錄音')
    recognizerRef.current.stop()

    // 立即回傳已有結果（不等待 disconnect 回調，避免重複）
    const finalText = lastFinalTextRef.current
    if (finalText) {
      onResult(finalText)
      lastFinalTextRef.current = '' // 清空避免 onDisconnected 重複回傳
    }

    setState('idle')
    cleanupTimer()
    setPartialText('')
    message.success('錄音結束')
  }, [onResult])

  const cleanupTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
  }

  // 語言切換
  const handleLanguageChange = (lang: SupportedLanguage) => {
    if (state !== 'idle') {
      message.warning('請先停止錄音')
      return
    }
    setSelectedLanguage(lang)
  }

  // 格式化錄音時長
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isRecording = state === 'listening'
  const isConnecting = state === 'connecting'

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
            disabled={disabled || state !== 'idle'}
            size="small"
            style={{ width: 120 }}
            options={[
              { value: 'zh-CN', label: '中文' },
              { value: 'en-US', label: 'English' },
            ]}
          />
        </Space>

        {/* 錄音控制按鈕 */}
        <Space>
          {!isRecording && (
            <Button
              type="primary"
              icon={<AudioOutlined />}
              onClick={startRecording}
              disabled={disabled || isConnecting}
              loading={isConnecting}
            >
              {isConnecting ? '連接中...' : '開始錄音'}
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
        </Space>

        {/* 實時識別結果預覽 */}
        {(isRecording || isConnecting) && partialText && (
          <div
            style={{
              padding: '8px 12px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 6,
              fontSize: 13,
              color: '#333',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              實時識別結果：
            </Text>
            {partialText}
          </div>
        )}

        {/* 使用提示 */}
        {state === 'idle' && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：點擊「開始錄音」即可使用語音輸入，支持實時識別
          </Text>
        )}
      </Space>
    </div>
  )
}
