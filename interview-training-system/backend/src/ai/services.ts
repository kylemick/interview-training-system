import { deepseekClient, DeepSeekMessage } from './deepseek.js'

/**
 * AI服務 - 封装各種AI功能
 */

/**
 * 生成訓練計劃
 */
export async function generateTrainingPlan(params: {
  targetSchool: string
  interviewDate: string
  weeklyHours: number
  currentLevel?: string
}): Promise<any> {
  const systemPrompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一個專業的香港升中面試輔導專家。請根據以下信息生成一個詳細的訓練計劃。

目標學校：${params.targetSchool}
面試日期：${params.interviewDate}
每周可用時間：${params.weeklyHours}小時
当前水平：${params.currentLevel || '未評估'}

请生成一个包含每日任務的訓練計劃，覆盖七大專項：
1. 英文口語 (english-oral)
2. 中文表達 (chinese-oral)
3. 邏輯思維 (logic-thinking)
4. 時事常識 (current-affairs)
5. 科學常識 (science-knowledge)
6. 个人成長 (personal-growth)
7. 小組討論 (group-discussion)

返回JSON格式，包含：
{
  "overview": "計劃概述",
  "dailyTasks": [
    {
      "date": "YYYY-MM-DD",
      "category": "專項類別",
      "targetCount": 題目數量,
      "focus": "重點內容"
    }
  ],
  "milestones": ["里程碑1", "里程碑2"]
}`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: '请生成訓練計劃' }
  ]

  const response = await deepseekClient.chat(messages)
  
  // 尝試解析JSON
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
 * 生成題目
 */
export async function generateQuestions(params: {
  category: string
  count: number
  difficulty?: number
  schoolCode?: string
}): Promise<any[]> {
  const categoryMap: Record<string, string> = {
    'english-oral': '英文口語',
    'chinese-oral': '中文表達',
    'logic-thinking': '邏輯思維',
    'current-affairs': '時事常識',
    'science-knowledge': '科學常識',
    'personal-growth': '个人成長',
    'group-discussion': '小組討論',
  }

  const categoryName = categoryMap[params.category] || params.category

  const systemPrompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文（英文專項除外）。

你是一個專業的香港升中面試題目設計專家。請生成${params.count}道${categoryName}類型的面試題目。

難度：${params.difficulty || 3}/5
${params.schoolCode ? `目標學校：${params.schoolCode}` : ''}

返回JSON數組格式：
[
  {
    "questionText": "題目內容",
    "referenceAnswer": "參考答案",
    "scoringCriteria": ["評分標準1", "評分標準2"]
  }
]`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请生成${params.count}道題目` }
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
  const systemPrompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一個專業的香港升中面試評審專家。請分析學生的回答並提供詳細反饋。

題目：${params.question}
學生回答：${params.answer}
專項類別：${params.category}
${params.targetSchool ? `目標學校：${params.targetSchool}` : ''}

返回JSON格式：
{
  "scores": {
    "language": 語言质量分數(0-100),
    "content": 內容深度分數(0-100),
    "relevance": 切題程度分數(0-100)
  },
  "strengths": ["優點1", "優點2"],
  "weaknesses": ["需改進1", "需改進2"],
  "suggestions": ["建議1", "建議2"],
  "referenceAnswer": "參考答案示例",
  "schoolSpecificAdvice": "針對目標學校的建議"
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
 * 從面試回憶中提取問答對
 */
export async function extractQuestionsFromMemory(params: {
  rawText: string
  schoolCode?: string
  category?: string
}): Promise<any[]> {
  const systemPrompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文（英文專項的原始問題除外）。

你是一個專業的文本分析專家。請從面試回憶文本中提取問答對。

返回JSON數組格式：
[
  {
    "question": "面試官的問題",
    "studentAnswer": "學生的回答",
    "category": "推断的專項類別",
    "difficulty": 推断的難度(1-5)
  }
]`

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `面試回憶內容：\n\n${params.rawText}` }
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
