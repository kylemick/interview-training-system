/**
 * AI思考Hook
 * 简化AI调用时的思考展示管理
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
   * 执行带思考展示的AI调用
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
      try {
        // 开始思考展示
        startThinking(taskType, options?.taskName)

        // 执行AI调用
        const result = await asyncFn()

        // 完成思考展示
        completeThinking()

        // 执行成功回调
        if (options?.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (error: any) {
        // 显示错误
        const errorMessage =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          '操作失败'
        errorThinking(errorMessage)

        // 执行错误回调
        if (options?.onError) {
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
