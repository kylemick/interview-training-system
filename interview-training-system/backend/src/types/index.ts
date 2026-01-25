// 专项类别
export type Category =
  | 'english-oral'
  | 'chinese-oral'
  | 'logic-thinking'
  | 'current-affairs'
  | 'science-knowledge'
  | 'personal-growth'
  | 'group-discussion'
  | 'chinese-reading'   // 中文阅读理解
  | 'english-reading'   // 英文阅读理解
  | 'mathematics'       // 数学基础
  | 'science-practice'  // 科学实践

// 难度等级
export type Difficulty = 1 | 2 | 3 | 4 | 5

// 学校代码
export type SchoolCode = 'SPCC' | 'QC' | 'LSC' | 'DGS' | 'DBS' | string

// 学校特征
export interface SchoolProfile {
  id: string
  schoolCode: string
  schoolName: string
  schoolType?: string
  interviewFormat?: any
  focusAreas?: string[]
  scoringStandards?: any
  createdAt: string
  updatedAt: string
}

// 题目
export interface Question {
  id: string
  category: Category
  difficulty: Difficulty
  schoolTags?: string[]
  questionText: string
  referenceAnswer?: string
  scoringCriteria?: any
  source?: 'manual' | 'ai-generated' | 'interview-memory'
  createdAt: string
  updatedAt: string
}

// 训练计划
export interface TrainingPlan {
  id: string
  studentName?: string
  targetSchool: string
  startDate: string
  interviewDate?: string
  weeklyHours?: number
  metadata?: any
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

// 每日任务
export interface DailyTask {
  id: string
  planId: string
  date: string
  category: Category
  targetCount: number
  completedCount: number
  status: 'pending' | 'in_progress' | 'completed'
}

// 训练会话
export interface Session {
  id: string
  planId?: string
  taskId?: string
  category: Category
  mode?: 'text-qa' | 'ai-interview'
  startedAt: string
  completedAt?: string
  totalQuestions: number
  status: 'in_progress' | 'completed' | 'paused'
}

// 问答记录
export interface QARecord {
  id: string
  sessionId: string
  questionId?: string
  questionText: string
  studentAnswer: string
  aiFeedback?: any
  scores?: {
    language?: number
    content?: number
    relevance?: number
  }
  createdAt: string
}

// 会话总结
export interface SessionSummary {
  id: string
  sessionId: string
  overallScore?: number
  strengths?: string[]
  weaknesses?: string[]
  suggestions?: string[]
  schoolSpecificAdvice?: string
  createdAt: string
}

// API响应
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
}
