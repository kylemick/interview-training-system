/**
 * AI思考状态管理
 * 使用Zustand管理全局AI思考过程展示
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

interface AiThinkingState {
  // 当前任务信息
  currentTask: {
    type: AiTaskType | null
    name: string
    steps: ThinkingStep[]
    currentStepIndex: number
  } | null

  // 组件状态
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
      '分析题目要求（类别、难度、学校特点）',
      '搜索相关知识点和参考题目',
      '生成题目内容',
      '验证题目质量和语言规范',
      '完成',
    ],
    'generate-feedback': [
      '分析学生回答内容',
      '评估语言表达质量',
      '评估内容深度和相关性',
      '识别弱点和改进点',
      '生成针对性建议',
      '完成',
    ],
    'generate-plan': [
      '分析学生信息和目标学校',
      '制定训练策略和时间分配',
      '生成每日任务安排',
      '优化时间分配和专项比例',
      '完成',
    ],
    'generate-school': [
      '搜索学校基本信息',
      '分析学校特色和面试风格',
      '整理学校关注重点',
      '生成学校档案内容',
      '完成',
    ],
    'extract-interview-memory': [
      '解析面试回忆内容',
      '提取题目和关键信息',
      '分类和标记题目',
      '识别弱点和改进点',
      '保存到数据库',
      '完成',
    ],
    'generate-learning-material': [
      '分析弱点类型和特点',
      '搜索相关学习资源',
      '生成学习素材内容',
      '优化素材结构和可读性',
      '完成',
    ],
    'save-interview-questions': [
      '验证题目数据格式',
      '检查题目重复性',
      '保存题目到数据库',
      '关联面试回忆',
      '完成',
    ],
    'save-weaknesses': [
      '分析弱点数据',
      '验证弱点类型和严重程度',
      '保存弱点到数据库',
      '更新学生弱点统计',
      '完成',
    ],
  }

  return templates[taskType] || ['处理中', '完成']
}

/**
 * 获取任务类型的中文名称
 */
function getTaskTypeName(taskType: AiTaskType): string {
  const names: Record<AiTaskType, string> = {
    'generate-questions': '生成题目',
    'generate-feedback': '生成反馈',
    'generate-plan': '生成训练计划',
    'generate-school': '生成学校档案',
    'extract-interview-memory': '提取面试回忆',
    'generate-learning-material': '生成学习素材',
    'save-interview-questions': '保存面试题目',
    'save-weaknesses': '保存弱点分析',
  }
  return names[taskType] || 'AI处理'
}

export const useAiThinkingStore = create<AiThinkingState>((set, get) => ({
  currentTask: null,
  visible: false,
  minimized: false,

  startThinking: (taskType: AiTaskType, taskName?: string) => {
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

    set({
      currentTask: {
        type: taskType,
        name: taskName || getTaskTypeName(taskType),
        steps,
        currentStepIndex: 0,
      },
      visible: true,
      minimized: false,
    })

    // 自动更新步骤（模拟AI处理过程）
    // 每2-3秒自动推进到下一步，直到最后一步
    let stepIndex = 0
    const updateInterval = setInterval(() => {
      const currentState = get()
      if (!currentState.currentTask) {
        clearInterval(updateInterval)
        return
      }

      const { steps } = currentState.currentTask
      stepIndex++

      // 如果还没到最后一步，继续推进
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
        // 到达最后一步，停止自动更新（等待completeThinking调用）
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
      // 如果当前步骤完成，下一个步骤开始处理
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

    // 标记所有步骤为完成
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

    // 3秒后自动隐藏
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
