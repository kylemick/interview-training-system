/**
 * AI思考步骤工具
 * 为不同類型的AI任務生成思考步骤模板
 */

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

/**
 * 获取AI任務的思考步骤模板
 */
export function getThinkingStepsTemplate(taskType: AiTaskType): string[] {
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
  }

  return templates[taskType] || ['处理中', '完成']
}

/**
 * 創建思考步骤對象列表
 */
export function createThinkingSteps(taskType: AiTaskType): ThinkingStep[] {
  const steps = getThinkingStepsTemplate(taskType)
  return steps.map((text, index) => ({
    id: `step-${index}`,
    text,
    status: index === 0 ? 'processing' : 'pending',
  }))
}

/**
 * 更新思考步骤狀態
 */
export function updateThinkingStep(
  steps: ThinkingStep[],
  stepIndex: number,
  status: ThinkingStepStatus
): ThinkingStep[] {
  return steps.map((step, index) => {
    if (index === stepIndex) {
      return { ...step, status }
    }
    // 如果当前步骤完成，下一个步骤開始处理
    if (index === stepIndex + 1 && status === 'completed') {
      return { ...step, status: 'processing' }
    }
    return step
  })
}

/**
 * 获取任務類型的中文名称
 */
export function getTaskTypeName(taskType: AiTaskType): string {
  const names: Record<AiTaskType, string> = {
    'generate-questions': '生成題目',
    'generate-feedback': '生成反馈',
    'generate-plan': '生成訓練計劃',
    'generate-school': '生成學校檔案',
    'extract-interview-memory': '提取面試回憶',
    'generate-learning-material': '生成學習素材',
    'save-interview-questions': '保存面試題目',
    'save-weaknesses': '保存弱點分析',
  }
  return names[taskType] || 'AI处理'
}
