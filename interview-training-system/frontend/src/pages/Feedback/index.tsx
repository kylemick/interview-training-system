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
  Select,
  Modal,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BookOutlined,
  ThunderboltOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../utils/api'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

// 专项类别映射
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-expression': '中文表达',
  'logical-thinking': '逻辑思维',
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
  question_text: string
  answer_text: string
  ai_feedback: any
  created_at: string
}

interface SessionDetail {
  session: Session
  qa_records: QARecord[]
  total_answered: number
}

export default function Feedback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session')

  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(sessionIdFromUrl)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [generatingFeedback, setGeneratingFeedback] = useState(false)

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
      const data = res.success ? res.data : []
      setSessions(data)

      // 如果URL中有session参数且没有选中，则选中它
      if (sessionIdFromUrl && !selectedSession) {
        setSelectedSession(sessionIdFromUrl)
      } else if (!selectedSession && data.length > 0) {
        // 否则选中第一个
        setSelectedSession(data[0].id)
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
      setSessionDetail(res.success ? res.data : null)
    } catch (error) {
      console.error('加载会话详情失败:', error)
      message.error('加载会话详情失败')
    } finally {
      setLoading(false)
    }
  }

  // 生成AI反馈
  const generateFeedback = async (recordId: string, questionText: string, answerText: string) => {
    if (!sessionDetail) return
    
    try {
      setGeneratingFeedback(true)
      const res = await api.feedback.generate({
        session_id: selectedSession,
        record_id: recordId,
        question_text: questionText,
        answer_text: answerText,
        category: sessionDetail.session.category, // 从会话中获取类别
        target_school: 'SPCC', // TODO: 从用户设置中获取
      })

      message.success('反馈生成成功')
      // 重新加载会话详情
      if (selectedSession) {
        await loadSessionDetail(selectedSession)
      }
    } catch (error: any) {
      console.error('生成反馈失败:', error)
      message.error(error.response?.data?.message || '生成反馈失败')
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
                          {session.question_count && (
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
                        {sessionDetail.total_answered}
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
                {sessionDetail.qa_records.length === 0 ? (
                  <Empty description="暂无问答记录" />
                ) : (
                  <Collapse accordion>
                    {sessionDetail.qa_records.map((record, index) => (
                      <Panel
                        header={
                          <Space>
                            <Text strong>第 {index + 1} 题</Text>
                            {record.ai_feedback ? (
                              <Tag color="success" icon={<CheckCircleOutlined />}>
                                已反馈
                              </Tag>
                            ) : (
                              <Tag color="default">未反馈</Tag>
                            )}
                          </Space>
                        }
                        key={record.id}
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
                            {record.answer_text}
                          </Paragraph>
                        </div>

                        {/* AI反馈 */}
                        {record.ai_feedback ? (
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
                        ) : (
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
                        )}
                      </Panel>
                    ))}
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
