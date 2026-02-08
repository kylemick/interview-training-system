/**
 * AI思考Hook
 * 简化AI調用時的思考展示管理
 */
import { useCallback } from 'react'
import { useAiThinkingStore, AiTaskType } from '../store/useAiThinkingStore'

export function useAiThinking() {
  const {
    startThinking,
    completeThinking,
    errorThinking,
    reset,
  } = useAiThinkingStore()

  /**
   * 执行带思考展示的AI調用
   */
  const executeWithThinking = useCallback(
    async <T,>(
      taskType: AiTaskType,
      asyncFn: () => Promise<T>,
      options?: {
        taskName?: string
        onSuccess?: (result: T) => void
        onError?: (error: any) => void
      }
    ): Promise<T | null> => {
      console.log('🎯 executeWithThinking 開始:', { taskType, taskName: options?.taskName })
      try {
        // 開始思考展示
        console.log('📢 調用 startThinking...')
        startThinking(taskType, options?.taskName)
        console.log('✅ startThinking 已調用')

        // 执行AI調用
        console.log('⏳ 執行 AI 調用...')
        const result = await asyncFn()
        console.log('✅ AI 調用完成:', result)

        // 完成思考展示
        console.log('📢 調用 completeThinking...')
        completeThinking()
        console.log('✅ completeThinking 已調用')

        // 执行成功回調
        if (options?.onSuccess) {
          console.log('📢 執行成功回調...')
          options.onSuccess(result)
        }

        return result
      } catch (error: any) {
        console.error('❌ executeWithThinking 錯誤:', error)
        // 显示错误
        const errorMessage =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          '操作失敗'
        console.log('📢 調用 errorThinking:', errorMessage)
        errorThinking(errorMessage)

        // 执行错误回調
        if (options?.onError) {
          console.log('📢 執行錯誤回調...')
          options.onError(error)
        }

        return null
      }
    },
    [startThinking, completeThinking, errorThinking]
  )

  return {
    executeWithThinking,
    reset,
  }
}
