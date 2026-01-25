import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, Row, Col, Typography, List, Tag, Progress, Statistic, Empty, Button, Space, Modal, message } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  BookOutlined,
  RightOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api, cancelAllPendingRequests } from '../../utils/api'
import { useAiThinking } from '../../hooks/useAiThinking'

const { Title, Text } = Typography

// 專項類別映射
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口語',
  'chinese-expression': '中文表達',
  'logical-thinking': '邏輯思維',
  'current-affairs': '時事常識',
  'science-knowledge': '科學常識',
  'personal-growth': '个人成長',
  'group-discussion': '小組討論',
}

// 狀態標籤颜色
const STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
}

interface DailyTask {
  id: string
  category: string
  duration: number
  status: string
  student_name: string
  target_school: string
}

interface Session {
  id: string
  category: string
  start_time: string
  end_time: string | null
  status: string
  question_count: number
  task_id?: number | null
}

interface Weakness {
  id: number
  category: string
  weakness_type: string
  description: string
  severity: string
  status: string
  practice_count: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { executeWithThinking } = useAiThinking()
  const [loading, setLoading] = useState(true)
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedToday: 0,
    totalQuestions: 0,
    taskSessions: 0,
    freeSessions: 0,
    taskQuestions: 0,
    freeQuestions: 0,
  })
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([])
  const [generatingQuestionsId, setGeneratingQuestionsId] = useState<number | null>(null)

  // 生成針對性題目
  const handleGenerateQuestions = useCallback(async (weaknessId: number) => {
    if (generatingQuestionsId) {
      message.warning('正在生成題目，请勿重复點击');
      return;
    }

    try {
      setGeneratingQuestionsId(weaknessId);

      await executeWithThinking(
        'generate-questions',
        async () => {
          return await api.weaknesses.generateQuestions({
            weakness_ids: [weaknessId],
            count: 5,
          });
        },
        {
          taskName: '生成針對性題目',
          onSuccess: () => {
            message.success('題目生成成功');
            navigate('/questions');
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || '題目生成失敗');
          },
        }
      );
    } finally {
      setGeneratingQuestionsId(null);
    }
  }, [generatingQuestionsId, navigate, executeWithThinking]);

  // 優化：使用 useCallback 缓存 loadDashboardData 函數
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // 并行加载數據 - 使用新的 pendingTasks API
      const [tasksRes, sessionsRes, weaknessesRes] = await Promise.all([
        api.plans.pendingTasks().catch((err) => {
          console.error('加载任務失敗:', err);
          return { data: [] };
        }),
        api.sessions.recent(5).catch((err) => {
          console.error('加载會話失敗:', err);
          return { data: [] };
        }),
        api.weaknesses.list({ status: 'active', severity: 'high' }).catch((err) => {
          console.error('加载弱點失敗:', err);
          return { data: [] };
        }),
      ])

      // 注意：enhancedRequest 返回的是 { data: ... } 格式，但有些API可能直接返回數據
      const tasks = tasksRes?.data || tasksRes || []
      const sessions = sessionsRes?.data || sessionsRes || []
      const weaknesses = weaknessesRes?.data || weaknessesRes || []

      setTodayTasks(tasks)
      setRecentSessions(sessions)
      setWeaknesses(weaknesses.slice(0, 5)) // 只显示前5个高嚴重度弱點

      // 計算統計數據
      const completedToday = tasks.filter((t: DailyTask) => t.status === 'completed').length
      
      // 区分計劃內練習和自由練習的統計
      const taskSessions = sessions.filter((s: Session) => s.task_id != null)
      const freeSessions = sessions.filter((s: Session) => s.task_id == null)
      
      const taskQuestions = taskSessions.reduce((sum: number, s: Session) => sum + (s.question_count || 0), 0)
      const freeQuestions = freeSessions.reduce((sum: number, s: Session) => sum + (s.question_count || 0), 0)
      const totalQuestions = taskQuestions + freeQuestions

      setStats({
        totalSessions: sessions.length,
        completedToday,
        totalQuestions,
        taskSessions: taskSessions.length,
        freeSessions: freeSessions.length,
        taskQuestions,
        freeQuestions,
      })
    } catch (error) {
      console.error('加载仪表盘數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载仪表盘數據
  useEffect(() => {
    loadDashboardData()
    
    // 清理函數：組件卸载時取消所有pending请求
    return () => {
      cancelAllPendingRequests()
    }
  }, [loadDashboardData])

  // 優化：使用 useCallback 缓存 handleStartTask
  const handleStartTask = useCallback((taskId: string) => {
    navigate(`/practice?taskId=${taskId}`)
  }, [navigate])

  // 跳過任務
  const handleSkipTask = useCallback(async (taskId: string) => {
    Modal.confirm({
      title: '確认跳過任務',
      content: `確认跳過此任務?将不計入練習記錄。`,
      okText: '確认跳過',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.plans.skipTask(taskId)
          message.success('任務已跳過')
          loadDashboardData() // 重新加载數據
        } catch (error: any) {
          message.error(error.response?.data?.message || '跳過任務失敗')
        }
      },
    })
  }, [loadDashboardData])

  // 優化：使用 useMemo 缓存計算結果
  const todayProgress = useMemo(() => {
    return todayTasks.length > 0 
      ? Math.round((stats.completedToday / todayTasks.length) * 100) 
      : 0
  }, [todayTasks.length, stats.completedToday])

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <FireOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
        仪表盘
      </Title>
      <Text type="secondary">欢迎使用升中面試訓練係統！</Text>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日進度"
              value={todayProgress}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <Progress percent={todayProgress} showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日任務"
              value={stats.completedToday}
              suffix={`/ ${todayTasks.length}`}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="最近練習"
              value={stats.totalSessions}
              suffix="次"
              prefix={<BookOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              計劃內: {stats.taskSessions} | 自由: {stats.freeSessions}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="累計題目"
              value={stats.totalQuestions}
              suffix="題"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              計劃內: {stats.taskQuestions} | 自由: {stats.freeQuestions}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 今日任務 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                今日任務
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/plans')}>
                查看全部 <RightOutlined />
              </Button>
            }
            loading={loading}
          >
            {todayTasks.length === 0 ? (
              <Empty
                description="今日暫无任務"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/plans')}>
                  創建訓練計劃
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={todayTasks}
                renderItem={(task) => (
                  <List.Item
                    actions={[
                      task.status === 'completed' ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          已完成
                        </Tag>
                      ) : task.status === 'in_progress' ? (
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleStartTask(task.id)}
                          >
                            继续練習
                          </Button>
                        </Space>
                      ) : (
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleStartTask(task.id)}
                          >
                            開始練習
                          </Button>
                          <Button
                            type="default"
                            size="small"
                            icon={<CloseCircleOutlined />}
                            onClick={() => handleSkipTask(task.id)}
                          >
                            跳過
                          </Button>
                        </Space>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{CATEGORY_MAP[task.category] || task.category}</Text>
                          <Tag color="blue">{task.duration}分鐘</Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary">
                          {task.student_name} → {task.target_school}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 最近練習 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BookOutlined />
                最近練習
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/feedback')}>
                查看全部 <RightOutlined />
              </Button>
            }
            loading={loading}
          >
            {recentSessions.length === 0 ? (
              <Empty
                description="暫无練習記錄"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/practice')}>
                  開始練習
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={recentSessions}
                renderItem={(session) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        onClick={() => navigate(`/feedback?session=${session.id}`)}
                      >
                        查看反馈
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{CATEGORY_MAP[session.category] || session.category}</Text>
                          <Tag>{session.question_count || 0}題</Tag>
                        </Space>
                      }
                      description={
                        <Space size="small">
                          <Text type="secondary">
                            {new Date(session.start_time).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                          <Tag color={STATUS_COLOR[session.status]}>
                            {session.status === 'in_progress' && '進行中'}
                            {session.status === 'completed' && '已完成'}
                            {session.status === 'paused' && '已暫停'}
                          </Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 弱點提醒 */}
      {weaknesses.length > 0 && (
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              需要關注的弱點
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/progress')}>
              查看详情 <RightOutlined />
            </Button>
          }
          style={{ marginTop: 24 }}
        >
          <List
            dataSource={weaknesses}
            renderItem={(weakness) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={
                        weakness.severity === 'high' ? 'red' :
                        weakness.severity === 'medium' ? 'orange' : 'blue'
                      }>
                        {weakness.severity === 'high' ? '高' :
                         weakness.severity === 'medium' ? '中' : '低'}嚴重
                      </Tag>
                      <Text strong>{CATEGORY_MAP[weakness.category] || weakness.category}</Text>
                      <Tag>{weakness.weakness_type}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text>{weakness.description}</Text>
                      <Space>
                        <Text type="secondary">已練習: {weakness.practice_count}次</Text>
                        <Button
                          type="link"
                          size="small"
                          loading={generatingQuestionsId === weakness.id}
                          disabled={generatingQuestionsId === weakness.id}
                          onClick={() => {
                            // 根據弱點生成針對性題目
                            handleGenerateQuestions(weakness.id);
                          }}
                        >
                          生成針對性題目
                        </Button>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 快速操作 */}
      <Card title="快速操作" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Button
              type="primary"
              size="large"
              block
              icon={<BookOutlined />}
              onClick={() => navigate('/practice')}
            >
              開始練習
            </Button>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Button
              size="large"
              block
              icon={<ClockCircleOutlined />}
              onClick={() => navigate('/plans')}
            >
              訓練計劃
            </Button>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Button
              size="large"
              block
              icon={<CheckCircleOutlined />}
              onClick={() => navigate('/feedback')}
            >
              查看反馈
            </Button>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Button
              size="large"
              block
              icon={<TrophyOutlined />}
              onClick={() => navigate('/progress')}
            >
              進度报告
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
