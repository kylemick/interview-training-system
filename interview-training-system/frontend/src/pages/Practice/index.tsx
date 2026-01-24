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
  Spin,
} from 'antd'
import {
  BookOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../utils/api'
import { useSessionStore } from '../../store/useSessionStore'

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
}

interface AIFeedback {
  score?: number
  strengths?: string
  weaknesses?: string
  suggestions?: string
  reference_answer?: string
  reference_thinking?: string
}

export default function Practice() {
  const navigate = useNavigate()

  // 状态管理
  const [step, setStep] = useState<'select' | 'practice'>('select')
  const [category, setCategory] = useState<string>('')
  const [questionCount, setQuestionCount] = useState(10)
  const [mode, setMode] = useState<'text_qa' | 'ai_interview'>('text_qa')

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<number, AIFeedback>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 开始练习
  const startPractice = async () => {
    if (!category) {
      message.warning('请选择专项类别')
      return
    }

    try {
      setLoading(true)

      // 创建会话
      const sessionRes = await api.sessions.create({
        category,
        mode,
        question_count: questionCount,
      })

      const session = sessionRes.data.data
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

      const loadedQuestions = questionsRes.data.data || []
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

  // 提交答案并获取即时反馈
  const submitAnswer = async () => {
    if (!answers[currentIndex]) {
      message.warning('请先输入答案')
      return
    }

    if (!sessionData) return

    try {
      setSubmitting(true)
      const currentQuestion = questions[currentIndex]

      // 1. 保存答案
      const submitRes = await api.sessions.submitAnswer(sessionData.session_id, {
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        answer_text: answers[currentIndex],
        response_time: null,
      })

      const recordId = submitRes.data.data.record_id

      message.success('答案已保存，正在生成AI反馈...')

      // 2. 立即生成AI反馈
      try {
        const feedbackRes = await api.feedback.generate({
          session_id: sessionData.session_id,
          record_id: recordId,
          question_id: currentQuestion.id,
          question_text: currentQuestion.question_text,
          answer_text: answers[currentIndex],
          category,
          target_school: 'SPCC', // TODO: 从用户设置获取
        })

        const feedback = feedbackRes.data.data
        setFeedbacks({ ...feedbacks, [currentIndex]: feedback })
        message.success('AI反馈已生成！', 2)
      } catch (feedbackError) {
        console.error('生成反馈失败:', feedbackError)
        message.warning('反馈生成失败，可以稍后在反馈页面查看')
      }

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
        // 继续下一题
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1)
        }, 1000)
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
      await api.sessions.complete(sessionData.session_id)
    } catch (error) {
      console.error('完成会话失败:', error)
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
            {/* 选择类别 */}
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
              disabled={!category}
            >
              开始练习
            </Button>
          </Space>
        </Card>
      </div>
    )
  }

  // 练习界面
  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
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
                : '提示：尽量详细、有条理地回答问题'}
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
            <Button onClick={() => navigate('/')}>暂停练习</Button>
            {currentIndex === questions.length - 1 ? (
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
            disabled={currentIndex === questions.length - 1 || !answers[currentIndex]}
          >
            下一题
          </Button>
        </Space>
      </Card>
    </div>
  )
}
