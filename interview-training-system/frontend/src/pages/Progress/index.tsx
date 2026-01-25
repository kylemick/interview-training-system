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

      // 获取会话列表
      const sessionsRes = await api.sessions.recent(100)
      const sessions = sessionsRes.success ? sessionsRes.data : []

      // 过滤日期范围
      const filteredSessions = sessions.filter((s: any) => {
        const sessionDate = dayjs(s.start_time)
        return sessionDate.isAfter(dateRange[0]) && sessionDate.isBefore(dateRange[1].add(1, 'day'))
      })

      // 计算统计数据
      const totalSessions = filteredSessions.length
      let totalQuestions = 0
      let totalDuration = 0
      const categoryStats: Record<string, { count: number; avgScore: number }> = {}
      const dateStats: Record<string, number> = {}

      for (const session of filteredSessions) {
        totalQuestions += session.question_count || 0

        // 计算时长
        if (session.end_time) {
          const duration = Math.round(
            (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000
          )
          totalDuration += duration
        }

        // 按类别统计
        if (!categoryStats[session.category]) {
          categoryStats[session.category] = { count: 0, avgScore: 0 }
        }
        categoryStats[session.category].count++

        // 按日期统计
        const dateKey = new Date(session.start_time).toISOString().split('T')[0]
        dateStats[dateKey] = (dateStats[dateKey] || 0) + 1
      }

      setStats({
        totalSessions,
        totalQuestions,
        totalDuration,
        averageScore: 0, // TODO: 从反馈中计算
        categoryStats,
        dateStats,
      })

      // 加载弱点统计和趋势
      try {
        const [statsRes, trendsRes] = await Promise.all([
          api.weaknesses.stats(),
          api.weaknesses.trends({ days: dateRange[1].diff(dateRange[0], 'day') }),
        ])
        setWeaknessStats(statsRes.success ? statsRes.data : null)
        setWeaknessTrend(trendsRes.success ? trendsRes.data : null)
      } catch (error) {
        console.error('加载弱点数据失败:', error)
      }
    } catch (error) {
      console.error('加载进度数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 类别分布图表配置
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
        name: '练习次数',
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

  // 练习趋势图表配置
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
      name: '练习次数',
    },
    series: [
      {
        name: '练习次数',
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

  // 类别柱状图配置
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
      name: '练习次数',
    },
    series: [
      {
        name: '练习次数',
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
          进度报告
        </Title>
        <Space>
          <Text>时间范围：</Text>
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
          <Empty description="该时间段内暂无练习数据" />
        </Card>
      ) : (
        <>
          {/* 统计卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="总练习次数"
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
                  title="累计题目"
                  value={stats.totalQuestions}
                  suffix="题"
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="总时长"
                  value={stats.totalDuration}
                  suffix="分钟"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="日均练习"
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
            {/* 练习趋势 */}
            <Col xs={24} lg={16}>
              <Card title="练习趋势">
                <ReactECharts option={trendChartOption} style={{ height: 350 }} />
              </Card>
            </Col>

            {/* 类别分布 */}
            <Col xs={24} lg={8}>
              <Card title="类别分布">
                <ReactECharts option={categoryChartOption} style={{ height: 350 }} />
              </Card>
            </Col>

            {/* 各专项练习统计 */}
            <Col xs={24}>
              <Card title="各专项练习统计">
                <ReactECharts option={categoryBarOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          {/* 专项详情 */}
          <Card title="专项详情" style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]}>
              {CATEGORIES.filter((cat) => stats.categoryStats[cat]?.count > 0).map((cat) => (
                <Col xs={12} sm={8} md={6} key={cat}>
                  <Card size="small" hoverable>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text strong>{CATEGORY_MAP[cat]}</Text>
                      <div>
                        <Tag color="blue">{stats.categoryStats[cat]?.count || 0}次</Tag>
                      </div>
                      {/* TODO: 显示平均分 */}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 弱点追踪 */}
          {weaknessStats && weaknessStats.total > 0 && (
            <Card
              title={
                <Space>
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  弱点追踪
                </Space>
              }
              style={{ marginTop: 24 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="总弱点数"
                    value={weaknessStats.total}
                    prefix={<WarningOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="高严重度"
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
                    title="活跃弱点"
                    value={weaknessStats.by_status.find((s) => s.status === 'active')?.count || 0}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>

              {/* 弱点趋势图表 */}
              {weaknessTrend && weaknessTrend.trends.weekly_new_weaknesses.length > 0 && (
                <Card type="inner" title="弱点趋势" style={{ marginTop: 16 }}>
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'axis' },
                      xAxis: {
                        type: 'category',
                        data: weaknessTrend.trends.weekly_new_weaknesses.map((t) => t.week),
                      },
                      yAxis: { type: 'value', name: '新增弱点数' },
                      series: [
                        {
                          name: '新增弱点',
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

              {/* 按类型统计 */}
              {weaknessStats.by_type.length > 0 && (
                <Card type="inner" title="弱点类型分布" style={{ marginTop: 16 }}>
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
                      <Text strong>最常见弱点：</Text>
                      <Tag color="orange">{weaknessTrend.insights.most_common_weakness}</Tag>
                    </div>
                    <div>
                      <Text strong>改善最好的类型：</Text>
                      <Tag color="green">{weaknessTrend.insights.best_improved_type}</Tag>
                    </div>
                    <div>
                      <Text strong>高严重度弱点：</Text>
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
