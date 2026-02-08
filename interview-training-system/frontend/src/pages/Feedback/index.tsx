import { useState, useEffect } from 'react'
import {
  Card,
  List,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
  Divider,
  Row,
  Col,
  Collapse,
  message,
  Modal,
} from 'antd'
import {
  CheckCircleOutlined,
  BookOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../utils/api'
import { useAiThinking } from '../../hooks/useAiThinking'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

// 專項類別映射（統一处理 logic-thinking 和 logical-thinking）
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口語',
  'chinese-expression': '中文表達',
  'chinese-oral': '中文表達', // 兼容舊數據
  'logic-thinking': '邏輯思維',
  'logical-thinking': '邏輯思維', // 兼容舊數據
  'current-affairs': '時事常識',
  'science-knowledge': '科學常識',
  'personal-growth': '个人成長',
  'group-discussion': '小組討論',
}

interface Session {
  id: string
  category: string
  mode: string
  start_time: string
  end_time: string | null
  status: string
  question_count?: number
}

interface QARecord {
  id: string
  question_id?: number
  question_text: string
  answer_text: string
  ai_feedback: any
  created_at: string
  is_placeholder?: boolean // 標記是否为占位記錄（未提交答案的題目）
}

interface SessionDetail {
  session: Session
  qa_records: QARecord[]
  total_answered: number
  total_questions?: number
  question_ids?: number[]
}

export default function Feedback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session')
  const { executeWithThinking } = useAiThinking()

  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(sessionIdFromUrl)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [generatingFeedback, setGeneratingFeedback] = useState(false)
  const [targetSchool, setTargetSchool] = useState<string>('SPCC') // 默认值，從设置中加载

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

  // 加载會話列表
  useEffect(() => {
    loadSessions()
  }, [])

  // 加载選中會話的详情
  useEffect(() => {
    if (selectedSession) {
      loadSessionDetail(selectedSession)
    }
  }, [selectedSession])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const res = await api.sessions.recent(50)
      let data = res.success ? res.data : []
      
      // 前端去重：確保没有重复的會話ID
      const sessionMap = new Map<string, Session>()
      data.forEach((session: Session) => {
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, session)
        }
      })
      
      // 過滤：保留有題目、有問答記錄或正在進行中的會話
      const uniqueSessions = Array.from(sessionMap.values())
        .filter((s: Session) => {
          // 保留有題目的會話，或者正在進行中的會話（可能还没有題目）
          return (s.question_count || 0) > 0 || s.status === 'in_progress'
        })
        .sort((a: Session, b: Session) => {
          // 先按狀態排序（進行中的在前），再按時間倒序排序
          if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
          if (a.status !== 'in_progress' && b.status === 'in_progress') return 1
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        })
      
      setSessions(uniqueSessions)

      // 如果URL中有session參數且没有選中，則選中它
      if (sessionIdFromUrl && !selectedSession) {
        setSelectedSession(sessionIdFromUrl)
      } else if (!selectedSession && uniqueSessions.length > 0) {
        // 否則選中第一个
        setSelectedSession(uniqueSessions[0].id)
      }
    } catch (error) {
      console.error('加载會話列表失敗:', error)
      message.error('加载會話列表失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadSessionDetail = async (sessionId: string) => {
    try {
      setLoading(true)
      const res = await api.sessions.get(sessionId)
      const detail = res.success ? res.data : null
      
      if (detail) {
        // 調試日志：查看原始數據
        console.log('📊 會話详情原始數據:', {
          sessionId,
          question_ids: detail.question_ids,
          qa_records_count: detail.qa_records?.length || 0,
          qa_records: detail.qa_records
        })
        
        // 統一類別名称：将 logical-thinking 转换为 logic-thinking
        if (detail.session?.category === 'logical-thinking') {
          detail.session.category = 'logic-thinking'
        }
        
        // 確保 qa_records 存在且是數組
        if (!detail.qa_records || !Array.isArray(detail.qa_records)) {
          console.warn('⚠️ qa_records 不存在或不是數組，初始化为空數組')
          detail.qa_records = []
        }
        
        // 如果有 question_ids 但没有 qa_records，尝試获取題目详情
        if (detail.question_ids && Array.isArray(detail.question_ids) && detail.question_ids.length > 0 && detail.qa_records.length === 0) {
          try {
            // 尝試批量获取題目详情
            const questionPromises = detail.question_ids.map((qid: number) => 
              api.questions.get(String(qid)).catch(() => null)
            )
            const questionResults = await Promise.all(questionPromises)
            
            // 为每个題目創建占位記錄
            detail.qa_records = detail.question_ids.map((qid: number, index: number) => {
              const questionResult = questionResults[index]
              const question = questionResult?.success ? questionResult.data : null
              
              return {
                question_id: qid,
                question_text: question?.question_text || `題目 ID: ${qid}（暫无答案）`,
                answer_text: '',
                ai_feedback: null,
                created_at: null,
                id: `placeholder_${qid}`,
                is_placeholder: true
              }
            })
          } catch (error) {
            console.warn('获取題目详情失敗:', error)
            // 如果获取失敗，仍然創建占位記錄
            detail.qa_records = detail.question_ids.map((qid: number) => ({
              question_id: qid,
              question_text: `題目 ID: ${qid}（暫无答案）`,
              answer_text: '',
              ai_feedback: null,
              created_at: null,
              id: `placeholder_${qid}`,
              is_placeholder: true
            }))
          }
        }
        
        // 简化邏輯：優先显示所有記錄，按 question_id 去重（如果有）
        // 先收集所有記錄，按 question_id 去重（保留最新的）
        const recordsMap = new Map<string, any>()
        detail.qa_records.forEach((record: any) => {
          let key: string
          if (record.question_id !== null && record.question_id !== undefined) {
            // 統一转换为字符串作为 key（避免類型不匹配）
            key = `qid_${record.question_id}`
          } else {
            // 没有 question_id 的記錄，使用 id
            key = `id_${record.id}`
          }
          
          const existing = recordsMap.get(key)
          if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
            recordsMap.set(key, record)
          }
        })
        
        // 如果有 question_ids，按顺序排列；否則按創建時間排序
        let finalRecords: any[] = []
        
        if (detail.question_ids && Array.isArray(detail.question_ids) && detail.question_ids.length > 0) {
          // 按 question_ids 的顺序排列
          const recordsByQuestionId = new Map<number, any>()
          recordsMap.forEach((record) => {
            if (record.question_id !== null && record.question_id !== undefined) {
              const qid = typeof record.question_id === 'string' 
                ? parseInt(record.question_id, 10) 
                : record.question_id
              if (!isNaN(qid)) {
                recordsByQuestionId.set(qid, record)
              }
            }
          })
          
          // 先收集所有缺失的 question_id（没有對应記錄的）
          const missingQuestionIds: number[] = []
          detail.question_ids.forEach((qid: any) => {
            const qidNum = typeof qid === 'string' ? parseInt(qid, 10) : qid
            if (!isNaN(qidNum) && !recordsByQuestionId.has(qidNum)) {
              missingQuestionIds.push(qidNum)
            }
          })
          
          // 批量获取缺失題目的详情
          const questionDetailsMap = new Map<number, any>()
          if (missingQuestionIds.length > 0) {
            try {
              const questionPromises = missingQuestionIds.map((qid: number) => 
                api.questions.get(String(qid)).catch(() => null)
              )
              const questionResults = await Promise.all(questionPromises)
              
              questionResults.forEach((result, index) => {
                const qid = missingQuestionIds[index]
                if (result?.success && result.data) {
                  questionDetailsMap.set(qid, result.data)
                }
              })
            } catch (error) {
              console.warn('获取題目详情失敗:', error)
            }
          }
          
          // 按 question_ids 的顺序添加記錄（包括占位記錄）
          detail.question_ids.forEach((qid: any) => {
            const qidNum = typeof qid === 'string' ? parseInt(qid, 10) : qid
            if (!isNaN(qidNum)) {
              const record = recordsByQuestionId.get(qidNum)
              if (record) {
                finalRecords.push(record)
                recordsByQuestionId.delete(qidNum) // 已添加，從 map 中移除
              } else {
                // 創建占位記錄，使用实际的題目內容（如果获取到了）
                const questionDetail = questionDetailsMap.get(qidNum)
                finalRecords.push({
                  question_id: qidNum,
                  question_text: questionDetail?.question_text || `題目 ID: ${qidNum}（暫无答案）`,
                  answer_text: '',
                  ai_feedback: null,
                  created_at: null,
                  id: `placeholder_${qidNum}`,
                  is_placeholder: true
                })
              }
            }
          })
          
          // 添加剩余的記錄（不在 question_ids 中的，如编號16的情况）
          recordsByQuestionId.forEach((record) => {
            finalRecords.push(record)
          })
          
          // 添加没有 question_id 的記錄
          recordsMap.forEach((record, key) => {
            if (key.startsWith('id_') && !finalRecords.find(r => r.id === record.id)) {
              finalRecords.push(record)
            }
          })
        } else {
          // 没有 question_ids，按創建時間排序
          finalRecords = Array.from(recordsMap.values()).sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
        }
        
        // 解析反馈數據（確保正確解析 JSON 字符串）
        detail.qa_records = finalRecords.map((record: any) => {
          const parsed = parseFeedbackData(record)
          // 調試日志：檢查解析後的數據
          if (parsed.ai_feedback) {
            console.log(`✅ 解析反馈數據成功 (記錄ID: ${parsed.id}):`, {
              recordId: parsed.id,
              hasFeedback: !!parsed.ai_feedback,
              feedbackType: typeof parsed.ai_feedback,
              feedbackKeys: typeof parsed.ai_feedback === 'object' ? Object.keys(parsed.ai_feedback) : null
            })
          }
          return parsed
        })
        
        // 更新 total_questions
        if (detail.question_ids && Array.isArray(detail.question_ids) && detail.question_ids.length > 0) {
          detail.total_questions = Math.max(detail.question_ids.length, finalRecords.length)
        } else {
          detail.total_questions = finalRecords.length
        }
      }
      
      setSessionDetail(detail)
    } catch (error) {
      console.error('加载會話详情失敗:', error)
      message.error('加载會話详情失敗')
    } finally {
      setLoading(false)
    }
  }

  // 解析反馈數據的辅助函數（防御性解析）
  const parseFeedbackData = (record: any): any => {
    if (!record.ai_feedback) {
      return record
    }
    
    try {
      // 如果已经是對象，直接返回
      if (typeof record.ai_feedback === 'object' && record.ai_feedback !== null) {
        return record
      }
      
      // 如果是字符串，尝試解析
      if (typeof record.ai_feedback === 'string') {
        // 檢查是否為空字符串
        if (record.ai_feedback.trim() === '') {
          return { ...record, ai_feedback: null }
        }
        const parsed = JSON.parse(record.ai_feedback)
        // 確保解析後的數據是對象
        if (parsed && typeof parsed === 'object') {
          return { ...record, ai_feedback: parsed }
        } else {
          console.warn(`解析反馈數據格式異常 (記錄ID: ${record.id}): 解析後不是對象`, parsed)
          return { ...record, ai_feedback: null }
        }
      }
    } catch (error) {
      console.warn(`解析反馈數據失敗 (記錄ID: ${record.id}):`, error)
      console.warn(`原始數據類型: ${typeof record.ai_feedback}`, record.ai_feedback)
      // 解析失敗時，返回原記錄但将 ai_feedback 设为 null，避免页面崩溃
      return { ...record, ai_feedback: null }
    }
    
    return record
  }

  // 生成AI反馈
  const generateFeedback = async (recordId: string | number, questionText: string, answerText: string) => {
    // 確保 recordId 是字符串類型
    const recordIdStr = String(recordId || '')
    
    console.log('🔍 [Feedback] generateFeedback 被調用:', { 
      recordId: recordIdStr,
      recordIdType: typeof recordId,
      questionText: questionText?.substring(0, 30), 
      answerText: answerText?.substring(0, 30),
      hasSessionDetail: !!sessionDetail,
      selectedSession
    })
    
    // 基本驗證
    if (!sessionDetail) {
      const errorMsg = '無法生成反饋：會話詳情未加載'
      console.error('❌', errorMsg)
      message.error(errorMsg)
      return
    }
    
    // 驗證 recordId（確保是字符串後再檢查）
    if (!recordIdStr || recordIdStr === 'undefined' || recordIdStr === 'null' || recordIdStr.startsWith('placeholder_')) {
      const errorMsg = '無法生成反饋：記錄ID無效'
      console.error('❌', errorMsg, { recordId, recordIdStr })
      message.error(errorMsg)
      return
    }
    
    const trimmedQuestionText = questionText?.trim() || ''
    const trimmedAnswerText = answerText?.trim() || ''
    
    if (!trimmedQuestionText) {
      const errorMsg = '無法生成反饋：問題文本為空'
      console.error('❌', errorMsg, { recordId, questionText })
      message.error(errorMsg)
      return
    }
    
    if (!trimmedAnswerText) {
      const errorMsg = '無法生成反饋：答案文本為空'
      console.error('❌', errorMsg, { recordId, answerText })
      message.error(errorMsg)
      return
    }
    
    if (!sessionDetail.session?.category) {
      const errorMsg = '無法生成反饋：會話類別未設置'
      console.error('❌', errorMsg, { sessionDetail })
      message.error(errorMsg)
      return
    }
    
    // 確保 executeWithThinking 存在
    if (!executeWithThinking) {
      console.error('❌ executeWithThinking 未定義！')
      message.error('系統錯誤：AI思考組件未初始化')
      return
    }
    
    try {
      setGeneratingFeedback(true)
      console.log(`✅ [Feedback] 參數驗證通過，開始生成反饋`)
      console.log(`📋 [Feedback] 參數詳情:`, {
        recordId: recordIdStr,
        sessionId: selectedSession,
        category: sessionDetail.session.category,
        questionTextLength: trimmedQuestionText.length,
        answerTextLength: trimmedAnswerText.length
      })
      
      // 強制顯示浮窗測試
      console.log('🔄 [Feedback] 調用 executeWithThinking...')
      console.log('🔍 [Feedback] executeWithThinking 類型:', typeof executeWithThinking)
      
      const result = await executeWithThinking(
        'generate-feedback',
        async () => {
          console.log('📤 [Feedback] 發送 API 請求...')
          try {
            const response = await api.feedback.generate({
              session_id: selectedSession,
              record_id: recordIdStr, // 使用字符串類型的 recordId
              question_text: trimmedQuestionText,
              answer_text: trimmedAnswerText,
              category: sessionDetail.session.category,
              target_school: targetSchool,
            });
            console.log('📥 [Feedback] API 響應:', response)
            return response
          } catch (apiError: any) {
            console.error('❌ [Feedback] API 請求失敗:', apiError)
            throw apiError
          }
        },
        {
          taskName: '生成AI反馈',
          onSuccess: async (response) => {
            console.log('✅ [Feedback] 反饋生成成功:', response)
            message.success('反馈生成成功')
            // 重新加载會話详情，確保獲取最新的反饋數據
            if (selectedSession) {
              // 等待一小段時間確保後端數據已保存
              await new Promise(resolve => setTimeout(resolve, 300))
              // 重新加載會話詳情，確保獲取最新的反饋數據
              await loadSessionDetail(selectedSession)
            }
          },
          onError: (error: any) => {
            console.error('❌ [Feedback] 生成反馈失敗:', error)
            const errorMsg = error.response?.data?.error?.message || error.response?.data?.message || '生成反馈失敗'
            message.error(errorMsg)
          },
        }
      );
      console.log('✅ [Feedback] executeWithThinking 完成:', result)
    } catch (error: any) {
      console.error('❌ [Feedback] generateFeedback 異常:', error)
      message.error('生成反馈時發生異常：' + (error.message || '未知錯誤'))
    } finally {
      setGeneratingFeedback(false)
      console.log('🏁 [Feedback] generateFeedback 結束')
    }
  }

  // 删除練習記錄
  const deleteSession = async (sessionId: string) => {
    Modal.confirm({
      title: '確认删除練習記錄',
      content: (
        <div>
          <p>確定要删除这条練習記錄吗？</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            ⚠️ 警告：删除後将无法恢复，包括所有答案和反馈！
          </p>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.sessions.delete(sessionId)
          message.success('練習記錄已删除')
          // 重新加载會話列表
          await loadSessions()
          // 如果删除的是当前選中的會話，清空選擇
          if (selectedSession === sessionId) {
            setSelectedSession(null)
            setSessionDetail(null)
          }
        } catch (error: any) {
          console.error('删除練習記錄失敗:', error)
          message.error(error.response?.data?.message || '删除練習記錄失敗')
        }
      },
    })
  }

  // 删除反馈
  const deleteFeedback = async (recordId: string) => {
    Modal.confirm({
      title: '確认删除',
      content: '確定要删除这条反馈吗？删除後可以重新生成。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.feedback.deleteRecord(recordId)
          message.success('反馈已删除')
          // 重新加载會話详情
          if (selectedSession) {
            await loadSessionDetail(selectedSession)
          }
        } catch (error: any) {
          console.error('删除反馈失敗:', error)
          message.error(error.response?.data?.message || '删除反馈失敗')
        }
      },
    })
  }

  // 批量删除會話的所有反馈
  const deleteAllFeedbacks = async () => {
    if (!selectedSession) return

    Modal.confirm({
      title: '確认批量删除',
      content: '確定要删除该會話的所有反馈吗？删除後可以重新生成。',
      okText: '删除全部',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await api.feedback.deleteSession(selectedSession)
          const deletedCount = res.data.deleted_count || 0
          message.success(`已删除 ${deletedCount} 条反馈`)
          // 重新加载會話详情
          await loadSessionDetail(selectedSession)
        } catch (error: any) {
          console.error('批量删除反馈失敗:', error)
          message.error(error.response?.data?.message || '批量删除反馈失敗')
        }
      },
    })
  }

  if (loading && sessions.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <CheckCircleOutlined style={{ marginRight: 8 }} />
          查看反馈
        </Title>
        <Card style={{ marginTop: 24 }}>
          <Empty
            description="暫无練習記錄"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/practice')}>
              開始練習
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <CheckCircleOutlined style={{ marginRight: 8 }} />
        查看反馈
      </Title>

      <Row gutter={16} style={{ marginTop: 24 }}>
        {/* 左侧：會話列表 */}
        <Col xs={24} lg={8}>
          <Card title="練習記錄" size="small">
            <List
              dataSource={sessions}
              loading={loading}
              renderItem={(session) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: selectedSession === session.id ? '#e6f7ff' : 'transparent',
                    padding: '12px',
                    borderRadius: 4,
                  }}
                >
                  <div 
                    style={{ flex: 1 }}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>
                            {CATEGORY_MAP[session.category] || session.category}
                          </Text>
                          {(session as any).task_id ? (
                            <Tag color="blue">任務練習</Tag>
                          ) : (
                            <Tag color="green">自由練習</Tag>
                          )}
                          {session.question_count && session.question_count > 0 && (
                            <Tag>{session.question_count}題</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(session.start_time).toLocaleString('zh-CN')}
                          </Text>
                          <Tag
                            color={
                              session.status === 'completed'
                                ? 'success'
                                : session.status === 'in_progress'
                                ? 'processing'
                                : 'default'
                            }
                            style={{ marginTop: 4 }}
                          >
                            {session.status === 'completed' && '已完成'}
                            {session.status === 'in_progress' && '進行中'}
                            {session.status === 'paused' && '已暫停'}
                          </Tag>
                        </Space>
                      }
                    />
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    删除
                  </Button>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧：反馈详情 */}
        <Col xs={24} lg={16}>
          {sessionDetail ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 會話概览 */}
              <Card
                title="會話概览"
                extra={
                  <Tag color="blue">
                    {CATEGORY_MAP[sessionDetail.session.category]}
                  </Tag>
                }
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">題目數量</Text>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {sessionDetail.total_questions || sessionDetail.qa_records?.length || 0}
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">練習時長</Text>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {sessionDetail.session.end_time
                          ? Math.round(
                              (new Date(sessionDetail.session.end_time).getTime() -
                                new Date(sessionDetail.session.start_time).getTime()) /
                                60000
                            )
                          : '-'}
                        分鐘
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">狀態</Text>
                      <div style={{ marginTop: 8 }}>
                        <Tag
                          color={sessionDetail.session.status === 'completed' ? 'success' : 'processing'}
                          style={{ fontSize: 14 }}
                        >
                          {sessionDetail.session.status === 'completed' ? '已完成' : '進行中'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 問答详情 */}
              <Card 
                title="問答详情"
                extra={
                  sessionDetail.qa_records.some((r: any) => r.ai_feedback) && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={deleteAllFeedbacks}
                    >
                      删除全部反馈
                    </Button>
                  )
                }
              >
                {!sessionDetail.qa_records || sessionDetail.qa_records.length === 0 ? (
                  <Empty 
                    description={
                      <div>
                        <p>暫无問答記錄</p>
                        <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                          調試信息: qa_records = {sessionDetail.qa_records ? `${sessionDetail.qa_records.length} 条` : 'undefined'}
                        </p>
                      </div>
                    } 
                  />
                ) : (
                  <Collapse accordion>
                    {sessionDetail.qa_records.map((record, index) => {
                      // 計算總題目數
                      const totalQuestions = sessionDetail.total_questions || sessionDetail.qa_records.length
                      return (
                        <Panel
                          header={
                            <Space>
                              <Text strong>第 {index + 1} / {totalQuestions} 題</Text>
                              {record.ai_feedback ? (
                                <Tag color="success" icon={<CheckCircleOutlined />}>
                                  已反馈
                                </Tag>
                              ) : (
                                <Tag color="default">未反馈</Tag>
                              )}
                            </Space>
                          }
                          key={record.id || record.question_id || index}
                        >
                        {/* 問題 */}
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ fontSize: 15 }}>
                            <BookOutlined style={{ marginRight: 8 }} />
                            問題：
                          </Text>
                          <Paragraph style={{ marginTop: 8, marginLeft: 24 }}>
                            {record.question_text}
                          </Paragraph>
                        </div>

                        <Divider />

                        {/* 你的回答 */}
                        {record.is_placeholder ? (
                          <div style={{ marginBottom: 16, padding: 16, background: '#fffbe6', borderRadius: 4, border: '1px solid #ffe58f' }}>
                            <Text type="warning">
                              ⚠️ 此題目尚未提交答案
                            </Text>
                            <div style={{ marginTop: 8 }}>
                              <Button 
                                type="primary" 
                                onClick={() => {
                                  // 傳递 session 和 question_id，让 practice 页面能定位到正確的題目
                                  const questionId = record.question_id
                                  // 確保 questionId 是數字類型
                                  const questionIdNum = typeof questionId === 'string' 
                                    ? parseInt(questionId, 10) 
                                    : questionId
                                  
                                  console.log(`🔗 跳转到練習页面: session=${selectedSession}, question_id=${questionIdNum} (原始: ${questionId}, 類型: ${typeof questionId})`)
                                  
                                  if (questionIdNum && !isNaN(questionIdNum)) {
                                    navigate(`/practice?session=${selectedSession}&question=${questionIdNum}`)
                                  } else {
                                    console.warn(`⚠️ 无效的 question_id: ${questionId}, 只傳递 session`)
                                    navigate(`/practice?session=${selectedSession}`)
                                  }
                                }}
                              >
                                前往練習页面提交答案
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 15 }}>
                              你的回答：
                            </Text>
                            <Paragraph
                              style={{
                                marginTop: 8,
                                padding: 12,
                                background: '#f5f5f5',
                                borderRadius: 4,
                              }}
                            >
                              {record.answer_text || '（无答案）'}
                            </Paragraph>
                          </div>
                        )}

                        {/* AI反馈 */}
                        {(() => {
                          // 調試：检查反馈數據
                          console.log('反馈數據检查:', {
                            recordId: record.id,
                            hasAiFeedback: !!record.ai_feedback,
                            aiFeedbackType: typeof record.ai_feedback,
                            aiFeedbackValue: record.ai_feedback
                          })
                          
                          // 检查是否有反馈數據（支持對象、字符串、null等多種情况）
                          const hasFeedback = record.ai_feedback && 
                            (typeof record.ai_feedback === 'object' || typeof record.ai_feedback === 'string')
                          
                          if (hasFeedback && typeof record.ai_feedback === 'object' && record.ai_feedback !== null) {
                            // 反馈是對象格式，正常显示
                            return (
                              <div
                                style={{
                                  marginTop: 16,
                                  padding: 16,
                                  background: '#e6f7ff',
                                  borderRadius: 4,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text strong style={{ fontSize: 15, color: '#1890ff' }}>
                                    <ThunderboltOutlined style={{ marginRight: 8 }} />
                                    AI反馈
                                  </Text>
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    onClick={() => deleteFeedback(record.id)}
                                    style={{ fontSize: 12 }}
                                  >
                                    删除反馈
                                  </Button>
                                </div>
                                <div style={{ marginTop: 12 }}>
                                  {record.ai_feedback.score && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text>综合評分：</Text>
                                      <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>
                                        {record.ai_feedback.score}/10
                                      </Tag>
                                    </div>
                                  )}
                                  {record.ai_feedback.overall_score && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text>總体評分：</Text>
                                      <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>
                                        {record.ai_feedback.overall_score}/100
                                      </Tag>
                                    </div>
                                  )}
                                  {record.ai_feedback.strengths && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong>優點：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.strengths}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.weaknesses && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong>待改進：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.weaknesses}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.suggestions && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong>建議：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.suggestions}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.reference_thinking && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong style={{ color: '#722ed1' }}>🤔 參考思路：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.reference_thinking}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.reference_answer && (
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
                                        {record.ai_feedback.reference_answer}
                                      </Paragraph>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          } else if (record.ai_feedback && typeof record.ai_feedback === 'string') {
                            // 反馈是字符串格式，尝試解析
                            try {
                              const parsed = JSON.parse(record.ai_feedback)
                              if (parsed && typeof parsed === 'object') {
                                // 解析成功，但为了简化，提示用户刷新页面以看到正確格式
                                return (
                                  <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4, border: '1px solid #ffe58f' }}>
                                    <Text type="warning">
                                      ⚠️ 反馈數據需要重新加载，请刷新页面
                                    </Text>
                                  </div>
                                )
                              }
                            } catch (e) {
                              console.warn('解析反馈字符串失敗:', e)
                            }
                            return (
                              <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4, border: '1px solid #ffe58f' }}>
                                <Text type="warning">
                                  ⚠️ 反馈數據格式异常，请重新生成反馈
                                </Text>
                                <Button
                                  type="primary"
                                  icon={<ThunderboltOutlined />}
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('🖱️ [Feedback] 點擊重新生成反馈按鈕')
                                    console.log('📋 [Feedback] 記錄信息:', {
                                      recordId: record.id,
                                      recordType: typeof record.id,
                                      questionText: record.question_text?.substring(0, 30),
                                      answerText: record.answer_text?.substring(0, 30),
                                      hasQuestionText: !!record.question_text,
                                      hasAnswerText: !!record.answer_text,
                                      questionTextLength: record.question_text?.length || 0,
                                      answerTextLength: record.answer_text?.length || 0,
                                    })
                                    
                                    // 驗證參數
                                    if (!record.question_text || !record.question_text.trim()) {
                                      const errorMsg = '無法生成反饋：問題文本為空'
                                      console.error('❌ [Feedback]', errorMsg)
                                      message.error(errorMsg)
                                      return
                                    }
                                    
                                    if (!record.answer_text || !record.answer_text.trim()) {
                                      const errorMsg = '無法生成反饋：答案文本為空'
                                      console.error('❌ [Feedback]', errorMsg)
                                      message.error(errorMsg)
                                      return
                                    }
                                    
                                    if (!record.id) {
                                      const errorMsg = '無法生成反饋：記錄ID為空'
                                      console.error('❌ [Feedback]', errorMsg)
                                      message.error(errorMsg)
                                      return
                                    }
                                    
                                    console.log('✅ [Feedback] 參數驗證通過，調用 generateFeedback')
                                    try {
                                      await generateFeedback(record.id, record.question_text, record.answer_text)
                                    } catch (err: any) {
                                      console.error('❌ [Feedback] generateFeedback 調用異常:', err)
                                      message.error('調用生成反饋函數時發生錯誤：' + (err.message || '未知錯誤'))
                                    }
                                  }}
                                  loading={generatingFeedback}
                                  disabled={generatingFeedback}
                                  style={{ marginTop: 8 }}
                                  size="small"
                                >
                                  重新生成反馈
                                </Button>
                              </div>
                            )
                          } else if (!record.is_placeholder) {
                            // 没有反馈且不是占位記錄，显示生成按钮
                            return (
                              <Button
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('🖱️ [Feedback] 點擊生成AI反馈按鈕')
                                  console.log('📋 [Feedback] 記錄信息:', {
                                    recordId: record.id,
                                    recordType: typeof record.id,
                                    questionText: record.question_text?.substring(0, 30),
                                    answerText: record.answer_text?.substring(0, 30),
                                    hasQuestionText: !!record.question_text,
                                    hasAnswerText: !!record.answer_text,
                                    questionTextLength: record.question_text?.length || 0,
                                    answerTextLength: record.answer_text?.length || 0,
                                  })
                                  
                                  // 驗證參數
                                  if (!record.question_text || !record.question_text.trim()) {
                                    const errorMsg = '無法生成反饋：問題文本為空'
                                    console.error('❌ [Feedback]', errorMsg)
                                    message.error(errorMsg)
                                    return
                                  }
                                  
                                  if (!record.answer_text || !record.answer_text.trim()) {
                                    const errorMsg = '無法生成反饋：答案文本為空'
                                    console.error('❌ [Feedback]', errorMsg)
                                    message.error(errorMsg)
                                    return
                                  }
                                  
                                  if (!record.id) {
                                    const errorMsg = '無法生成反饋：記錄ID為空'
                                    console.error('❌ [Feedback]', errorMsg)
                                    message.error(errorMsg)
                                    return
                                  }
                                  
                                  console.log('✅ [Feedback] 參數驗證通過，調用 generateFeedback')
                                  try {
                                    await generateFeedback(record.id, record.question_text, record.answer_text)
                                  } catch (err: any) {
                                    console.error('❌ [Feedback] generateFeedback 調用異常:', err)
                                    message.error('調用生成反饋函數時發生錯誤：' + (err.message || '未知錯誤'))
                                  }
                                }}
                                loading={generatingFeedback}
                                disabled={generatingFeedback}
                                style={{ marginTop: 16 }}
                              >
                                生成AI反馈
                              </Button>
                            )
                          }
                          return null
                        })()}
                        </Panel>
                      )
                    })}
                  </Collapse>
                )}
              </Card>
            </Space>
          ) : (
            <Card>
              <Empty description="请選擇一个會話查看详情" />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}
