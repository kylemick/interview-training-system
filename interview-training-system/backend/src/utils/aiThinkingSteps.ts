/**
 * AI思考步骤工具
 * 为不同类型的AI任务生成思考步骤模板
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
 * 获取AI任务的思考步骤模板
 */
export function getThinkingStepsTemplate(taskType: AiTaskType): string[] {
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
 * 创建思考步骤对象列表
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
 * 更新思考步骤状态
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
    // 如果当前步骤完成，下一个步骤开始处理
    if (index === stepIndex + 1 && status === 'completed') {
      return { ...step, status: 'processing' }
    }
    return step
  })
}

/**
 * 获取任务类型的中文名称
 */
export function getTaskTypeName(taskType: AiTaskType): string {
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
