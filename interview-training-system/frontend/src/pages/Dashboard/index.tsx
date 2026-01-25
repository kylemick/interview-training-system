import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, Row, Col, Typography, List, Tag, Progress, Statistic, Empty, Button, Space } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  BookOutlined,
  RightOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api, cancelAllPendingRequests } from '../../utils/api'

const { Title, Text } = Typography

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

// 状态标签颜色
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
  const [loading, setLoading] = useState(true)
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedToday: 0,
    totalQuestions: 0,
  })
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([])

  // 优化：使用 useCallback 缓存 loadDashboardData 函数
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // 并行加载数据 - 使用新的 pendingTasks API
      const [tasksRes, sessionsRes, weaknessesRes] = await Promise.all([
        api.plans.pendingTasks(),
        api.sessions.recent(5),
        api.weaknesses.list({ status: 'active', severity: 'high' }).catch(() => ({ data: [] })),
      ])

      // 注意：enhancedRequest 返回的是 { data: ... } 格式
      const tasks = tasksRes.data || []
      const sessions = sessionsRes.data || []
      const weaknesses = weaknessesRes.data || []

      setTodayTasks(tasks)
      setRecentSessions(sessions)
      setWeaknesses(weaknesses.slice(0, 5)) // 只显示前5个高严重度弱点

      // 计算统计数据
      const completedToday = tasks.filter((t: DailyTask) => t.status === 'completed').length
      const totalQuestions = sessions.reduce((sum: number, s: Session) => sum + (s.question_count || 0), 0)

      setStats({
        totalSessions: sessions.length,
        completedToday,
        totalQuestions,
      })
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载仪表盘数据
  useEffect(() => {
    loadDashboardData()
    
    // 清理函数：组件卸载时取消所有pending请求
    return () => {
      cancelAllPendingRequests()
    }
  }, [loadDashboardData])

  // 优化：使用 useCallback 缓存 handleStartTask
  const handleStartTask = useCallback((taskId: string) => {
    navigate(`/practice?taskId=${taskId}`)
  }, [navigate])

  // 优化：使用 useMemo 缓存计算结果
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
      <Text type="secondary">欢迎使用升中面试训练系统！</Text>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日进度"
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
              title="今日任务"
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
              title="最近练习"
              value={stats.totalSessions}
              suffix="次"
              prefix={<BookOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="累计题目"
              value={stats.totalQuestions}
              suffix="题"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 今日任务 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                今日任务
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
                description="今日暂无任务"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/plans')}>
                  创建训练计划
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
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => handleStartTask(task.id)}
                        >
                          继续练习
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => handleStartTask(task.id)}
                        >
                          开始练习
                        </Button>
                      ),
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{CATEGORY_MAP[task.category] || task.category}</Text>
                          <Tag color="blue">{task.duration}分钟</Tag>
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

        {/* 最近练习 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BookOutlined />
                最近练习
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
                description="暂无练习记录"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={() => navigate('/practice')}>
                  开始练习
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
                          <Tag>{session.question_count || 0}题</Tag>
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
                            {session.status === 'in_progress' && '进行中'}
                            {session.status === 'completed' && '已完成'}
                            {session.status === 'paused' && '已暂停'}
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

      {/* 弱点提醒 */}
      {weaknesses.length > 0 && (
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              需要关注的弱点
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
                         weakness.severity === 'medium' ? '中' : '低'}严重
                      </Tag>
                      <Text strong>{CATEGORY_MAP[weakness.category] || weakness.category}</Text>
                      <Tag>{weakness.weakness_type}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text>{weakness.description}</Text>
                      <Space>
                        <Text type="secondary">已练习: {weakness.practice_count}次</Text>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            // 根据弱点生成针对性题目
                            api.weaknesses.generateQuestions({
                              weakness_ids: [weakness.id],
                              count: 5,
                            }).then(() => {
                              navigate('/questions')
                            })
                          }}
                        >
                          生成针对性题目
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
              开始练习
            </Button>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Button
              size="large"
              block
              icon={<ClockCircleOutlined />}
              onClick={() => navigate('/plans')}
            >
              训练计划
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
              进度报告
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
