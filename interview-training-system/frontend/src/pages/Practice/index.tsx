import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Select,
  Radio,
  Input,
  Progress,
  message,
  Modal,
  Tag,
  Divider,
  Empty,
  Alert,
} from 'antd'
import {
  BookOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  FireOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../utils/api'
import VoiceInput from '../../components/VoiceInput'
import { useAiThinking } from '../../hooks/useAiThinking'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 七大專項類別
const CATEGORIES = [
  { value: 'english-oral', label: '英文口語' },
  { value: 'chinese-oral', label: '中文表達' },
  { value: 'chinese-expression', label: '中文表達', deprecated: true }, // 兼容舊值
  { value: 'logic-thinking', label: '邏輯思維' },
  { value: 'logical-thinking', label: '邏輯思維', deprecated: true }, // 兼容舊值
  { value: 'current-affairs', label: '時事常識' },
  { value: 'science-knowledge', label: '科學常識' },
  { value: 'personal-growth', label: '个人成長' },
  { value: 'group-discussion', label: '小組討論' },
];

// 四个學科能力類別
const SUBJECT_CATEGORIES = [
  { value: 'chinese-reading', label: '中文阅读理解' },
  { value: 'english-reading', label: '英文阅读理解' },
  { value: 'mathematics', label: '數學基础' },
  { value: 'science-practice', label: '科學实践' },
];

// 所有類別（七大專項 + 四个學科能力）
const ALL_CATEGORIES = [...CATEGORIES.filter(c => !c.deprecated), ...SUBJECT_CATEGORIES];

interface Question {
  id: string
  question_text: string
  category: string
  difficulty?: string
  reference_answer?: string
}

interface SessionData {
  session_id: string
  question_ids: string[]
  status?: 'in_progress' | 'completed' // 會話狀態
}

interface AIFeedback {
  score?: number
  strengths?: string
  weaknesses?: string
  suggestions?: string
  reference_answer?: string
  reference_thinking?: string
}

interface TaskInfo {
  task_id: string
  category: string
  duration: number
  student_name: string
  target_school: string
  task_date?: string
  plan_id?: string
  plan_name?: string
}

export default function Practice() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const taskId = searchParams.get('taskId')
  const { executeWithThinking } = useAiThinking()

  // 狀態管理
  const [practiceMode, setPracticeMode] = useState<'task' | 'free' | 'weakness' | 'school-round'>(taskId ? 'task' : 'free')
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [step, setStep] = useState<'select' | 'practice'>('select')
  const [category, setCategory] = useState<string>('')
  const [questionCount, setQuestionCount] = useState(10)
  const [mode, setMode] = useState<'text_qa' | 'ai_interview'>('text_qa')
  // 弱點專項練習相關
  const [selectedWeaknessId, setSelectedWeaknessId] = useState<number | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)
  const [weaknesses, setWeaknesses] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loadingWeaknesses, setLoadingWeaknesses] = useState(false)
  // 學校-輪次模拟面試相關
  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string>('')
  const [selectedInterviewRound, setSelectedInterviewRound] = useState<string>('')
  const [schools, setSchools] = useState<any[]>([])
  const [loadingSchools, setLoadingSchools] = useState(false)

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<number, AIFeedback>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [targetSchool, setTargetSchool] = useState<string>('SPCC') // 默认值，從设置中加载

  // 继续现有會話（加载已提交的答案和反馈）
  const _continueExistingSession = async (sessionId: string, targetQuestionId?: number) => {
    try {
      setLoading(true)
      message.loading({ content: '正在加载會話详情...', key: 'loading', duration: 0 })

      // 获取會話详情
      const sessionRes = await api.sessions.get(sessionId)
      const sessionData = sessionRes.success ? sessionRes.data : null

      if (!sessionData || !sessionData.session) {
        throw new Error('會話數據格式错误')
      }

      const session = sessionData.session
      const qaRecords = sessionData.qa_records || []

      // 從會話中获取保存的題目ID列表（这是會話創建時選擇的完整題目列表）
      let questionIds: number[] = []
      
      // 優先從會話的 question_ids 字段获取（如果後端返回了）
      if (sessionData.question_ids && Array.isArray(sessionData.question_ids)) {
        questionIds = sessionData.question_ids as number[]
      } else if (session.question_ids) {
        // 如果後端没有解析，尝試從 session 對象中获取
        try {
          const parsed = typeof session.question_ids === 'string'
            ? JSON.parse(session.question_ids)
            : session.question_ids
          if (Array.isArray(parsed)) {
            questionIds = parsed as number[]
          }
        } catch (e) {
          console.warn('解析會話題目ID列表失敗:', e)
        }
      }
      
      // 如果會話中没有保存題目ID，從 qa_records 中提取（兼容舊數據）
      if (questionIds.length === 0) {
        const answeredQuestionIds = qaRecords.map((r: any) => r.question_id).filter(Boolean) as number[]
        questionIds = [...new Set(answeredQuestionIds)]
      }
      
      if (questionIds.length === 0) {
        throw new Error('會話中没有題目，请重新開始練習')
      }

      // 获取題目详情
      const questionsRes = await api.questions.list({
        ids: questionIds.join(','),
        limit: questionIds.length,
      })

      const allQuestions = questionsRes.success ? questionsRes.data : []
      
      if (allQuestions.length === 0) {
        throw new Error('无法加载題目，请刷新页面重試')
      }

      // 按會話保存的題目ID顺序构建題目列表（这是會話創建時選擇的完整題目列表）
      // 同時加载答案和反馈，確保索引匹配
      const sortedQuestions: Question[] = []
      const loadedAnswers: Record<number, string> = {}
      const loadedFeedbacks: Record<number, AIFeedback> = {}
      
      // 先收集每个題目的最新記錄（按 created_at 排序，取最新的）
      // 確保類型匹配：統一转换为數字進行比较
      const latestRecordsByQuestion = new Map<number, any>()
      qaRecords.forEach((record: any) => {
        if (record.question_id !== null && record.question_id !== undefined) {
          const recordQuestionId = typeof record.question_id === 'string' 
            ? parseInt(record.question_id, 10) 
            : record.question_id
          if (!isNaN(recordQuestionId)) {
            const existing = latestRecordsByQuestion.get(recordQuestionId)
            if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
              latestRecordsByQuestion.set(recordQuestionId, record)
            }
          }
        }
      })
      
      // 按會話保存的題目ID顺序构建題目列表
      // 注意：allQuestions 应该已经按照 questionIds 的顺序返回（因为 API 使用了 FIELD 排序）
      // 但为了確保顺序正確，我们仍然按照 questionIds 的顺序來构建
      console.log(`📋 開始构建題目列表: questionIds=${JSON.stringify(questionIds)}, allQuestions.length=${allQuestions.length}`)
      console.log(`📋 allQuestions 顺序:`, allQuestions.map((q: any) => {
        const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
        return qId
      }))
      
      // 創建一个 Map 以便快速查找
      const questionMap = new Map<number, any>()
      allQuestions.forEach((q: any) => {
        const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
        if (!isNaN(qId)) {
          questionMap.set(qId, q)
        }
      })
      
      for (let i = 0; i < questionIds.length; i++) {
        const questionId = questionIds[i]
        // 確保類型匹配：questionId 可能是數字或字符串
        const qIdNum = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId
        if (isNaN(qIdNum)) {
          console.warn(`⚠️ 无效的 questionId: ${questionId}`)
          continue
        }
        
        // 從 Map 中查找題目（更快且確保類型匹配）
        const question = questionMap.get(qIdNum)
        
        if (question) {
          const questionIndex = sortedQuestions.length
          sortedQuestions.push(question)
          console.log(`✅ 添加題目到列表: index=${questionIndex}, question_id=${qIdNum}, question_text=${question.question_text.substring(0, 50)}...`)
          
          // 验证索引是否正確
          if (questionIndex !== i) {
            console.warn(`⚠️  索引不匹配！期望 index=${i}，实际 index=${questionIndex}`)
          }
          
          // 加载该題目的答案和反馈（如果有）
          // 使用數字類型的 questionId 來查找記錄
          const latestRecord = latestRecordsByQuestion.get(qIdNum)
          if (latestRecord) {
            // 加载答案（使用最新的答案）
            if (latestRecord.answer_text) {
              loadedAnswers[questionIndex] = latestRecord.answer_text
            }
            
            // 加载反馈（使用最新的反馈）
            if (latestRecord.ai_feedback) {
              try {
                const feedback = typeof latestRecord.ai_feedback === 'string' 
                  ? JSON.parse(latestRecord.ai_feedback) 
                  : latestRecord.ai_feedback
                if (feedback && typeof feedback === 'object') {
                  loadedFeedbacks[questionIndex] = feedback
                }
              } catch (e) {
                console.warn('解析反馈失敗:', latestRecord.id, e)
              }
            }
          } else {
            // 調試日志：記錄没有找到記錄的題目
            console.log(`⚠️ 題目 ${qIdNum} (索引 ${questionIndex}) 没有找到對应的 qa_record`)
          }
        } else {
          console.warn(`⚠️ 題目 ID ${qIdNum} 在題庫中不存在`)
        }
      }

      // 確保有題目才能继续
      if (sortedQuestions.length === 0) {
        throw new Error('无法加载題目，请刷新页面重試')
      }

      // 確定要跳转到的題目索引
      let targetIndex = -1
      
      // 如果指定了 targetQuestionId，必须定位到该題目（不回退到其他題目）
      if (targetQuestionId) {
        console.log(`🔍 開始定位題目: targetQuestionId=${targetQuestionId} (類型: ${typeof targetQuestionId})`)
        console.log(`📋 題目列表:`, sortedQuestions.map((q: Question) => {
          const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
          return { id: qId, idType: typeof q.id, idRaw: q.id }
        }))
        
        targetIndex = sortedQuestions.findIndex((q: Question) => {
          const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
          const match = qId === targetQuestionId
          if (match) {
            console.log(`✅ 匹配成功: question.id=${qId} === targetQuestionId=${targetQuestionId}`)
          }
          return match
        })
        
        if (targetIndex >= 0) {
          const matchedQuestion = sortedQuestions[targetIndex]
          const matchedQId = typeof matchedQuestion.id === 'string' ? parseInt(matchedQuestion.id, 10) : matchedQuestion.id
          console.log(`✅ 定位到指定題目: question_id=${matchedQId}, index=${targetIndex}, question_text=${matchedQuestion.question_text.substring(0, 50)}...`)
        } else {
          console.warn(`⚠️ 指定的題目 ID ${targetQuestionId} 在題目列表中未找到`)
          console.warn(`   可用的 question_ids:`, sortedQuestions.map((q: Question) => {
            const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
            return qId
          }))
          // 如果找不到指定的題目，定位到第一題（而不是第一个未完成的）
          targetIndex = 0
          console.log(`📍 未找到指定題目，定位到第一題: index=${targetIndex}`)
        }
      } else {
        // 如果没有指定 question_id，找到第一个未完成的題目索引
        targetIndex = sortedQuestions.findIndex((_: any, index: number) => !loadedAnswers[index])
        if (targetIndex >= 0) {
          console.log(`📍 定位到第一个未完成的題目: index=${targetIndex}`)
        } else {
          // 如果都完成了，定位到最後一題
          targetIndex = sortedQuestions.length - 1
          console.log(`📍 所有題目已完成，定位到最後一題: index=${targetIndex}`)
        }
      }

      // 先设置所有狀態，確保页面正確渲染
      setSessionData({
        session_id: session.id,
        question_ids: sortedQuestions.map((q: any) => q.id),
        status: session.status || 'in_progress', // 保存會話狀態
      })
      setQuestions(sortedQuestions)
      setTaskInfo(sessionData.task_info || null)
      setCategory(session.category)
      // 最终验证：確保定位的題目是正確的
      if (targetIndex >= 0 && targetIndex < sortedQuestions.length) {
        const finalQuestion = sortedQuestions[targetIndex]
        const finalQId = typeof finalQuestion.id === 'string' ? parseInt(finalQuestion.id, 10) : finalQuestion.id
        console.log(`🎯 最终定位結果: index=${targetIndex}, question_id=${finalQId}, question_text=${finalQuestion.question_text.substring(0, 50)}...`)
        
        if (targetQuestionId && finalQId !== targetQuestionId) {
          console.error(`❌ 定位错误！期望 question_id=${targetQuestionId}，但定位到了 question_id=${finalQId}`)
          // 尝試重新定位
          const correctIndex = sortedQuestions.findIndex((q: Question) => {
            const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
            return qId === targetQuestionId
          })
          if (correctIndex >= 0) {
            console.log(`🔧 修正定位: index=${correctIndex}`)
            targetIndex = correctIndex
          }
        }
      }
      
      setCurrentIndex(targetIndex)
      setAnswers(loadedAnswers)
      setFeedbacks(loadedFeedbacks)
      
      // 確保 step 设置为 practice，让页面跳转到題目页面
      setStep('practice')

      message.success({
        content: `已恢复會話，共 ${sortedQuestions.length} 題，已完成 ${Object.keys(loadedAnswers).length} 題`,
        key: 'loading',
        duration: 2
      })
      
      // 調試信息
      console.log('已恢复會話:', {
        sessionId: session.id,
        totalQuestions: sortedQuestions.length,
        answeredCount: Object.keys(loadedAnswers).length,
        feedbackCount: Object.keys(loadedFeedbacks).length,
        targetQuestionId: targetQuestionId || '未指定',
        finalIndex: targetIndex,
        finalQuestionId: targetIndex >= 0 ? (typeof sortedQuestions[targetIndex]?.id === 'string' ? parseInt(sortedQuestions[targetIndex].id, 10) : sortedQuestions[targetIndex]?.id) : 'N/A',
        questionIds: sortedQuestions.map((q: Question) => {
          const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
          return qId
        }),
        answers: loadedAnswers,
        feedbacks: Object.keys(loadedFeedbacks).map(i => ({ index: i, hasFeedback: !!loadedFeedbacks[Number(i)] }))
      })
    } catch (error: any) {
      console.error('加载會話详情失敗:', error)
      message.error({
        content: error.message || '加载會話详情失敗，请刷新页面重試',
        key: 'loading',
        duration: 3
      })
      // 如果加载失敗，返回選擇页面
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  // 從任務開始練習
  const startTaskPractice = async (taskId: string) => {
    try {
      setLoading(true)
      message.loading({ content: '正在加载任務...', key: 'loading' })

      // 調用API，後端會自動处理：如果有现有會話就返回，没有就創建
      // 不指定question_count，让後端根據任務duration自動計算
      const response = await api.plans.startTaskPractice(taskId, {})

      // api.plans.startTaskPractice 返回的是 apiClient.post().then(res => res.data)
      // 後端返回: { success: true, data: { session_id, questions, is_existing, ... } }
      const data = response.success ? response.data : (response.data || response)
      
      if (!data || !data.session_id) {
        console.error('响应數據格式错误:', { response, data })
        throw new Error('响应數據格式错误，请刷新页面重試')
      }
      
      // 確保 questions 是數組
      if (!Array.isArray(data.questions)) {
        console.error('questions 不是數組:', data)
        throw new Error('題目數據格式错误，请刷新页面重試')
      }

      // 如果是现有會話，需要加载已提交的答案和反馈
      if (data.is_existing) {
        // 检查會話是否已完成
        const isCompleted = data.is_completed || data.session_status === 'completed'
        
        // 後端已经返回了題目，但需要加载已提交的答案和反馈
        // 先设置題目和會話信息
        setSessionData({
          session_id: data.session_id,
          question_ids: data.questions.map((q: any) => q.id),
          status: isCompleted ? 'completed' : 'in_progress', // 保存會話狀態
        })
        setQuestions(data.questions)
        setTaskInfo(data.task_info || null)
        setCategory(data.task_info?.category || data.category || '')
        
        // 然後加载已提交的答案和反馈
        try {
          const sessionRes = await api.sessions.get(String(data.session_id))
          const sessionData = sessionRes.success ? sessionRes.data : null
          
          if (sessionData && sessionData.qa_records) {
            const qaRecords = sessionData.qa_records || []
            const loadedAnswers: Record<number, string> = {}
            const loadedFeedbacks: Record<number, AIFeedback> = {}
            
            // 按題目ID匹配答案和反馈
            data.questions.forEach((question: Question, index: number) => {
              // 確保類型匹配：question.id 可能是字符串或數字，需要統一转换
              const questionId = typeof question.id === 'string' ? parseInt(question.id, 10) : question.id
              
              // 找到该題目的最新記錄（確保類型匹配）
              const records = qaRecords.filter((r: any) => {
                const recordQuestionId = typeof r.question_id === 'string' 
                  ? parseInt(r.question_id, 10) 
                  : r.question_id
                return !isNaN(questionId) && !isNaN(recordQuestionId) && recordQuestionId === questionId
              })
              
              if (records.length > 0) {
                // 取最新的記錄
                const latestRecord = records.reduce((latest: any, current: any) => {
                  return new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                })
                
                if (latestRecord.answer_text) {
                  loadedAnswers[index] = latestRecord.answer_text
                }
                
                if (latestRecord.ai_feedback) {
                  try {
                    const feedback = typeof latestRecord.ai_feedback === 'string' 
                      ? JSON.parse(latestRecord.ai_feedback) 
                      : latestRecord.ai_feedback
                    if (feedback && typeof feedback === 'object') {
                      loadedFeedbacks[index] = feedback
                    }
                  } catch (e) {
                    console.warn('解析反馈失敗:', latestRecord.id, e)
                  }
                }
              } else {
                // 調試日志：記錄没有找到記錄的題目
                console.log(`⚠️ 題目 ${questionId} (索引 ${index}) 没有找到對应的 qa_record`)
              }
            })
            
            setAnswers(loadedAnswers)
            setFeedbacks(loadedFeedbacks)
            
            // 如果會話已完成，显示所有題目（從第一題開始）
            // 如果會話進行中，找到第一个未完成的題目索引
            if (isCompleted) {
              setCurrentIndex(0) // 已完成會話，從第一題開始查看
            } else {
              // 找到第一个没有答案的題目索引
              // 使用已加载的 answers 來判断，因为 answers 是按索引存储的
              const firstUnansweredIndex = data.questions.findIndex((_question: Question, index: number) => {
                // 检查该索引位置是否有答案
                return !loadedAnswers[index]
              })
              setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : data.questions.length - 1)
              
              // 調試日志
              if (firstUnansweredIndex >= 0) {
                const unansweredQuestion = data.questions[firstUnansweredIndex]
                const questionId = typeof unansweredQuestion.id === 'string' 
                  ? parseInt(unansweredQuestion.id, 10) 
                  : unansweredQuestion.id
                console.log(`📍 定位到第一个未完成的題目: 索引=${firstUnansweredIndex}, question_id=${questionId}`)
              }
            }
          } else {
            setCurrentIndex(0)
            setAnswers({})
            setFeedbacks({})
          }
        } catch (error) {
          console.warn('加载會話详情失敗，使用默认狀態:', error)
          setCurrentIndex(0)
          setAnswers({})
          setFeedbacks({})
        }
        
        setStep('practice')
        message.success({ 
          content: isCompleted 
            ? `查看已完成的練習記錄（共 ${data.questions?.length || 0} 題）` 
            : `继续練習！共 ${data.questions?.length || 0} 題`, 
          key: 'loading',
          duration: 2
        })
        return
      }

      // 新創建的會話，直接设置狀態
      setSessionData({
        session_id: data.session_id,
        question_ids: data.questions.map((q: any) => q.id),
        status: 'in_progress', // 新創建的會話狀態为進行中
      })
      setQuestions(data.questions)
      setTaskInfo(data.task_info || null)
      setCategory(data.task_info?.category || data.category || '')
      setCurrentIndex(0)
      setAnswers({})
      setFeedbacks({})
      setStep('practice')
      
      message.success({ 
        content: `任務練習開始！共 ${data.questions?.length || 0} 題`, 
        key: 'loading',
        duration: 2
      })
    } catch (error: any) {
      console.error('從任務開始練習失敗:', error)
      const errorMsg = error.response?.data?.message || error.message || '開始練習失敗'
      message.error({ content: errorMsg, key: 'loading' })
    } finally {
      setLoading(false)
    }
  }

  // 任務模式: 自動加载任務并開始練習
  // 加载用户设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.settings.get()
        if (response.success && response.data?.target_school) {
          setTargetSchool(response.data.target_school)
        }
      } catch (error) {
        console.error('加载设置失敗:', error)
        // 使用默认值，不显示错误提示
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (taskId && practiceMode === 'task') {
      startTaskPractice(taskId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  // 检查是否有 session 參數，如果有則恢复會話
  useEffect(() => {
    const sessionId = searchParams.get('session')
    const questionIdParam = searchParams.get('question')
    
    if (sessionId && !sessionData) {
      // 如果有 session 參數但没有 sessionData，尝試恢复會話
      console.log('检测到 session 參數，尝試恢复會話:', sessionId, questionIdParam ? `question=${questionIdParam}` : '')
      // 使用 _continueExistingSession 函數，并傳递 question_id（如果有）
      _continueExistingSession(sessionId, questionIdParam ? parseInt(questionIdParam, 10) : undefined).catch((error) => {
        console.error('恢复會話失敗:', error)
        message.error('恢复會話失敗，请刷新页面重試')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 加载弱點列表
  const loadWeaknesses = async () => {
    try {
      setLoadingWeaknesses(true);
      const res = await api.weaknesses.list({ status: 'active' });
      if (res.success) {
        setWeaknesses(res.data || []);
      }
    } catch (error) {
      console.error('加载弱點列表失敗:', error);
    } finally {
      setLoadingWeaknesses(false);
    }
  };

  // 加载學校列表
  const loadSchools = async () => {
    try {
      setLoadingSchools(true);
      const res = await api.schools.list();
      if (res.success) {
        setSchools(res.data || []);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载學校列表失敗');
    } finally {
      setLoadingSchools(false);
    }
  };

  // 加载弱點關聯的素材
  const loadMaterialsForWeakness = async (weaknessId: number) => {
    try {
      const res = await api.learningMaterials.getByWeakness(weaknessId);
      if (res.success) {
        setMaterials(res.data || []);
      }
    } catch (error) {
      console.error('加载學習素材失敗:', error);
    }
  };

  // 開始弱點專項練習
  const startWeaknessPractice = async () => {
    if (!selectedWeaknessId) {
      message.warning('请選擇弱點');
      return;
    }

    try {
      setLoading(true);

      // 1. 基于弱點生成針對性題目
      await executeWithThinking(
        'generate-questions',
        async () => {
          return await api.weaknesses.generateQuestions({
            weakness_ids: [selectedWeaknessId],
            count: questionCount,
          });
        },
        {
          taskName: '生成針對性題目',
          onSuccess: async (generateRes) => {
            if (!generateRes.success || !generateRes.data?.questions || generateRes.data.questions.length === 0) {
              message.error('生成題目失敗，请重試');
              return;
            }

            const generatedQuestions = generateRes.data.questions;
            const questionIds = generatedQuestions.map((q: any) => q.id);

            // 2. 获取弱點信息以確定category
            const weaknessRes = await api.weaknesses.get(selectedWeaknessId.toString());
            const weakness = weaknessRes.success ? weaknessRes.data : null;
            const weaknessCategory = weakness?.category || 'english-oral';

            // 3. 創建會話
            const sessionRes = await api.sessions.create({
              category: weaknessCategory,
              mode,
              question_count: questionIds.length,
              weakness_id: selectedWeaknessId,
              material_id: selectedMaterialId || undefined,
            });

            const session = sessionRes.data;
            setSessionData(session);
            setCategory(weaknessCategory);

            // 4. 设置題目
            setQuestions(generatedQuestions);
            setCurrentIndex(0);
            setAnswers({});
            setStep('practice');

            message.success(`弱點專項練習開始！共 ${generatedQuestions.length} 題`);

            // 5. 如果選擇了素材，增加使用次數
            if (selectedMaterialId) {
              try {
                await api.learningMaterials.incrementUsage(selectedMaterialId);
              } catch (error) {
                console.error('更新素材使用次數失敗:', error);
              }
            }
          },
          onError: (error: any) => {
            console.error('開始弱點專項練習失敗:', error);
            message.error(error.response?.data?.message || '開始練習失敗');
          },
        }
      );
    } catch (error: any) {
      console.error('開始弱點專項練習失敗:', error);
      message.error(error.response?.data?.message || '開始練習失敗');
    } finally {
      setLoading(false);
    }
  };

  // 開始練習
  const startPractice = async () => {
    if (practiceMode === 'weakness') {
      await startWeaknessPractice();
      return;
    }

    if (practiceMode === 'school-round') {
      await startSchoolRoundPractice();
      return;
    }

    if (!category) {
      message.warning('请選擇專項類別');
      return;
    }

    try {
      setLoading(true)

      // 創建會話
      const sessionRes = await api.sessions.create({
        category,
        mode,
        question_count: questionCount,
      })

      const session = sessionRes.data
      setSessionData(session)

      // 获取題目详情
      const questionIds = session.question_ids || []
      if (questionIds.length === 0) {
        message.error('该類別暫无題目，请選擇其他類別')
        return
      }

      const questionsRes = await api.questions.list({
        ids: questionIds.join(','),
        limit: questionIds.length,
      })

      const loadedQuestions = questionsRes.success ? questionsRes.data : []
      setQuestions(loadedQuestions)
      setCurrentIndex(0)
      setAnswers({})
      setStep('practice')
      message.success(`練習開始！共 ${loadedQuestions.length} 題`)
    } catch (error: any) {
      console.error('開始練習失敗:', error)
      message.error(error.response?.data?.message || '開始練習失敗')
    } finally {
      setLoading(false)
    }
  }

  // 開始學校-輪次模拟面試
  const startSchoolRoundPractice = async () => {
    if (!selectedSchoolCode) {
      message.warning('请選擇目標學校');
      return;
    }

    try {
      setLoading(true);

      // 使用浮窗展示 AI 思考過程
      await executeWithThinking(
        'generate-questions',
        async () => {
          // 調用新的API創建學校-輪次模拟面試會話
          return await api.sessions.createSchoolRoundMock({
            school_code: selectedSchoolCode,
            interview_round: selectedInterviewRound || undefined,
            question_count: questionCount,
          });
        },
        {
          taskName: '生成學校輪次模擬面試題目',
          onSuccess: async (sessionRes) => {
            if (!sessionRes.success || !sessionRes.data) {
              throw new Error('創建模拟面試會話失敗');
            }

            const session = sessionRes.data;
            setSessionData({
              session_id: session.session_id,
              question_ids: session.question_ids || [],
              status: 'in_progress',
            });

            // 如果API返回了題目列表，直接使用；否則通過question_ids获取
            let loadedQuestions: Question[] = [];
            if (session.questions && Array.isArray(session.questions)) {
              loadedQuestions = session.questions.map((q: any) => ({
                id: String(q.id),
                question_text: q.question_text,
                category: q.category || 'mixed',
                difficulty: q.difficulty,
              }));
            } else {
              const questionIds = session.question_ids || [];
              if (questionIds.length > 0) {
                const questionsRes = await api.questions.list({
                  ids: questionIds.join(','),
                  limit: questionIds.length,
                });
                loadedQuestions = questionsRes.success ? questionsRes.data : [];
              }
            }

            if (loadedQuestions.length === 0) {
              message.error('无法生成模拟面試題目，请稍後重試');
              return;
            }

            setQuestions(loadedQuestions);
            setCurrentIndex(0);
            setAnswers({});
            setStep('practice');
            
            message.success({
              content: `模拟面試開始！共 ${loadedQuestions.length} 題${selectedInterviewRound ? `（${selectedInterviewRound}）` : ''}`,
              key: 'schoolRound',
              duration: 3,
            });
          },
          onError: (error: any) => {
            console.error('開始學校-輪次模拟面試失敗:', error);
            message.error({
              content: error.response?.data?.message || '開始模拟面試失敗',
              key: 'schoolRound',
              duration: 5,
            });
          },
        }
      );
    } catch (error: any) {
      console.error('開始學校-輪次模拟面試失敗:', error);
      message.error({
        content: error.response?.data?.message || '開始模拟面試失敗',
        key: 'schoolRound',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  // 提交答案并获取即時反馈
  const submitAnswer = async () => {
    if (!answers[currentIndex]) {
      message.warning('请先输入答案')
      return
    }

    if (!sessionData) return

    // 检查會話狀態，如果已完成則不允许提交
    if (sessionData.status === 'completed') {
      message.warning('该會話已完成，无法继续提交答案。请查看反馈页面。')
      navigate(`/feedback?session=${sessionData.session_id}`)
      return
    }

    try {
      setSubmitting(true)
      const currentQuestion = questions[currentIndex]
      
      // 確保 question_id 是數字類型
      const questionId = typeof currentQuestion.id === 'string' 
        ? parseInt(currentQuestion.id, 10) 
        : currentQuestion.id
      
      // 調試日志：確认提交的是哪个題目
      console.log(`📝 提交答案: 索引=${currentIndex}, question_id=${questionId}, question_text=${currentQuestion.question_text.substring(0, 50)}...`)

      // 1. 保存答案
      const submitRes = await api.sessions.submitAnswer(sessionData.session_id, {
        question_id: questionId,
        question_text: currentQuestion.question_text,
        answer_text: answers[currentIndex],
        response_time: null,
      })

      const recordId = submitRes.data.record_id

      message.success('答案已保存，正在生成AI反馈...')

      // 2. 立即生成AI反馈并保存到數據庫
      await executeWithThinking(
        'generate-feedback',
        async () => {
          const feedbackRes = await api.feedback.generate({
            session_id: sessionData.session_id,
            record_id: recordId,
            question_id: currentQuestion.id,
            question_text: currentQuestion.question_text,
            answer_text: answers[currentIndex],
            category,
            target_school: targetSchool,
            // 弱點專項練習：傳递弱點和素材信息
            weakness_id: practiceMode === 'weakness' ? selectedWeaknessId : undefined,
            material_id: practiceMode === 'weakness' ? selectedMaterialId : undefined,
          })
          return feedbackRes
        },
        {
          taskName: '生成AI反馈',
          onSuccess: (feedbackRes) => {
            const feedback = feedbackRes.data
            setFeedbacks({ ...feedbacks, [currentIndex]: feedback })
            message.success('AI反馈已生成并保存！', 2)
          },
          onError: (feedbackError: any) => {
            console.error('生成反馈失敗:', feedbackError)
            message.warning(
              feedbackError.response?.data?.message || '反馈生成失敗，可以稍後在反馈页面查看'
            )
          },
        }
      )

      // 3. 如果是最後一題，提示完成
      if (currentIndex === questions.length - 1) {
        Modal.confirm({
          title: '練習完成',
          content: '恭喜你完成所有題目！是否立即查看完整反馈？',
          okText: '查看反馈',
          cancelText: '返回首页',
          onOk: async () => {
            await completeSession()
            navigate(`/feedback?session=${sessionData.session_id}`)
          },
          onCancel: () => {
            navigate('/')
          },
        })
      } else {
        // 不自動跳转，等待用户點击"下一題"按钮
        message.success('答案已提交，可以查看反馈後點击"下一題"继续')
      }
    } catch (error: any) {
      console.error('提交答案失敗:', error)
      message.error(error.response?.data?.message || '提交答案失敗')
    } finally {
      setSubmitting(false)
    }
  }

  // 完成會話
  const completeSession = async () => {
    if (!sessionData) return

    try {
      const response = await api.sessions.complete(sessionData.session_id)
      const data = response.data
      
      // 如果是任務模式且任務已完成,检查是否还有待办任務
      if (practiceMode === 'task' && data.task_completed) {
        try {
          // 获取今日剩余待办任務
          const tasksRes = await api.plans.pendingTasks()
          const pendingTasks = tasksRes.success ? tasksRes.data : []
          
          if (pendingTasks.length > 0) {
            // 还有待办任務,提示继续
            Modal.confirm({
              title: '🎉 任務已完成!',
              content: (
                <div>
                  <p style={{ marginBottom: 8 }}>
                    <strong>{ALL_CATEGORIES.find(c => c.value === category)?.label || CATEGORIES.find(c => c.value === category)?.label}</strong> 練習已完成!
                  </p>
                  <p>还有 {pendingTasks.length} 个任務待完成,是否继续?</p>
                  <ul style={{ marginTop: 8 }}>
                    {pendingTasks.slice(0, 3).map((task: any) => (
                      <li key={task.id}>
                        {ALL_CATEGORIES.find(c => c.value === task.category)?.label || CATEGORIES.find(c => c.value === task.category)?.label} ({task.duration}分鐘)
                      </li>
                    ))}
                  </ul>
                </div>
              ),
              okText: '继续下一个',
              cancelText: '稍後再練',
              onOk: () => {
                // 跳转到下一个任務
                navigate(`/practice?taskId=${pendingTasks[0].id}`)
                window.location.reload() // 刷新页面以重新加载任務
              },
              onCancel: () => {
                navigate('/dashboard')
              },
            })
          } else {
            // 所有任務已完成,显示庆祝
            Modal.success({
              title: '🎊 今日任務全部完成!',
              content: (
                <div>
                  <p>你太棒了!坚持就是胜利!</p>
                  <p style={{ marginTop: 12 }}>
                    今日共完成 <strong>{data.completed_count || 'N/A'}</strong> 个任務
                  </p>
                </div>
              ),
              okText: '查看反馈报告',
              onOk: () => {
                navigate('/feedback')
              },
            })
            
            // 2秒後自動跳转
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
          }
        } catch (error) {
          console.error('获取待办任務失敗:', error)
          // 获取失敗也跳转到Dashboard
          navigate('/dashboard')
        }
      } else {
        // 自由練習模式,直接提示完成
        message.success('練習已完成!')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }
    } catch (error) {
      console.error('完成會話失敗:', error)
      message.error('完成會話失敗,请稍後重試')
    }
  }

  // 上一題
  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // 下一題
  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  // 選擇模式界面
  if (step === 'select') {
    return (
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <Title level={2}>
          <BookOutlined style={{ marginRight: 8 }} />
          開始練習
        </Title>
        <Text type="secondary">選擇專項類別和練習模式，開始你的面試訓練</Text>

        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 練習類型選擇 */}
            <div>
              <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                0. 選擇練習類型
              </Text>
              <Radio.Group 
                value={practiceMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setPracticeMode(mode);
                  if (mode === 'weakness') {
                    // 加载弱點列表
                    loadWeaknesses();
                  } else if (mode === 'school-round') {
                    // 加载學校列表
                    loadSchools();
                  } else {
                    // 切换到自由練習時清空弱點相關狀態
                    setSelectedWeaknessId(null);
                    setSelectedMaterialId(null);
                    setMaterials([]);
                  }
                }}
              >
                <Space>
                  <Radio value="free">自由練習</Radio>
                  <Radio value="weakness">弱點專項練習</Radio>
                  <Radio value="school-round">學校-輪次模拟面試</Radio>
                </Space>
              </Radio.Group>
            </div>

            <Divider />

            {/* 弱點專項練習模式 */}
            {practiceMode === 'weakness' && (
              <>
                <div>
                  <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                    1. 選擇弱點
                  </Text>
                  <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请選擇要練習的弱點"
                    value={selectedWeaknessId}
                    onChange={(value) => {
                      setSelectedWeaknessId(value);
                      // 加载该弱點關聯的素材
                      if (value) {
                        loadMaterialsForWeakness(value);
                      }
                    }}
                    loading={loadingWeaknesses}
                    showSearch
                    optionFilterProp="children"
                  >
                    {weaknesses.map((w) => (
                      <Select.Option key={w.id} value={w.id}>
                        {w.description?.substring(0, 50)}... ({w.category})
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {selectedWeaknessId && materials.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                      2. 選擇學習素材（可選）
                    </Text>
                    <Select
                      size="large"
                      style={{ width: '100%' }}
                      placeholder="選擇相關學習素材（可選）"
                      value={selectedMaterialId}
                      onChange={setSelectedMaterialId}
                      allowClear
                    >
                      {materials.map((m) => (
                        <Select.Option key={m.id} value={m.id}>
                          {m.title} ({m.material_type})
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                )}

                {selectedMaterialId && (
                  <Alert
                    message="已選擇學習素材"
                    description={
                      <div>
                        <Text>
                          {materials.find(m => m.id === selectedMaterialId)?.title}
                        </Text>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => navigate(`/learning-materials/${selectedMaterialId}`)}
                        >
                          查看详情
                        </Button>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                )}
              </>
            )}

            {/* 學校-輪次模拟面試模式 */}
            {practiceMode === 'school-round' && (
              <>
                <div>
                  <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                    1. 選擇目標學校
                  </Text>
                  <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请選擇目標學校"
                    value={selectedSchoolCode}
                    onChange={setSelectedSchoolCode}
                    loading={loadingSchools}
                    showSearch
                    optionFilterProp="children"
                  >
                    {schools.map((school) => (
                      <Select.Option key={school.code} value={school.code}>
                        {school.name_zh} ({school.code})
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                    2. 選擇面試輪次
                  </Text>
                  <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请選擇面試輪次"
                    value={selectedInterviewRound}
                    onChange={setSelectedInterviewRound}
                    allowClear
                  >
                    <Select.Option value="first-round">第一輪</Select.Option>
                    <Select.Option value="second-round">第二輪</Select.Option>
                    <Select.Option value="final-round">最终輪</Select.Option>
                  </Select>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    如果不選擇輪次，将基于该學校的所有历史數據生成題目
                  </Text>
                </div>
              </>
            )}

            {/* 自由練習模式 */}
            {practiceMode === 'free' && (
              <div>
                <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                  1. 選擇專項類別
                </Text>
                <Select
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="请選擇專項類別"
                  value={category}
                  onChange={setCategory}
                  options={ALL_CATEGORIES}
                />
              </div>
            )}

            {/* 題目數量 */}
            <div>
              <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                2. 題目數量
              </Text>
              <Radio.Group value={questionCount} onChange={(e) => setQuestionCount(e.target.value)}>
                <Radio.Button value={5}>5題</Radio.Button>
                <Radio.Button value={10}>10題</Radio.Button>
                <Radio.Button value={15}>15題</Radio.Button>
                <Radio.Button value={20}>20題</Radio.Button>
              </Radio.Group>
            </div>

            {/* 練習模式 */}
            <div>
              <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                3. 練習模式
              </Text>
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="text_qa">
                    <Text strong>文字問答</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      逐題作答，提交後查看反馈
                    </Text>
                  </Radio>
                  <Radio value="ai_interview" disabled>
                    <Text strong>AI模拟面試</Text>
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      開發中
                    </Tag>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      实時對話，AI扮演面試官
                    </Text>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>

            <Divider />

            {/* 開始按钮 */}
            <Button
              type="primary"
              size="large"
              block
              icon={<FireOutlined />}
              onClick={startPractice}
              loading={loading}
              disabled={
                practiceMode === 'free' ? !category :
                practiceMode === 'weakness' ? !selectedWeaknessId :
                practiceMode === 'school-round' ? !selectedSchoolCode :
                false
              }
            >
              {practiceMode === 'weakness' ? '開始弱點專項練習' :
               practiceMode === 'school-round' ? '開始模拟面試' :
               '開始練習'}
            </Button>
          </Space>
        </Card>
      </div>
    )
  }

  // 練習界面
  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* 任務模式横幅 */}
      {practiceMode === 'task' && taskInfo && (
        <Alert
          message={
            <Space>
              <ClockCircleOutlined />
              <Text strong>任務練習</Text>
            </Space>
          }
          description={
            <div>
              {taskInfo.plan_name && (
                <>
                  <Text strong style={{ color: '#1890ff' }}>{taskInfo.plan_name}</Text>
                  <Divider type="vertical" />
                </>
              )}
              <Text>
                <strong>{taskInfo.student_name}</strong> → <strong>{taskInfo.target_school}</strong>
              </Text>
              <Divider type="vertical" />
              <Text>
                {ALL_CATEGORIES.find((c) => c.value === taskInfo.category)?.label || CATEGORIES.find((c) => c.value === taskInfo.category)?.label}
              </Text>
              <Divider type="vertical" />
              <Text>{taskInfo.duration}分鐘</Text>
              {taskInfo.task_date && (
                <>
                  <Divider type="vertical" />
                  <Text type="secondary">{new Date(taskInfo.task_date).toLocaleDateString('zh-CN')}</Text>
                </>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 顶部進度 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="blue">
                {ALL_CATEGORIES.find((c) => c.value === category)?.label || CATEGORIES.find((c) => c.value === category)?.label}
              </Tag>
              <Text strong>
                第 {currentIndex + 1} / {questions.length} 題
              </Text>
            </Space>
            <Text type="secondary">{Math.round(progress)}% 完成</Text>
          </div>
          <Progress percent={progress} showInfo={false} />
        </Space>
      </Card>

      {/* 弱點專項練習：显示相關素材提示 */}
      {practiceMode === 'weakness' && selectedMaterialId && (
        <Alert
          message="相關學習素材"
          description={
            <div>
              <Text>{materials.find(m => m.id === selectedMaterialId)?.title}</Text>
              <Button 
                type="link" 
                size="small" 
                onClick={() => {
                  // 在新窗口打開素材详情
                  window.open(`/learning-materials/${selectedMaterialId}`, '_blank');
                }}
              >
                查看详情
              </Button>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 題目卡片 */}
      {currentQuestion ? (
        <Card
          title={
            <Space>
              <BookOutlined />
              題目 {currentIndex + 1}
              {currentQuestion.difficulty && (
                <Tag color={currentQuestion.difficulty === 'hard' ? 'red' : 'blue'}>
                  {currentQuestion.difficulty === 'easy' && '简单'}
                  {currentQuestion.difficulty === 'medium' && '中等'}
                  {currentQuestion.difficulty === 'hard' && '困難'}
                </Tag>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
            {currentQuestion.question_text}
          </Paragraph>

          <Divider />

          <div>
            <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
              你的回答：
            </Text>
            
            {/* 語音输入組件 */}
            {!feedbacks[currentIndex] && (
              <VoiceInput
                onResult={(text) => {
                  // 追加或替换现有答案
                  const currentAnswer = answers[currentIndex] || ''
                  const newAnswer = currentAnswer
                    ? `${currentAnswer} ${text}`
                    : text
                  setAnswers({ ...answers, [currentIndex]: newAnswer })
                }}
                onError={(error) => {
                  console.error('語音識別错误:', error)
                  message.error(`語音識別失敗: ${error.message}`)
                }}
                language={category === 'english-oral' ? 'en-US' : 'zh-CN'}
                disabled={!!feedbacks[currentIndex]}
              />
            )}

            <TextArea
              rows={8}
              placeholder="请输入你的答案..."
              value={answers[currentIndex] || ''}
              onChange={(e) =>
                setAnswers({ ...answers, [currentIndex]: e.target.value })
              }
              style={{ fontSize: 14 }}
              disabled={!!feedbacks[currentIndex]}
            />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              {feedbacks[currentIndex] 
                ? '✅ 已提交并获得反馈' 
                : '提示：可以使用語音输入或手動输入答案，尽量详细、有条理地回答問題'}
            </Text>
          </div>

          {/* AI即時反馈区域 */}
          {feedbacks[currentIndex] && (
            <>
              <Divider />
              <div
                style={{
                  background: '#e6f7ff',
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 16,
                }}
              >
                <Text strong style={{ fontSize: 16, color: '#1890ff', marginBottom: 12, display: 'block' }}>
                  💡 AI反馈
                </Text>
                
                {feedbacks[currentIndex].score && (
                  <div style={{ marginBottom: 12 }}>
                    <Text>综合評分：</Text>
                    <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>
                      {feedbacks[currentIndex].score}/10
                    </Tag>
                  </div>
                )}

                {feedbacks[currentIndex].strengths && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#52c41a' }}>✅ 優點：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].strengths}
                    </Paragraph>
                  </div>
                )}

                {feedbacks[currentIndex].weaknesses && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#faad14' }}>⚠️ 待改進：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].weaknesses}
                    </Paragraph>
                  </div>
                )}

                {feedbacks[currentIndex].suggestions && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#1890ff' }}>💡 建議：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].suggestions}
                    </Paragraph>
                    {/* 弱點專項練習：显示素材相關建議 */}
                    {practiceMode === 'weakness' && selectedMaterialId && (
                      <Alert
                        message="學習素材建議"
                        description={
                          <div>
                            <Text>
                              建議參考學習素材：{materials.find(m => m.id === selectedMaterialId)?.title}
                            </Text>
                            <Button 
                              type="link" 
                              size="small" 
                              onClick={() => navigate(`/learning-materials/${selectedMaterialId}`)}
                            >
                              查看完整素材
                            </Button>
                          </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                )}

                {feedbacks[currentIndex].reference_thinking && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#722ed1' }}>🤔 參考思路：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].reference_thinking}
                    </Paragraph>
                  </div>
                )}

                {feedbacks[currentIndex].reference_answer && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: '#fff',
                      borderRadius: 4,
                      border: '1px dashed #1890ff',
                    }}
                  >
                    <Text strong style={{ color: '#722ed1' }}>📝 參考答案：</Text>
                    <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                      {feedbacks[currentIndex].reference_answer}
                    </Paragraph>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <Empty description="暫无題目" />
        </Card>
      )}

      {/* 底部按钮 */}
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={prevQuestion}
            disabled={currentIndex === 0}
          >
            上一題
          </Button>

          <Space>
            <Button onClick={() => navigate('/')}>
              {sessionData?.status === 'completed' ? '返回' : '暫停練習'}
            </Button>
            {sessionData?.status === 'completed' ? (
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/feedback?session=${sessionData.session_id}`)}
              >
                查看反馈
              </Button>
            ) : currentIndex === questions.length - 1 ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={submitAnswer}
                loading={submitting}
                disabled={!answers[currentIndex]}
              >
                提交并完成
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={submitAnswer}
                loading={submitting}
                disabled={!answers[currentIndex]}
              >
                提交答案
              </Button>
            )}
          </Space>

          <Button
            icon={<ArrowRightOutlined />}
            onClick={nextQuestion}
            disabled={currentIndex === questions.length - 1}
            type={feedbacks[currentIndex] || answers[currentIndex] ? 'primary' : 'default'}
          >
            下一題
          </Button>
        </Space>
      </Card>
    </div>
  )
}
