/**
 * AI思考狀態管理
 * 使用Zustand管理全局AI思考過程展示
 */
import { create } from 'zustand'

export type ThinkingStepStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface ThinkingStep {
  id: string
  text: string
  status: ThinkingStepStatus
}

export type AiTaskType =
  | 'generate-questions'
  | 'generate-feedback'
  | 'generate-plan'
  | 'generate-school'
  | 'extract-interview-memory'
  | 'generate-learning-material'
  | 'save-interview-questions'
  | 'save-weaknesses'
  | 'create-session'

interface AiThinkingState {
  // 当前任務信息
  currentTask: {
    type: AiTaskType | null
    name: string
    steps: ThinkingStep[]
    currentStepIndex: number
  } | null

  // 組件狀態
  visible: boolean
  minimized: boolean

  // Actions
  startThinking: (taskType: AiTaskType, taskName?: string) => void
  updateStep: (stepIndex: number, status: ThinkingStepStatus) => void
  nextStep: () => void
  completeThinking: () => void
  errorThinking: (errorMessage: string) => void
  show: () => void
  hide: () => void
  toggleMinimize: () => void
  reset: () => void
}

/**
 * 获取思考步骤模板
 */
function getThinkingStepsTemplate(taskType: AiTaskType): string[] {
  const templates: Record<AiTaskType, string[]> = {
    'generate-questions': [
      '分析題目要求（類別、難度、學校特點）',
      '搜索相關知識點和參考題目',
      '生成題目內容',
      '验证題目质量和語言規范',
      '完成',
    ],
    'generate-feedback': [
      '分析學生回答內容',
      '評估語言表達质量',
      '評估內容深度和相關性',
      '識別弱點和改進點',
      '生成針對性建議',
      '完成',
    ],
    'generate-plan': [
      '分析學生信息和目標學校',
      '制定訓練策略和時間分配',
      '生成每日任務安排',
      '優化時間分配和專項比例',
      '完成',
    ],
    'generate-school': [
      '搜索學校基本信息',
      '分析學校特色和面試風格',
      '整理學校關注重點',
      '生成學校檔案內容',
      '完成',
    ],
    'extract-interview-memory': [
      '解析面試回憶內容',
      '提取題目和關键信息',
      '分類和標記題目',
      '識別弱點和改進點',
      '保存到數據庫',
      '完成',
    ],
    'generate-learning-material': [
      '分析弱點類型和特點',
      '搜索相關學習資源',
      '生成學習素材內容',
      '優化素材結构和可读性',
      '完成',
    ],
    'save-interview-questions': [
      '验证題目數據格式',
      '检查題目重复性',
      '保存題目到數據庫',
      '關聯面試回憶',
      '完成',
    ],
    'save-weaknesses': [
      '分析弱點數據',
      '验证弱點類型和嚴重程度',
      '保存弱點到數據庫',
      '更新學生弱點統計',
      '完成',
    ],
    'create-session': [
      '檢查題目可用性',
      '生成所需題目（如需要）',
      '創建練習會話',
      '加載題目列表',
      '完成',
    ],
  }

  return templates[taskType] || ['处理中', '完成']
}

/**
 * 获取任務類型的中文名称
 */
function getTaskTypeName(taskType: AiTaskType): string {
  const names: Record<AiTaskType, string> = {
    'generate-questions': '生成題目',
    'generate-feedback': '生成反馈',
    'generate-plan': '生成訓練計劃',
    'generate-school': '生成學校檔案',
    'extract-interview-memory': '提取面試回憶',
    'generate-learning-material': '生成學習素材',
    'save-interview-questions': '保存面試題目',
    'save-weaknesses': '保存弱點分析',
    'create-session': '創建練習會話並生成題目',
  }
  return names[taskType] || 'AI处理'
}

export const useAiThinkingStore = create<AiThinkingState>((set, get) => ({
  currentTask: null,
  visible: false,
  minimized: false,

  startThinking: (taskType: AiTaskType, taskName?: string) => {
    console.log('🎬 startThinking 被調用:', { taskType, taskName })
    const steps = getThinkingStepsTemplate(taskType).map((text, index) => ({
      id: `step-${index}`,
      text,
      status: (index === 0 ? 'processing' : 'pending') as ThinkingStepStatus,
    }))

    // 清理之前的interval
    const state = get() as any
    if (state.updateInterval) {
      clearInterval(state.updateInterval)
    }

    const finalTaskName = taskName || getTaskTypeName(taskType)
    console.log('✅ 設置思考狀態:', {
      taskType,
      taskName: finalTaskName,
      stepsCount: steps.length,
      visible: true
    })

    set({
      currentTask: {
        type: taskType,
        name: finalTaskName,
        steps,
        currentStepIndex: 0,
      },
      visible: true,
      minimized: false,
    })
    
    console.log('✅ 思考狀態已設置，浮窗應該顯示')

    // 自動更新步骤（模拟AI处理過程）
    // 每2-3秒自動推進到下一步，直到最後一步
    let stepIndex = 0
    const updateInterval = setInterval(() => {
      const currentState = get()
      if (!currentState.currentTask) {
        clearInterval(updateInterval)
        return
      }

      const { steps } = currentState.currentTask
      stepIndex++

      // 如果还没到最後一步，继续推進
      if (stepIndex < steps.length - 1) {
        set({
          currentTask: {
            ...currentState.currentTask,
            currentStepIndex: stepIndex,
            steps: steps.map((step, idx) => ({
              ...step,
              status:
                idx < stepIndex
                  ? 'completed'
                  : idx === stepIndex
                    ? 'processing'
                    : 'pending',
            })),
          },
        })
      } else {
        // 到達最後一步，停止自動更新（等待completeThinking調用）
        clearInterval(updateInterval)
        ;(get() as any).updateInterval = null
      }
    }, 2500) // 每2.5秒更新一次

    // 存储interval ID以便清理
    ;(get() as any).updateInterval = updateInterval
  },

  updateStep: (stepIndex: number, status: ThinkingStepStatus) => {
    const state = get()
    if (!state.currentTask) return

    const { steps } = state.currentTask
    const updatedSteps = steps.map((step, idx) => {
      if (idx === stepIndex) {
        return { ...step, status }
      }
      // 如果当前步骤完成，下一个步骤開始处理
      if (idx === stepIndex + 1 && status === 'completed') {
        return { ...step, status: 'processing' as ThinkingStepStatus }
      }
      return step
    })

    set({
      currentTask: {
        ...state.currentTask,
        steps: updatedSteps,
        currentStepIndex: status === 'completed' ? stepIndex + 1 : stepIndex,
      },
    })
  },

  nextStep: () => {
    const state = get()
    if (!state.currentTask) return

    const { currentStepIndex, steps } = state.currentTask
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1
      set({
        currentTask: {
          ...state.currentTask,
          currentStepIndex: nextIndex,
          steps: steps.map((step, idx) => ({
            ...step,
            status:
              idx < nextIndex
                ? 'completed'
                : idx === nextIndex
                  ? 'processing'
                  : 'pending',
          })),
        },
      })
    }
  },

  completeThinking: () => {
    const state = get()
    if (!state.currentTask) return

    // 清理interval
    const stateAny = state as any
    if (stateAny.updateInterval) {
      clearInterval(stateAny.updateInterval)
      stateAny.updateInterval = null
    }

    // 標記所有步骤为完成
    const completedSteps = state.currentTask.steps.map((step) => ({
      ...step,
      status: 'completed' as ThinkingStepStatus,
    }))

    set({
      currentTask: {
        ...state.currentTask,
        steps: completedSteps,
        currentStepIndex: completedSteps.length - 1,
      },
    })

    // 3秒後自動隐藏
    setTimeout(() => {
      get().hide()
    }, 3000)
  },

  errorThinking: (errorMessage: string) => {
    const state = get()
    if (!state.currentTask) return

    // 添加错误步骤
    const errorStep: ThinkingStep = {
      id: 'error',
      text: `错误: ${errorMessage}`,
      status: 'error',
    }

    set({
      currentTask: {
        ...state.currentTask,
        steps: [...state.currentTask.steps, errorStep],
      },
    })
  },

  show: () => set({ visible: true }),
  hide: () => {
    // 清理interval
    const state = get() as any
    if (state.updateInterval) {
      clearInterval(state.updateInterval)
      state.updateInterval = null
    }
    set({ visible: false, minimized: false })
  },
  toggleMinimize: () => set((state) => ({ minimized: !state.minimized })),
  reset: () => {
    const state = get() as any
    if (state.updateInterval) {
      clearInterval(state.updateInterval)
      state.updateInterval = null
    }
    set({
      currentTask: null,
      visible: false,
      minimized: false,
    })
  },
}))
