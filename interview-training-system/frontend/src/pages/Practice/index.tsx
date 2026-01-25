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

// 专项类别
const CATEGORIES = [
  { value: 'english-oral', label: '英文口语' },
  { value: 'chinese-expression', label: '中文表达' },
  { value: 'logical-thinking', label: '逻辑思维' },
  { value: 'current-affairs', label: '时事常识' },
  { value: 'science-knowledge', label: '科学常识' },
  { value: 'personal-growth', label: '个人成长' },
  { value: 'group-discussion', label: '小组讨论' },
]

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
  status?: 'in_progress' | 'completed' // 会话状态
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

  // 状态管理
  const [practiceMode, setPracticeMode] = useState<'task' | 'free' | 'weakness' | 'school-round'>(taskId ? 'task' : 'free')
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [step, setStep] = useState<'select' | 'practice'>('select')
  const [category, setCategory] = useState<string>('')
  const [questionCount, setQuestionCount] = useState(10)
  const [mode, setMode] = useState<'text_qa' | 'ai_interview'>('text_qa')
  // 弱点专项练习相关
  const [selectedWeaknessId, setSelectedWeaknessId] = useState<number | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)
  const [weaknesses, setWeaknesses] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loadingWeaknesses, setLoadingWeaknesses] = useState(false)
  // 学校-轮次模拟面试相关
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
  const [targetSchool, setTargetSchool] = useState<string>('SPCC') // 默认值，从设置中加载

  // 继续现有会话（加载已提交的答案和反馈）
  const _continueExistingSession = async (sessionId: string, targetQuestionId?: number) => {
    try {
      setLoading(true)
      message.loading({ content: '正在加载会话详情...', key: 'loading', duration: 0 })

      // 获取会话详情
      const sessionRes = await api.sessions.get(sessionId)
      const sessionData = sessionRes.success ? sessionRes.data : null

      if (!sessionData || !sessionData.session) {
        throw new Error('会话数据格式错误')
      }

      const session = sessionData.session
      const qaRecords = sessionData.qa_records || []

      // 从会话中获取保存的题目ID列表（这是会话创建时选择的完整题目列表）
      let questionIds: number[] = []
      
      // 优先从会话的 question_ids 字段获取（如果后端返回了）
      if (sessionData.question_ids && Array.isArray(sessionData.question_ids)) {
        questionIds = sessionData.question_ids as number[]
      } else if (session.question_ids) {
        // 如果后端没有解析，尝试从 session 对象中获取
        try {
          const parsed = typeof session.question_ids === 'string'
            ? JSON.parse(session.question_ids)
            : session.question_ids
          if (Array.isArray(parsed)) {
            questionIds = parsed as number[]
          }
        } catch (e) {
          console.warn('解析会话题目ID列表失败:', e)
        }
      }
      
      // 如果会话中没有保存题目ID，从 qa_records 中提取（兼容旧数据）
      if (questionIds.length === 0) {
        const answeredQuestionIds = qaRecords.map((r: any) => r.question_id).filter(Boolean) as number[]
        questionIds = [...new Set(answeredQuestionIds)]
      }
      
      if (questionIds.length === 0) {
        throw new Error('会话中没有题目，请重新开始练习')
      }

      // 获取题目详情
      const questionsRes = await api.questions.list({
        ids: questionIds.join(','),
        limit: questionIds.length,
      })

      const allQuestions = questionsRes.success ? questionsRes.data : []
      
      if (allQuestions.length === 0) {
        throw new Error('无法加载题目，请刷新页面重试')
      }

      // 按会话保存的题目ID顺序构建题目列表（这是会话创建时选择的完整题目列表）
      // 同时加载答案和反馈，确保索引匹配
      const sortedQuestions: Question[] = []
      const loadedAnswers: Record<number, string> = {}
      const loadedFeedbacks: Record<number, AIFeedback> = {}
      
      // 先收集每个题目的最新记录（按 created_at 排序，取最新的）
      // 确保类型匹配：统一转换为数字进行比较
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
      
      // 按会话保存的题目ID顺序构建题目列表
      // 注意：allQuestions 应该已经按照 questionIds 的顺序返回（因为 API 使用了 FIELD 排序）
      // 但为了确保顺序正确，我们仍然按照 questionIds 的顺序来构建
      console.log(`📋 开始构建题目列表: questionIds=${JSON.stringify(questionIds)}, allQuestions.length=${allQuestions.length}`)
      console.log(`📋 allQuestions 顺序:`, allQuestions.map((q: any) => {
        const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
        return qId
      }))
      
      // 创建一个 Map 以便快速查找
      const questionMap = new Map<number, any>()
      allQuestions.forEach((q: any) => {
        const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
        if (!isNaN(qId)) {
          questionMap.set(qId, q)
        }
      })
      
      for (let i = 0; i < questionIds.length; i++) {
        const questionId = questionIds[i]
        // 确保类型匹配：questionId 可能是数字或字符串
        const qIdNum = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId
        if (isNaN(qIdNum)) {
          console.warn(`⚠️ 无效的 questionId: ${questionId}`)
          continue
        }
        
        // 从 Map 中查找题目（更快且确保类型匹配）
        const question = questionMap.get(qIdNum)
        
        if (question) {
          const questionIndex = sortedQuestions.length
          sortedQuestions.push(question)
          console.log(`✅ 添加题目到列表: index=${questionIndex}, question_id=${qIdNum}, question_text=${question.question_text.substring(0, 50)}...`)
          
          // 验证索引是否正确
          if (questionIndex !== i) {
            console.warn(`⚠️  索引不匹配！期望 index=${i}，实际 index=${questionIndex}`)
          }
          
          // 加载该题目的答案和反馈（如果有）
          // 使用数字类型的 questionId 来查找记录
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
                console.warn('解析反馈失败:', latestRecord.id, e)
              }
            }
          } else {
            // 调试日志：记录没有找到记录的题目
            console.log(`⚠️ 题目 ${qIdNum} (索引 ${questionIndex}) 没有找到对应的 qa_record`)
          }
        } else {
          console.warn(`⚠️ 题目 ID ${qIdNum} 在题库中不存在`)
        }
      }

      // 确保有题目才能继续
      if (sortedQuestions.length === 0) {
        throw new Error('无法加载题目，请刷新页面重试')
      }

      // 确定要跳转到的题目索引
      let targetIndex = -1
      
      // 如果指定了 targetQuestionId，必须定位到该题目（不回退到其他题目）
      if (targetQuestionId) {
        console.log(`🔍 开始定位题目: targetQuestionId=${targetQuestionId} (类型: ${typeof targetQuestionId})`)
        console.log(`📋 题目列表:`, sortedQuestions.map((q: Question) => {
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
          console.log(`✅ 定位到指定题目: question_id=${matchedQId}, index=${targetIndex}, question_text=${matchedQuestion.question_text.substring(0, 50)}...`)
        } else {
          console.warn(`⚠️ 指定的题目 ID ${targetQuestionId} 在题目列表中未找到`)
          console.warn(`   可用的 question_ids:`, sortedQuestions.map((q: Question) => {
            const qId = typeof q.id === 'string' ? parseInt(q.id, 10) : q.id
            return qId
          }))
          // 如果找不到指定的题目，定位到第一题（而不是第一个未完成的）
          targetIndex = 0
          console.log(`📍 未找到指定题目，定位到第一题: index=${targetIndex}`)
        }
      } else {
        // 如果没有指定 question_id，找到第一个未完成的题目索引
        targetIndex = sortedQuestions.findIndex((_: any, index: number) => !loadedAnswers[index])
        if (targetIndex >= 0) {
          console.log(`📍 定位到第一个未完成的题目: index=${targetIndex}`)
        } else {
          // 如果都完成了，定位到最后一题
          targetIndex = sortedQuestions.length - 1
          console.log(`📍 所有题目已完成，定位到最后一题: index=${targetIndex}`)
        }
      }

      // 先设置所有状态，确保页面正确渲染
      setSessionData({
        session_id: session.id,
        question_ids: sortedQuestions.map((q: any) => q.id),
        status: session.status || 'in_progress', // 保存会话状态
      })
      setQuestions(sortedQuestions)
      setTaskInfo(sessionData.task_info || null)
      setCategory(session.category)
      // 最终验证：确保定位的题目是正确的
      if (targetIndex >= 0 && targetIndex < sortedQuestions.length) {
        const finalQuestion = sortedQuestions[targetIndex]
        const finalQId = typeof finalQuestion.id === 'string' ? parseInt(finalQuestion.id, 10) : finalQuestion.id
        console.log(`🎯 最终定位结果: index=${targetIndex}, question_id=${finalQId}, question_text=${finalQuestion.question_text.substring(0, 50)}...`)
        
        if (targetQuestionId && finalQId !== targetQuestionId) {
          console.error(`❌ 定位错误！期望 question_id=${targetQuestionId}，但定位到了 question_id=${finalQId}`)
          // 尝试重新定位
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
      
      // 确保 step 设置为 practice，让页面跳转到题目页面
      setStep('practice')

      message.success({
        content: `已恢复会话，共 ${sortedQuestions.length} 题，已完成 ${Object.keys(loadedAnswers).length} 题`,
        key: 'loading',
        duration: 2
      })
      
      // 调试信息
      console.log('已恢复会话:', {
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
      console.error('加载会话详情失败:', error)
      message.error({
        content: error.message || '加载会话详情失败，请刷新页面重试',
        key: 'loading',
        duration: 3
      })
      // 如果加载失败，返回选择页面
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  // 从任务开始练习
  const startTaskPractice = async (taskId: string) => {
    try {
      setLoading(true)
      message.loading({ content: '正在加载任务...', key: 'loading' })

      // 调用API，后端会自动处理：如果有现有会话就返回，没有就创建
      // 不指定question_count，让后端根据任务duration自动计算
      const response = await api.plans.startTaskPractice(taskId, {})

      // api.plans.startTaskPractice 返回的是 apiClient.post().then(res => res.data)
      // 后端返回: { success: true, data: { session_id, questions, is_existing, ... } }
      const data = response.success ? response.data : (response.data || response)
      
      if (!data || !data.session_id) {
        console.error('响应数据格式错误:', { response, data })
        throw new Error('响应数据格式错误，请刷新页面重试')
      }
      
      // 确保 questions 是数组
      if (!Array.isArray(data.questions)) {
        console.error('questions 不是数组:', data)
        throw new Error('题目数据格式错误，请刷新页面重试')
      }

      // 如果是现有会话，需要加载已提交的答案和反馈
      if (data.is_existing) {
        // 检查会话是否已完成
        const isCompleted = data.is_completed || data.session_status === 'completed'
        
        // 后端已经返回了题目，但需要加载已提交的答案和反馈
        // 先设置题目和会话信息
        setSessionData({
          session_id: data.session_id,
          question_ids: data.questions.map((q: any) => q.id),
          status: isCompleted ? 'completed' : 'in_progress', // 保存会话状态
        })
        setQuestions(data.questions)
        setTaskInfo(data.task_info || null)
        setCategory(data.task_info?.category || data.category || '')
        
        // 然后加载已提交的答案和反馈
        try {
          const sessionRes = await api.sessions.get(String(data.session_id))
          const sessionData = sessionRes.success ? sessionRes.data : null
          
          if (sessionData && sessionData.qa_records) {
            const qaRecords = sessionData.qa_records || []
            const loadedAnswers: Record<number, string> = {}
            const loadedFeedbacks: Record<number, AIFeedback> = {}
            
            // 按题目ID匹配答案和反馈
            data.questions.forEach((question: Question, index: number) => {
              // 确保类型匹配：question.id 可能是字符串或数字，需要统一转换
              const questionId = typeof question.id === 'string' ? parseInt(question.id, 10) : question.id
              
              // 找到该题目的最新记录（确保类型匹配）
              const records = qaRecords.filter((r: any) => {
                const recordQuestionId = typeof r.question_id === 'string' 
                  ? parseInt(r.question_id, 10) 
                  : r.question_id
                return !isNaN(questionId) && !isNaN(recordQuestionId) && recordQuestionId === questionId
              })
              
              if (records.length > 0) {
                // 取最新的记录
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
                    console.warn('解析反馈失败:', latestRecord.id, e)
                  }
                }
              } else {
                // 调试日志：记录没有找到记录的题目
                console.log(`⚠️ 题目 ${questionId} (索引 ${index}) 没有找到对应的 qa_record`)
              }
            })
            
            setAnswers(loadedAnswers)
            setFeedbacks(loadedFeedbacks)
            
            // 如果会话已完成，显示所有题目（从第一题开始）
            // 如果会话进行中，找到第一个未完成的题目索引
            if (isCompleted) {
              setCurrentIndex(0) // 已完成会话，从第一题开始查看
            } else {
              // 找到第一个没有答案的题目索引
              // 使用已加载的 answers 来判断，因为 answers 是按索引存储的
              const firstUnansweredIndex = data.questions.findIndex((_question: Question, index: number) => {
                // 检查该索引位置是否有答案
                return !loadedAnswers[index]
              })
              setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : data.questions.length - 1)
              
              // 调试日志
              if (firstUnansweredIndex >= 0) {
                const unansweredQuestion = data.questions[firstUnansweredIndex]
                const questionId = typeof unansweredQuestion.id === 'string' 
                  ? parseInt(unansweredQuestion.id, 10) 
                  : unansweredQuestion.id
                console.log(`📍 定位到第一个未完成的题目: 索引=${firstUnansweredIndex}, question_id=${questionId}`)
              }
            }
          } else {
            setCurrentIndex(0)
            setAnswers({})
            setFeedbacks({})
          }
        } catch (error) {
          console.warn('加载会话详情失败，使用默认状态:', error)
          setCurrentIndex(0)
          setAnswers({})
          setFeedbacks({})
        }
        
        setStep('practice')
        message.success({ 
          content: isCompleted 
            ? `查看已完成的练习记录（共 ${data.questions?.length || 0} 题）` 
            : `继续练习！共 ${data.questions?.length || 0} 题`, 
          key: 'loading',
          duration: 2
        })
        return
      }

      // 新创建的会话，直接设置状态
      setSessionData({
        session_id: data.session_id,
        question_ids: data.questions.map((q: any) => q.id),
        status: 'in_progress', // 新创建的会话状态为进行中
      })
      setQuestions(data.questions)
      setTaskInfo(data.task_info || null)
      setCategory(data.task_info?.category || data.category || '')
      setCurrentIndex(0)
      setAnswers({})
      setFeedbacks({})
      setStep('practice')
      
      message.success({ 
        content: `任务练习开始！共 ${data.questions?.length || 0} 题`, 
        key: 'loading',
        duration: 2
      })
    } catch (error: any) {
      console.error('从任务开始练习失败:', error)
      const errorMsg = error.response?.data?.message || error.message || '开始练习失败'
      message.error({ content: errorMsg, key: 'loading' })
    } finally {
      setLoading(false)
    }
  }

  // 任务模式: 自动加载任务并开始练习
  // 加载用户设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.settings.get()
        if (response.success && response.data?.target_school) {
          setTargetSchool(response.data.target_school)
        }
      } catch (error) {
        console.error('加载设置失败:', error)
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

  // 检查是否有 session 参数，如果有则恢复会话
  useEffect(() => {
    const sessionId = searchParams.get('session')
    const questionIdParam = searchParams.get('question')
    
    if (sessionId && !sessionData) {
      // 如果有 session 参数但没有 sessionData，尝试恢复会话
      console.log('检测到 session 参数，尝试恢复会话:', sessionId, questionIdParam ? `question=${questionIdParam}` : '')
      // 使用 _continueExistingSession 函数，并传递 question_id（如果有）
      _continueExistingSession(sessionId, questionIdParam ? parseInt(questionIdParam, 10) : undefined).catch((error) => {
        console.error('恢复会话失败:', error)
        message.error('恢复会话失败，请刷新页面重试')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 加载弱点列表
  const loadWeaknesses = async () => {
    try {
      setLoadingWeaknesses(true);
      const res = await api.weaknesses.list({ status: 'active' });
      if (res.success) {
        setWeaknesses(res.data || []);
      }
    } catch (error) {
      console.error('加载弱点列表失败:', error);
    } finally {
      setLoadingWeaknesses(false);
    }
  };

  // 加载学校列表
  const loadSchools = async () => {
    try {
      setLoadingSchools(true);
      const res = await api.schools.list();
      if (res.success) {
        setSchools(res.data || []);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载学校列表失败');
    } finally {
      setLoadingSchools(false);
    }
  };

  // 加载弱点关联的素材
  const loadMaterialsForWeakness = async (weaknessId: number) => {
    try {
      const res = await api.learningMaterials.getByWeakness(weaknessId);
      if (res.success) {
        setMaterials(res.data || []);
      }
    } catch (error) {
      console.error('加载学习素材失败:', error);
    }
  };

  // 开始弱点专项练习
  const startWeaknessPractice = async () => {
    if (!selectedWeaknessId) {
      message.warning('请选择弱点');
      return;
    }

    try {
      setLoading(true);

      // 1. 基于弱点生成针对性题目
      await executeWithThinking(
        'generate-questions',
        async () => {
          return await api.weaknesses.generateQuestions({
            weakness_ids: [selectedWeaknessId],
            count: questionCount,
          });
        },
        {
          taskName: '生成针对性题目',
          onSuccess: async (generateRes) => {
            if (!generateRes.success || !generateRes.data?.questions || generateRes.data.questions.length === 0) {
              message.error('生成题目失败，请重试');
              return;
            }

            const generatedQuestions = generateRes.data.questions;
            const questionIds = generatedQuestions.map((q: any) => q.id);

            // 2. 获取弱点信息以确定category
            const weaknessRes = await api.weaknesses.get(selectedWeaknessId.toString());
            const weakness = weaknessRes.success ? weaknessRes.data : null;
            const weaknessCategory = weakness?.category || 'english-oral';

            // 3. 创建会话
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

            // 4. 设置题目
            setQuestions(generatedQuestions);
            setCurrentIndex(0);
            setAnswers({});
            setStep('practice');

            message.success(`弱点专项练习开始！共 ${generatedQuestions.length} 题`);

            // 5. 如果选择了素材，增加使用次数
            if (selectedMaterialId) {
              try {
                await api.learningMaterials.incrementUsage(selectedMaterialId);
              } catch (error) {
                console.error('更新素材使用次数失败:', error);
              }
            }
          },
          onError: (error: any) => {
            console.error('开始弱点专项练习失败:', error);
            message.error(error.response?.data?.message || '开始练习失败');
          },
        }
      );
    } catch (error: any) {
      console.error('开始弱点专项练习失败:', error);
      message.error(error.response?.data?.message || '开始练习失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始练习
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
      message.warning('请选择专项类别');
      return;
    }

    try {
      setLoading(true)

      // 创建会话
      const sessionRes = await api.sessions.create({
        category,
        mode,
        question_count: questionCount,
      })

      const session = sessionRes.data
      setSessionData(session)

      // 获取题目详情
      const questionIds = session.question_ids || []
      if (questionIds.length === 0) {
        message.error('该类别暂无题目，请选择其他类别')
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
      message.success(`练习开始！共 ${loadedQuestions.length} 题`)
    } catch (error: any) {
      console.error('开始练习失败:', error)
      message.error(error.response?.data?.message || '开始练习失败')
    } finally {
      setLoading(false)
    }
  }

  // 开始学校-轮次模拟面试
  const startSchoolRoundPractice = async () => {
    if (!selectedSchoolCode) {
      message.warning('请选择目标学校');
      return;
    }

    try {
      setLoading(true);
      message.loading({ content: '正在生成模拟面试题目...', key: 'schoolRound', duration: 0 });

      // 调用新的API创建学校-轮次模拟面试会话
      const sessionRes = await api.sessions.createSchoolRoundMock({
        school_code: selectedSchoolCode,
        interview_round: selectedInterviewRound || undefined,
        question_count: questionCount,
      });

      if (!sessionRes.success || !sessionRes.data) {
        throw new Error('创建模拟面试会话失败');
      }

      const session = sessionRes.data;
      setSessionData({
        session_id: session.session_id,
        question_ids: session.question_ids || [],
        status: 'in_progress',
      });

      // 如果API返回了题目列表，直接使用；否则通过question_ids获取
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
        message.error('无法生成模拟面试题目，请稍后重试');
        return;
      }

      setQuestions(loadedQuestions);
      setCurrentIndex(0);
      setAnswers({});
      setStep('practice');
      
      message.success({
        content: `模拟面试开始！共 ${loadedQuestions.length} 题${selectedInterviewRound ? `（${selectedInterviewRound}）` : ''}`,
        key: 'schoolRound',
        duration: 3,
      });
    } catch (error: any) {
      console.error('开始学校-轮次模拟面试失败:', error);
      message.error({
        content: error.response?.data?.message || '开始模拟面试失败',
        key: 'schoolRound',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  // 提交答案并获取即时反馈
  const submitAnswer = async () => {
    if (!answers[currentIndex]) {
      message.warning('请先输入答案')
      return
    }

    if (!sessionData) return

    // 检查会话状态，如果已完成则不允许提交
    if (sessionData.status === 'completed') {
      message.warning('该会话已完成，无法继续提交答案。请查看反馈页面。')
      navigate(`/feedback?session=${sessionData.session_id}`)
      return
    }

    try {
      setSubmitting(true)
      const currentQuestion = questions[currentIndex]
      
      // 确保 question_id 是数字类型
      const questionId = typeof currentQuestion.id === 'string' 
        ? parseInt(currentQuestion.id, 10) 
        : currentQuestion.id
      
      // 调试日志：确认提交的是哪个题目
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

      // 2. 立即生成AI反馈并保存到数据库
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
            // 弱点专项练习：传递弱点和素材信息
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
            console.error('生成反馈失败:', feedbackError)
            message.warning(
              feedbackError.response?.data?.message || '反馈生成失败，可以稍后在反馈页面查看'
            )
          },
        }
      )

      // 3. 如果是最后一题，提示完成
      if (currentIndex === questions.length - 1) {
        Modal.confirm({
          title: '练习完成',
          content: '恭喜你完成所有题目！是否立即查看完整反馈？',
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
        // 不自动跳转，等待用户点击"下一题"按钮
        message.success('答案已提交，可以查看反馈后点击"下一题"继续')
      }
    } catch (error: any) {
      console.error('提交答案失败:', error)
      message.error(error.response?.data?.message || '提交答案失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 完成会话
  const completeSession = async () => {
    if (!sessionData) return

    try {
      const response = await api.sessions.complete(sessionData.session_id)
      const data = response.data
      
      // 如果是任务模式且任务已完成,检查是否还有待办任务
      if (practiceMode === 'task' && data.task_completed) {
        try {
          // 获取今日剩余待办任务
          const tasksRes = await api.plans.pendingTasks()
          const pendingTasks = tasksRes.success ? tasksRes.data : []
          
          if (pendingTasks.length > 0) {
            // 还有待办任务,提示继续
            Modal.confirm({
              title: '🎉 任务已完成!',
              content: (
                <div>
                  <p style={{ marginBottom: 8 }}>
                    <strong>{CATEGORIES.find(c => c.value === category)?.label}</strong> 练习已完成!
                  </p>
                  <p>还有 {pendingTasks.length} 个任务待完成,是否继续?</p>
                  <ul style={{ marginTop: 8 }}>
                    {pendingTasks.slice(0, 3).map((task: any) => (
                      <li key={task.id}>
                        {CATEGORIES.find(c => c.value === task.category)?.label} ({task.duration}分钟)
                      </li>
                    ))}
                  </ul>
                </div>
              ),
              okText: '继续下一个',
              cancelText: '稍后再练',
              onOk: () => {
                // 跳转到下一个任务
                navigate(`/practice?taskId=${pendingTasks[0].id}`)
                window.location.reload() // 刷新页面以重新加载任务
              },
              onCancel: () => {
                navigate('/dashboard')
              },
            })
          } else {
            // 所有任务已完成,显示庆祝
            Modal.success({
              title: '🎊 今日任务全部完成!',
              content: (
                <div>
                  <p>你太棒了!坚持就是胜利!</p>
                  <p style={{ marginTop: 12 }}>
                    今日共完成 <strong>{data.completed_count || 'N/A'}</strong> 个任务
                  </p>
                </div>
              ),
              okText: '查看反馈报告',
              onOk: () => {
                navigate('/feedback')
              },
            })
            
            // 2秒后自动跳转
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
          }
        } catch (error) {
          console.error('获取待办任务失败:', error)
          // 获取失败也跳转到Dashboard
          navigate('/dashboard')
        }
      } else {
        // 自由练习模式,直接提示完成
        message.success('练习已完成!')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }
    } catch (error) {
      console.error('完成会话失败:', error)
      message.error('完成会话失败,请稍后重试')
    }
  }

  // 上一题
  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // 下一题
  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  // 选择模式界面
  if (step === 'select') {
    return (
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <Title level={2}>
          <BookOutlined style={{ marginRight: 8 }} />
          开始练习
        </Title>
        <Text type="secondary">选择专项类别和练习模式，开始你的面试训练</Text>

        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 练习类型选择 */}
            <div>
              <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                0. 选择练习类型
              </Text>
              <Radio.Group 
                value={practiceMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setPracticeMode(mode);
                  if (mode === 'weakness') {
                    // 加载弱点列表
                    loadWeaknesses();
                  } else if (mode === 'school-round') {
                    // 加载学校列表
                    loadSchools();
                  } else {
                    // 切换到自由练习时清空弱点相关状态
                    setSelectedWeaknessId(null);
                    setSelectedMaterialId(null);
                    setMaterials([]);
                  }
                }}
              >
                <Space>
                  <Radio value="free">自由练习</Radio>
                  <Radio value="weakness">弱点专项练习</Radio>
                  <Radio value="school-round">学校-轮次模拟面试</Radio>
                </Space>
              </Radio.Group>
            </div>

            <Divider />

            {/* 弱点专项练习模式 */}
            {practiceMode === 'weakness' && (
              <>
                <div>
                  <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                    1. 选择弱点
                  </Text>
                  <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请选择要练习的弱点"
                    value={selectedWeaknessId}
                    onChange={(value) => {
                      setSelectedWeaknessId(value);
                      // 加载该弱点关联的素材
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
                      2. 选择学习素材（可选）
                    </Text>
                    <Select
                      size="large"
                      style={{ width: '100%' }}
                      placeholder="选择相关学习素材（可选）"
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
                    message="已选择学习素材"
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

            {/* 学校-轮次模拟面试模式 */}
            {practiceMode === 'school-round' && (
              <>
                <div>
                  <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                    1. 选择目标学校
                  </Text>
                  <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请选择目标学校"
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
                    2. 选择面试轮次
                  </Text>
                  <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请选择面试轮次"
                    value={selectedInterviewRound}
                    onChange={setSelectedInterviewRound}
                    allowClear
                  >
                    <Select.Option value="first-round">第一轮</Select.Option>
                    <Select.Option value="second-round">第二轮</Select.Option>
                    <Select.Option value="final-round">最终轮</Select.Option>
                  </Select>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    如果不选择轮次，将基于该学校的所有历史数据生成题目
                  </Text>
                </div>
              </>
            )}

            {/* 自由练习模式 */}
            {practiceMode === 'free' && (
              <div>
                <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                  1. 选择专项类别
                </Text>
                <Select
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="请选择专项类别"
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES}
                />
              </div>
            )}

            {/* 题目数量 */}
            <div>
              <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                2. 题目数量
              </Text>
              <Radio.Group value={questionCount} onChange={(e) => setQuestionCount(e.target.value)}>
                <Radio.Button value={5}>5题</Radio.Button>
                <Radio.Button value={10}>10题</Radio.Button>
                <Radio.Button value={15}>15题</Radio.Button>
                <Radio.Button value={20}>20题</Radio.Button>
              </Radio.Group>
            </div>

            {/* 练习模式 */}
            <div>
              <Text strong style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                3. 练习模式
              </Text>
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="text_qa">
                    <Text strong>文字问答</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      逐题作答，提交后查看反馈
                    </Text>
                  </Radio>
                  <Radio value="ai_interview" disabled>
                    <Text strong>AI模拟面试</Text>
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      开发中
                    </Tag>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      实时对话，AI扮演面试官
                    </Text>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>

            <Divider />

            {/* 开始按钮 */}
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
              {practiceMode === 'weakness' ? '开始弱点专项练习' :
               practiceMode === 'school-round' ? '开始模拟面试' :
               '开始练习'}
            </Button>
          </Space>
        </Card>
      </div>
    )
  }

  // 练习界面
  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* 任务模式横幅 */}
      {practiceMode === 'task' && taskInfo && (
        <Alert
          message={
            <Space>
              <ClockCircleOutlined />
              <Text strong>任务练习</Text>
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
                {CATEGORIES.find((c) => c.value === taskInfo.category)?.label}
              </Text>
              <Divider type="vertical" />
              <Text>{taskInfo.duration}分钟</Text>
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

      {/* 顶部进度 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="blue">
                {CATEGORIES.find((c) => c.value === category)?.label}
              </Tag>
              <Text strong>
                第 {currentIndex + 1} / {questions.length} 题
              </Text>
            </Space>
            <Text type="secondary">{Math.round(progress)}% 完成</Text>
          </div>
          <Progress percent={progress} showInfo={false} />
        </Space>
      </Card>

      {/* 弱点专项练习：显示相关素材提示 */}
      {practiceMode === 'weakness' && selectedMaterialId && (
        <Alert
          message="相关学习素材"
          description={
            <div>
              <Text>{materials.find(m => m.id === selectedMaterialId)?.title}</Text>
              <Button 
                type="link" 
                size="small" 
                onClick={() => {
                  // 在新窗口打开素材详情
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

      {/* 题目卡片 */}
      {currentQuestion ? (
        <Card
          title={
            <Space>
              <BookOutlined />
              题目 {currentIndex + 1}
              {currentQuestion.difficulty && (
                <Tag color={currentQuestion.difficulty === 'hard' ? 'red' : 'blue'}>
                  {currentQuestion.difficulty === 'easy' && '简单'}
                  {currentQuestion.difficulty === 'medium' && '中等'}
                  {currentQuestion.difficulty === 'hard' && '困难'}
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
            
            {/* 语音输入组件 */}
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
                  console.error('语音识别错误:', error)
                  message.error(`语音识别失败: ${error.message}`)
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
                : '提示：可以使用语音输入或手动输入答案，尽量详细、有条理地回答问题'}
            </Text>
          </div>

          {/* AI即时反馈区域 */}
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
                    <Text>综合评分：</Text>
                    <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>
                      {feedbacks[currentIndex].score}/10
                    </Tag>
                  </div>
                )}

                {feedbacks[currentIndex].strengths && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#52c41a' }}>✅ 优点：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].strengths}
                    </Paragraph>
                  </div>
                )}

                {feedbacks[currentIndex].weaknesses && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#faad14' }}>⚠️ 待改进：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].weaknesses}
                    </Paragraph>
                  </div>
                )}

                {feedbacks[currentIndex].suggestions && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: '#1890ff' }}>💡 建议：</Text>
                    <Paragraph style={{ marginTop: 4, marginLeft: 16, marginBottom: 8 }}>
                      {feedbacks[currentIndex].suggestions}
                    </Paragraph>
                    {/* 弱点专项练习：显示素材相关建议 */}
                    {practiceMode === 'weakness' && selectedMaterialId && (
                      <Alert
                        message="学习素材建议"
                        description={
                          <div>
                            <Text>
                              建议参考学习素材：{materials.find(m => m.id === selectedMaterialId)?.title}
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
                    <Text strong style={{ color: '#722ed1' }}>🤔 参考思路：</Text>
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
                    <Text strong style={{ color: '#722ed1' }}>📝 参考答案：</Text>
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
          <Empty description="暂无题目" />
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
            上一题
          </Button>

          <Space>
            <Button onClick={() => navigate('/')}>
              {sessionData?.status === 'completed' ? '返回' : '暂停练习'}
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
            下一题
          </Button>
        </Space>
      </Card>
    </div>
  )
}
