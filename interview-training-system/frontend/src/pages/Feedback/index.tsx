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

// 专项类别映射（统一处理 logic-thinking 和 logical-thinking）
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-expression': '中文表达',
  'chinese-oral': '中文表达', // 兼容旧数据
  'logic-thinking': '逻辑思维',
  'logical-thinking': '逻辑思维', // 兼容旧数据
  'current-affairs': '时事常识',
  'science-knowledge': '科学常识',
  'personal-growth': '个人成长',
  'group-discussion': '小组讨论',
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
  is_placeholder?: boolean // 标记是否为占位记录（未提交答案的题目）
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
  const [targetSchool, setTargetSchool] = useState<string>('SPCC') // 默认值，从设置中加载

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

  // 加载会话列表
  useEffect(() => {
    loadSessions()
  }, [])

  // 加载选中会话的详情
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
      
      // 前端去重：确保没有重复的会话ID
      const sessionMap = new Map<string, Session>()
      data.forEach((session: Session) => {
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, session)
        }
      })
      
      // 过滤：保留有题目、有问答记录或正在进行中的会话
      const uniqueSessions = Array.from(sessionMap.values())
        .filter((s: Session) => {
          // 保留有题目的会话，或者正在进行中的会话（可能还没有题目）
          return (s.question_count || 0) > 0 || s.status === 'in_progress'
        })
        .sort((a: Session, b: Session) => {
          // 先按状态排序（进行中的在前），再按时间倒序排序
          if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
          if (a.status !== 'in_progress' && b.status === 'in_progress') return 1
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        })
      
      setSessions(uniqueSessions)

      // 如果URL中有session参数且没有选中，则选中它
      if (sessionIdFromUrl && !selectedSession) {
        setSelectedSession(sessionIdFromUrl)
      } else if (!selectedSession && uniqueSessions.length > 0) {
        // 否则选中第一个
        setSelectedSession(uniqueSessions[0].id)
      }
    } catch (error) {
      console.error('加载会话列表失败:', error)
      message.error('加载会话列表失败')
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
        // 调试日志：查看原始数据
        console.log('📊 会话详情原始数据:', {
          sessionId,
          question_ids: detail.question_ids,
          qa_records_count: detail.qa_records?.length || 0,
          qa_records: detail.qa_records
        })
        
        // 统一类别名称：将 logical-thinking 转换为 logic-thinking
        if (detail.session?.category === 'logical-thinking') {
          detail.session.category = 'logic-thinking'
        }
        
        // 确保 qa_records 存在且是数组
        if (!detail.qa_records || !Array.isArray(detail.qa_records)) {
          console.warn('⚠️ qa_records 不存在或不是数组，初始化为空数组')
          detail.qa_records = []
        }
        
        // 如果有 question_ids 但没有 qa_records，尝试获取题目详情
        if (detail.question_ids && Array.isArray(detail.question_ids) && detail.question_ids.length > 0 && detail.qa_records.length === 0) {
          try {
            // 尝试批量获取题目详情
            const questionPromises = detail.question_ids.map((qid: number) => 
              api.questions.get(String(qid)).catch(() => null)
            )
            const questionResults = await Promise.all(questionPromises)
            
            // 为每个题目创建占位记录
            detail.qa_records = detail.question_ids.map((qid: number, index: number) => {
              const questionResult = questionResults[index]
              const question = questionResult?.success ? questionResult.data : null
              
              return {
                question_id: qid,
                question_text: question?.question_text || `题目 ID: ${qid}（暂无答案）`,
                answer_text: '',
                ai_feedback: null,
                created_at: null,
                id: `placeholder_${qid}`,
                is_placeholder: true
              }
            })
          } catch (error) {
            console.warn('获取题目详情失败:', error)
            // 如果获取失败，仍然创建占位记录
            detail.qa_records = detail.question_ids.map((qid: number) => ({
              question_id: qid,
              question_text: `题目 ID: ${qid}（暂无答案）`,
              answer_text: '',
              ai_feedback: null,
              created_at: null,
              id: `placeholder_${qid}`,
              is_placeholder: true
            }))
          }
        }
        
        // 简化逻辑：优先显示所有记录，按 question_id 去重（如果有）
        // 先收集所有记录，按 question_id 去重（保留最新的）
        const recordsMap = new Map<string, any>()
        detail.qa_records.forEach((record: any) => {
          let key: string
          if (record.question_id !== null && record.question_id !== undefined) {
            // 统一转换为字符串作为 key（避免类型不匹配）
            key = `qid_${record.question_id}`
          } else {
            // 没有 question_id 的记录，使用 id
            key = `id_${record.id}`
          }
          
          const existing = recordsMap.get(key)
          if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
            recordsMap.set(key, record)
          }
        })
        
        // 如果有 question_ids，按顺序排列；否则按创建时间排序
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
          
          // 先收集所有缺失的 question_id（没有对应记录的）
          const missingQuestionIds: number[] = []
          detail.question_ids.forEach((qid: any) => {
            const qidNum = typeof qid === 'string' ? parseInt(qid, 10) : qid
            if (!isNaN(qidNum) && !recordsByQuestionId.has(qidNum)) {
              missingQuestionIds.push(qidNum)
            }
          })
          
          // 批量获取缺失题目的详情
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
              console.warn('获取题目详情失败:', error)
            }
          }
          
          // 按 question_ids 的顺序添加记录（包括占位记录）
          detail.question_ids.forEach((qid: any) => {
            const qidNum = typeof qid === 'string' ? parseInt(qid, 10) : qid
            if (!isNaN(qidNum)) {
              const record = recordsByQuestionId.get(qidNum)
              if (record) {
                finalRecords.push(record)
                recordsByQuestionId.delete(qidNum) // 已添加，从 map 中移除
              } else {
                // 创建占位记录，使用实际的题目内容（如果获取到了）
                const questionDetail = questionDetailsMap.get(qidNum)
                finalRecords.push({
                  question_id: qidNum,
                  question_text: questionDetail?.question_text || `题目 ID: ${qidNum}（暂无答案）`,
                  answer_text: '',
                  ai_feedback: null,
                  created_at: null,
                  id: `placeholder_${qidNum}`,
                  is_placeholder: true
                })
              }
            }
          })
          
          // 添加剩余的记录（不在 question_ids 中的，如编号16的情况）
          recordsByQuestionId.forEach((record) => {
            finalRecords.push(record)
          })
          
          // 添加没有 question_id 的记录
          recordsMap.forEach((record, key) => {
            if (key.startsWith('id_') && !finalRecords.find(r => r.id === record.id)) {
              finalRecords.push(record)
            }
          })
        } else {
          // 没有 question_ids，按创建时间排序
          finalRecords = Array.from(recordsMap.values()).sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
        }
        
        // 解析反馈数据
        detail.qa_records = finalRecords.map((record: any) => {
          return parseFeedbackData(record)
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
      console.error('加载会话详情失败:', error)
      message.error('加载会话详情失败')
    } finally {
      setLoading(false)
    }
  }

  // 解析反馈数据的辅助函数（防御性解析）
  const parseFeedbackData = (record: any): any => {
    if (!record.ai_feedback) {
      return record
    }
    
    try {
      // 如果已经是对象，直接返回
      if (typeof record.ai_feedback === 'object' && record.ai_feedback !== null) {
        return record
      }
      
      // 如果是字符串，尝试解析
      if (typeof record.ai_feedback === 'string') {
        const parsed = JSON.parse(record.ai_feedback)
        return { ...record, ai_feedback: parsed }
      }
    } catch (error) {
      console.warn(`解析反馈数据失败 (记录ID: ${record.id}):`, error)
      // 解析失败时，返回原记录但将 ai_feedback 设为 null，避免页面崩溃
      return { ...record, ai_feedback: null }
    }
    
    return record
  }

  // 生成AI反馈
  const generateFeedback = async (recordId: string, questionText: string, answerText: string) => {
    if (!sessionDetail) return
    
    try {
      setGeneratingFeedback(true)
      await executeWithThinking(
        'generate-feedback',
        async () => {
          return await api.feedback.generate({
            session_id: selectedSession,
            record_id: recordId,
            question_text: questionText,
            answer_text: answerText,
            category: sessionDetail.session.category, // 从会话中获取类别
            target_school: targetSchool,
          });
        },
        {
          taskName: '生成AI反馈',
          onSuccess: async () => {
            message.success('反馈生成成功')
            // 重新加载会话详情
            if (selectedSession) {
              await loadSessionDetail(selectedSession)
            }
          },
          onError: (error: any) => {
            console.error('生成反馈失败:', error)
            message.error(error.response?.data?.message || '生成反馈失败')
          },
        }
      );
    } finally {
      setGeneratingFeedback(false)
    }
  }

  // 删除练习记录
  const deleteSession = async (sessionId: string) => {
    Modal.confirm({
      title: '确认删除练习记录',
      content: (
        <div>
          <p>确定要删除这条练习记录吗？</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            ⚠️ 警告：删除后将无法恢复，包括所有答案和反馈！
          </p>
        </div>
      ),
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.sessions.delete(sessionId)
          message.success('练习记录已删除')
          // 重新加载会话列表
          await loadSessions()
          // 如果删除的是当前选中的会话，清空选择
          if (selectedSession === sessionId) {
            setSelectedSession(null)
            setSessionDetail(null)
          }
        } catch (error: any) {
          console.error('删除练习记录失败:', error)
          message.error(error.response?.data?.message || '删除练习记录失败')
        }
      },
    })
  }

  // 删除反馈
  const deleteFeedback = async (recordId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条反馈吗？删除后可以重新生成。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.feedback.deleteRecord(recordId)
          message.success('反馈已删除')
          // 重新加载会话详情
          if (selectedSession) {
            await loadSessionDetail(selectedSession)
          }
        } catch (error: any) {
          console.error('删除反馈失败:', error)
          message.error(error.response?.data?.message || '删除反馈失败')
        }
      },
    })
  }

  // 批量删除会话的所有反馈
  const deleteAllFeedbacks = async () => {
    if (!selectedSession) return

    Modal.confirm({
      title: '确认批量删除',
      content: '确定要删除该会话的所有反馈吗？删除后可以重新生成。',
      okText: '删除全部',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await api.feedback.deleteSession(selectedSession)
          const deletedCount = res.data.deleted_count || 0
          message.success(`已删除 ${deletedCount} 条反馈`)
          // 重新加载会话详情
          await loadSessionDetail(selectedSession)
        } catch (error: any) {
          console.error('批量删除反馈失败:', error)
          message.error(error.response?.data?.message || '批量删除反馈失败')
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
            description="暂无练习记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/practice')}>
              开始练习
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
        {/* 左侧：会话列表 */}
        <Col xs={24} lg={8}>
          <Card title="练习记录" size="small">
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
                            <Tag color="blue">任务练习</Tag>
                          ) : (
                            <Tag color="green">自由练习</Tag>
                          )}
                          {session.question_count && session.question_count > 0 && (
                            <Tag>{session.question_count}题</Tag>
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
                            {session.status === 'in_progress' && '进行中'}
                            {session.status === 'paused' && '已暂停'}
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
              {/* 会话概览 */}
              <Card
                title="会话概览"
                extra={
                  <Tag color="blue">
                    {CATEGORY_MAP[sessionDetail.session.category]}
                  </Tag>
                }
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">题目数量</Text>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {sessionDetail.total_questions || sessionDetail.qa_records?.length || 0}
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">练习时长</Text>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                        {sessionDetail.session.end_time
                          ? Math.round(
                              (new Date(sessionDetail.session.end_time).getTime() -
                                new Date(sessionDetail.session.start_time).getTime()) /
                                60000
                            )
                          : '-'}
                        分钟
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary">状态</Text>
                      <div style={{ marginTop: 8 }}>
                        <Tag
                          color={sessionDetail.session.status === 'completed' ? 'success' : 'processing'}
                          style={{ fontSize: 14 }}
                        >
                          {sessionDetail.session.status === 'completed' ? '已完成' : '进行中'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 问答详情 */}
              <Card 
                title="问答详情"
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
                        <p>暂无问答记录</p>
                        <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                          调试信息: qa_records = {sessionDetail.qa_records ? `${sessionDetail.qa_records.length} 条` : 'undefined'}
                        </p>
                      </div>
                    } 
                  />
                ) : (
                  <Collapse accordion>
                    {sessionDetail.qa_records.map((record, index) => {
                      // 计算总题目数
                      const totalQuestions = sessionDetail.total_questions || sessionDetail.qa_records.length
                      return (
                        <Panel
                          header={
                            <Space>
                              <Text strong>第 {index + 1} / {totalQuestions} 题</Text>
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
                        {/* 问题 */}
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ fontSize: 15 }}>
                            <BookOutlined style={{ marginRight: 8 }} />
                            问题：
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
                              ⚠️ 此题目尚未提交答案
                            </Text>
                            <div style={{ marginTop: 8 }}>
                              <Button 
                                type="primary" 
                                onClick={() => {
                                  // 传递 session 和 question_id，让 practice 页面能定位到正确的题目
                                  const questionId = record.question_id
                                  // 确保 questionId 是数字类型
                                  const questionIdNum = typeof questionId === 'string' 
                                    ? parseInt(questionId, 10) 
                                    : questionId
                                  
                                  console.log(`🔗 跳转到练习页面: session=${selectedSession}, question_id=${questionIdNum} (原始: ${questionId}, 类型: ${typeof questionId})`)
                                  
                                  if (questionIdNum && !isNaN(questionIdNum)) {
                                    navigate(`/practice?session=${selectedSession}&question=${questionIdNum}`)
                                  } else {
                                    console.warn(`⚠️ 无效的 question_id: ${questionId}, 只传递 session`)
                                    navigate(`/practice?session=${selectedSession}`)
                                  }
                                }}
                              >
                                前往练习页面提交答案
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
                          // 调试：检查反馈数据
                          console.log('反馈数据检查:', {
                            recordId: record.id,
                            hasAiFeedback: !!record.ai_feedback,
                            aiFeedbackType: typeof record.ai_feedback,
                            aiFeedbackValue: record.ai_feedback
                          })
                          
                          // 检查是否有反馈数据（支持对象、字符串、null等多种情况）
                          const hasFeedback = record.ai_feedback && 
                            (typeof record.ai_feedback === 'object' || typeof record.ai_feedback === 'string')
                          
                          if (hasFeedback && typeof record.ai_feedback === 'object' && record.ai_feedback !== null) {
                            // 反馈是对象格式，正常显示
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
                                      <Text>综合评分：</Text>
                                      <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>
                                        {record.ai_feedback.score}/10
                                      </Tag>
                                    </div>
                                  )}
                                  {record.ai_feedback.overall_score && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text>总体评分：</Text>
                                      <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>
                                        {record.ai_feedback.overall_score}/100
                                      </Tag>
                                    </div>
                                  )}
                                  {record.ai_feedback.strengths && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong>优点：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.strengths}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.weaknesses && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong>待改进：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.weaknesses}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.suggestions && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong>建议：</Text>
                                      <Paragraph style={{ marginTop: 4, marginLeft: 16 }}>
                                        {record.ai_feedback.suggestions}
                                      </Paragraph>
                                    </div>
                                  )}
                                  {record.ai_feedback.reference_thinking && (
                                    <div style={{ marginBottom: 12 }}>
                                      <Text strong style={{ color: '#722ed1' }}>🤔 参考思路：</Text>
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
                                      <Text strong style={{ color: '#722ed1' }}>📝 参考答案：</Text>
                                      <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                        {record.ai_feedback.reference_answer}
                                      </Paragraph>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          } else if (record.ai_feedback && typeof record.ai_feedback === 'string') {
                            // 反馈是字符串格式，尝试解析
                            try {
                              const parsed = JSON.parse(record.ai_feedback)
                              if (parsed && typeof parsed === 'object') {
                                // 解析成功，但为了简化，提示用户刷新页面以看到正确格式
                                return (
                                  <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4, border: '1px solid #ffe58f' }}>
                                    <Text type="warning">
                                      ⚠️ 反馈数据需要重新加载，请刷新页面
                                    </Text>
                                  </div>
                                )
                              }
                            } catch (e) {
                              console.warn('解析反馈字符串失败:', e)
                            }
                            return (
                              <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4, border: '1px solid #ffe58f' }}>
                                <Text type="warning">
                                  ⚠️ 反馈数据格式异常，请重新生成反馈
                                </Text>
                                <Button
                                  type="primary"
                                  icon={<ThunderboltOutlined />}
                                  onClick={() =>
                                    generateFeedback(record.id, record.question_text, record.answer_text)
                                  }
                                  loading={generatingFeedback}
                                  style={{ marginTop: 8 }}
                                  size="small"
                                >
                                  重新生成反馈
                                </Button>
                              </div>
                            )
                          } else if (!record.is_placeholder) {
                            // 没有反馈且不是占位记录，显示生成按钮
                            return (
                              <Button
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                onClick={() =>
                                  generateFeedback(record.id, record.question_text, record.answer_text)
                                }
                                loading={generatingFeedback}
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
              <Empty description="请选择一个会话查看详情" />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}
