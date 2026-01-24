import { deepseekClient, DeepSeekMessage } from './deepseek.js'

/**
 * AI服务 - 封装各种AI功能
 */

/**
 * 生成训练计划
 */
export async function generateTrainingPlan(params: {
  targetSchool: string
  interviewDate: string
  weeklyHours: number
  currentLevel?: string
}): Promise<any> {
  const systemPrompt = `你是一个专业的香港升中面试辅导专家。请根据以下信息生成一个详细的训练计划。

目标学校：${params.targetSchool}
面试日期：${params.interviewDate}
每周可用时间：${params.weeklyHours}小时
当前水平：${params.currentLevel || '未评估'}

请生成一个包含每日任务的训练计划，覆盖七大专项：
1. 英文口语 (english-oral)
2. 中文表达 (chinese-oral)
3. 逻辑思维 (logic-thinking)
4. 时事常识 (current-affairs)
5. 科学常识 (science-knowledge)
6. 个人成长 (personal-growth)
7. 小组讨论 (group-discussion)

返回JSON格式，包含：
{
  "overview": "计划概述",
  "dailyTasks": [
    {
      "date": "YYYY-MM-DD",
      "category": "专项类别",
      "targetCount": 题目数量,
      "focus": "重点内容"
    }
  ],
  "milestones": ["里程碑1", "里程碑2"]
}`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: '请生成训练计划' }
  ]

  const response = await deepseekClient.chat(messages)
  
  // 尝试解析JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', error)
  }

  return { raw: response }
}

/**
 * 生成题目
 */
export async function generateQuestions(params: {
  category: string
  count: number
  difficulty?: number
  schoolCode?: string
}): Promise<any[]> {
  const categoryMap: Record<string, string> = {
    'english-oral': '英文口语',
    'chinese-oral': '中文表达',
    'logic-thinking': '逻辑思维',
    'current-affairs': '时事常识',
    'science-knowledge': '科学常识',
    'personal-growth': '个人成长',
    'group-discussion': '小组讨论',
  }

  const categoryName = categoryMap[params.category] || params.category

  const systemPrompt = `你是一个专业的香港升中面试题目设计专家。请生成${params.count}道${categoryName}类型的面试题目。

难度：${params.difficulty || 3}/5
${params.schoolCode ? `目标学校：${params.schoolCode}` : ''}

返回JSON数组格式：
[
  {
    "questionText": "题目内容",
    "referenceAnswer": "参考答案",
    "scoringCriteria": ["评分标准1", "评分标准2"]
  }
]`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请生成${params.count}道题目` }
  ]

  const response = await deepseekClient.chat(messages)
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', error)
  }

  return []
}

/**
 * 分析答案并生成反馈
 */
export async function analyzeFeedback(params: {
  question: string
  answer: string
  category: string
  targetSchool?: string
}): Promise<any> {
  const systemPrompt = `你是一个专业的香港升中面试评审专家。请分析学生的回答并提供详细反馈。

题目：${params.question}
学生回答：${params.answer}
专项类别：${params.category}
${params.targetSchool ? `目标学校：${params.targetSchool}` : ''}

返回JSON格式：
{
  "scores": {
    "language": 语言质量分数(0-100),
    "content": 内容深度分数(0-100),
    "relevance": 切题程度分数(0-100)
  },
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["需改进1", "需改进2"],
  "suggestions": ["建议1", "建议2"],
  "referenceAnswer": "参考答案示例",
  "schoolSpecificAdvice": "针对目标学校的建议"
}`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: '请分析并提供反馈' }
  ]

  const response = await deepseekClient.chat(messages)
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', error)
  }

  return { raw: response }
}

/**
 * 从面试回忆中提取问答对
 */
export async function extractQuestionsFromMemory(params: {
  rawText: string
  schoolCode?: string
  category?: string
}): Promise<any[]> {
  const systemPrompt = `你是一个专业的文本分析专家。请从面试回忆文本中提取问答对。

返回JSON数组格式：
[
  {
    "question": "面试官的问题",
    "studentAnswer": "学生的回答",
    "category": "推断的专项类别",
    "difficulty": 推断的难度(1-5)
  }
]`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `面试回忆内容：\n\n${params.rawText}` }
  ]

  const response = await deepseekClient.chat(messages)
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', error)
  }

  return []
}
