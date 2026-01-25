import { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Statistic, Space, DatePicker, Empty, Spin, Tag } from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  BookOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { api } from '../../utils/api'
import dayjs, { Dayjs } from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

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

const CATEGORIES = Object.keys(CATEGORY_MAP)

interface StatsData {
  totalSessions: number
  totalQuestions: number
  totalDuration: number
  averageScore: number
  categoryStats: Record<string, { count: number; avgScore: number }>
  dateStats: Record<string, number>
}

interface WeaknessStats {
  total: number
  by_category: Array<{ category: string; count: number }>
  by_type: Array<{ weakness_type: string; count: number }>
  by_severity: Array<{ severity: string; count: number }>
  by_status: Array<{ status: string; count: number }>
}

interface WeaknessTrend {
  period_days: number
  total_weaknesses: number
  trends: {
    weekly_new_weaknesses: Array<{ week: string; count: number }>
    improvement_by_type: Array<{ weakness_type: string; total: number; improved: number; resolved: number; improvement_rate: string }>
    high_severity_trend: Array<{ week: string; count: number }>
    practice_effectiveness: Array<{ practice_range: string; total: number; improved: number; improvement_rate: string }>
  }
  insights: {
    most_common_weakness: string
    best_improved_type: string
    high_severity_count: number
  }
}

export default function Progress() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [stats, setStats] = useState<StatsData>({
    totalSessions: 0,
    totalQuestions: 0,
    totalDuration: 0,
    averageScore: 0,
    categoryStats: {},
    dateStats: {},
  })
  const [weaknessStats, setWeaknessStats] = useState<WeaknessStats | null>(null)
  const [weaknessTrend, setWeaknessTrend] = useState<WeaknessTrend | null>(null)

  useEffect(() => {
    loadProgressData()
  }, [dateRange])

  const loadProgressData = async () => {
    try {
      setLoading(true)

      // 获取會話列表
      const sessionsRes = await api.sessions.recent(100)
      const sessions = sessionsRes.success ? sessionsRes.data : []

      // 過滤日期范围
      const filteredSessions = sessions.filter((s: any) => {
        const sessionDate = dayjs(s.start_time)
        return sessionDate.isAfter(dateRange[0]) && sessionDate.isBefore(dateRange[1].add(1, 'day'))
      })

      // 計算統計數據
      const totalSessions = filteredSessions.length
      let totalQuestions = 0
      let totalDuration = 0
      const categoryStats: Record<string, { count: number; avgScore: number; scores: number[] }> = {}
      const dateStats: Record<string, number> = {}
      const allScores: number[] = []

      // 获取所有會話的详情以計算平均分
      const sessionDetailsPromises = filteredSessions.map(async (session: any) => {
        try {
          const detailRes = await api.sessions.get(session.id)
          return detailRes.success ? detailRes.data : null
        } catch (error) {
          console.error(`获取會話 ${session.id} 详情失敗:`, error)
          return null
        }
      })

      const sessionDetails = await Promise.all(sessionDetailsPromises)

      for (let i = 0; i < filteredSessions.length; i++) {
        const session = filteredSessions[i]
        const sessionDetail = sessionDetails[i]

        totalQuestions += session.question_count || 0

        // 計算時長
        if (session.end_time) {
          const duration = Math.round(
            (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000
          )
          totalDuration += duration
        }

        // 按類別統計
        if (!categoryStats[session.category]) {
          categoryStats[session.category] = { count: 0, avgScore: 0, scores: [] }
        }
        categoryStats[session.category].count++

        // 從反馈中提取分數
        if (sessionDetail?.qa_records) {
          for (const record of sessionDetail.qa_records) {
            if (record.ai_feedback) {
              let feedback = record.ai_feedback
              if (typeof feedback === 'string') {
                try {
                  feedback = JSON.parse(feedback)
                } catch {
                  continue
                }
              }

              // 優先使用score，其次使用overall_score
              const score = feedback.score ?? feedback.overall_score
              if (typeof score === 'number' && score >= 0 && score <= 10) {
                allScores.push(score)
                categoryStats[session.category].scores.push(score)
              }
            }
          }
        }

        // 按日期統計
        const dateKey = new Date(session.start_time).toISOString().split('T')[0]
        dateStats[dateKey] = (dateStats[dateKey] || 0) + 1
      }

      // 計算平均分
      const averageScore = allScores.length > 0
        ? Math.round((allScores.reduce((sum, s) => sum + s, 0) / allScores.length) * 10) / 10
        : 0

      // 計算各類別的平均分
      const formattedCategoryStats: Record<string, { count: number; avgScore: number }> = {}
      for (const [category, stats] of Object.entries(categoryStats)) {
        formattedCategoryStats[category] = {
          count: stats.count,
          avgScore: stats.scores.length > 0
            ? Math.round((stats.scores.reduce((sum, s) => sum + s, 0) / stats.scores.length) * 10) / 10
            : 0,
        }
      }

      setStats({
        totalSessions,
        totalQuestions,
        totalDuration,
        averageScore,
        categoryStats: formattedCategoryStats,
        dateStats,
      })

      // 加载弱點統計和趋勢
      try {
        const [statsRes, trendsRes] = await Promise.all([
          api.weaknesses.stats(),
          api.weaknesses.trends({ days: dateRange[1].diff(dateRange[0], 'day') }),
        ])
        setWeaknessStats(statsRes.success ? statsRes.data : null)
        setWeaknessTrend(trendsRes.success ? trendsRes.data : null)
      } catch (error) {
        console.error('加载弱點數據失敗:', error)
      }
    } catch (error) {
      console.error('加载進度數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 類別分布图表配置
  const categoryChartOption = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '練習次數',
        type: 'pie',
        radius: '50%',
        data: CATEGORIES.map((cat) => ({
          value: stats.categoryStats[cat]?.count || 0,
          name: CATEGORY_MAP[cat],
        })).filter((d) => d.value > 0),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }

  // 練習趋勢图表配置
  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.dateStats).sort(),
      axisLabel: {
        formatter: (value: string) => dayjs(value).format('MM/DD'),
      },
    },
    yAxis: {
      type: 'value',
      name: '練習次數',
    },
    series: [
      {
        name: '練習次數',
        type: 'line',
        data: Object.keys(stats.dateStats)
          .sort()
          .map((date) => stats.dateStats[date]),
        smooth: true,
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.2)',
        },
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
  }

  // 類別柱狀图配置
  const categoryBarOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: CATEGORIES.map((cat) => CATEGORY_MAP[cat]),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: '練習次數',
    },
    series: [
      {
        name: '練習次數',
        type: 'bar',
        data: CATEGORIES.map((cat) => stats.categoryStats[cat]?.count || 0),
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          進度报告
        </Title>
        <Space>
          <Text>時間范围：</Text>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange([dates[0]!, dates[1]!])
              }
            }}
            format="YYYY-MM-DD"
          />
        </Space>
      </div>

      {stats.totalSessions === 0 ? (
        <Card>
          <Empty description="该時間段內暫无練習數據" />
        </Card>
      ) : (
        <>
          {/* 統計卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="總練習次數"
                  value={stats.totalSessions}
                  suffix="次"
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="累計題目"
                  value={stats.totalQuestions}
                  suffix="題"
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="總時長"
                  value={stats.totalDuration}
                  suffix="分鐘"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="日均練習"
                  value={(
                    stats.totalSessions / Math.max(1, dateRange[1].diff(dateRange[0], 'day'))
                  ).toFixed(1)}
                  suffix="次"
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 图表 */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {/* 練習趋勢 */}
            <Col xs={24} lg={16}>
              <Card title="練習趋勢">
                <ReactECharts option={trendChartOption} style={{ height: 350 }} />
              </Card>
            </Col>

            {/* 類別分布 */}
            <Col xs={24} lg={8}>
              <Card title="類別分布">
                <ReactECharts option={categoryChartOption} style={{ height: 350 }} />
              </Card>
            </Col>

            {/* 各專項練習統計 */}
            <Col xs={24}>
              <Card title="各專項練習統計">
                <ReactECharts option={categoryBarOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          {/* 專項详情 */}
          <Card title="專項详情" style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]}>
              {CATEGORIES.filter((cat) => stats.categoryStats[cat]?.count > 0).map((cat) => (
                <Col xs={12} sm={8} md={6} key={cat}>
                  <Card size="small" hoverable>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text strong>{CATEGORY_MAP[cat]}</Text>
                      <div>
                        <Tag color="blue">{stats.categoryStats[cat]?.count || 0}次</Tag>
                        {stats.categoryStats[cat]?.avgScore > 0 && (
                          <Tag color="green" style={{ marginLeft: 8 }}>
                            均分: {stats.categoryStats[cat].avgScore.toFixed(1)}
                          </Tag>
                        )}
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 弱點追踪 */}
          {weaknessStats && weaknessStats.total > 0 && (
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  弱點追踪
                </Space>
              }
              style={{ marginTop: 24 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="總弱點數"
                    value={weaknessStats.total}
                    prefix={<WarningOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="高嚴重度"
                    value={weaknessStats.by_severity.find((s) => s.severity === 'high')?.count || 0}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="已改善"
                    value={
                      (weaknessStats.by_status.find((s) => s.status === 'improved')?.count || 0) +
                      (weaknessStats.by_status.find((s) => s.status === 'resolved')?.count || 0)
                    }
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="活跃弱點"
                    value={weaknessStats.by_status.find((s) => s.status === 'active')?.count || 0}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>

              {/* 弱點趋勢图表 */}
              {weaknessTrend && weaknessTrend.trends.weekly_new_weaknesses.length > 0 && (
                <Card type="inner" title="弱點趋勢" style={{ marginTop: 16 }}>
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'axis' },
                      xAxis: {
                        type: 'category',
                        data: weaknessTrend.trends.weekly_new_weaknesses.map((t) => t.week),
                      },
                      yAxis: { type: 'value', name: '新增弱點數' },
                      series: [
                        {
                          name: '新增弱點',
                          type: 'line',
                          data: weaknessTrend.trends.weekly_new_weaknesses.map((t) => t.count),
                          smooth: true,
                          itemStyle: { color: '#ff4d4f' },
                        },
                      ],
                    }}
                    style={{ height: 250 }}
                  />
                </Card>
              )}

              {/* 按類型統計 */}
              {weaknessStats.by_type.length > 0 && (
                <Card type="inner" title="弱點類型分布" style={{ marginTop: 16 }}>
                  <Row gutter={[16, 16]}>
                    {weaknessStats.by_type.map((item) => (
                      <Col xs={12} sm={8} md={6} key={item.weakness_type}>
                        <Space direction="vertical" size="small">
                          <Text strong>{item.weakness_type}</Text>
                          <Tag color="red">{item.count}个</Tag>
                        </Space>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}

              {/* 改善洞察 */}
              {weaknessTrend && weaknessTrend.insights && (
                <Card type="inner" title="改善洞察" style={{ marginTop: 16 }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Text strong>最常见弱點：</Text>
                      <Tag color="orange">{weaknessTrend.insights.most_common_weakness}</Tag>
                    </div>
                    <div>
                      <Text strong>改善最好的類型：</Text>
                      <Tag color="green">{weaknessTrend.insights.best_improved_type}</Tag>
                    </div>
                    <div>
                      <Text strong>高嚴重度弱點：</Text>
                      <Tag color="red">{weaknessTrend.insights.high_severity_count}个</Tag>
                    </div>
                  </Space>
                </Card>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
