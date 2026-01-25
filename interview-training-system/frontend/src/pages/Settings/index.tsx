import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Divider,
  Space,
  Modal,
  Typography,
  Alert,
  Tabs,
  Tag,
} from 'antd'
import {
  SaveOutlined,
  KeyOutlined,
  UserOutlined,
  SettingOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../utils/api'

const { Title, Paragraph, Text } = Typography
const { Option } = Select

interface Settings {
  student_name: string
  target_school: string
  deepseek_api_key: string
  daily_duration: number
  notification_enabled: boolean
}

export default function Settings() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [, setSettings] = useState<Settings | null>(null)
  const [schools, setSchools] = useState<Array<{ code: string; name_zh: string }>>([])
  const [loadingSchools, setLoadingSchools] = useState(false)

  useEffect(() => {
    loadSettings()
    loadSchools()
  }, [])

  const loadSchools = async () => {
    try {
      setLoadingSchools(true)
      const response = await api.schools.list()
      if (response.success && response.data) {
        setSchools(response.data)
      }
    } catch (error) {
      console.error('加载学校列表失败:', error)
    } finally {
      setLoadingSchools(false)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await api.settings.get()
      const data = response.data
      setSettings(data)
      
      // 如果API Key只有前缀，清空字段（需要用户重新输入）
      if (data.deepseek_api_key && data.deepseek_api_key.includes('...')) {
        form.setFieldsValue({
          ...data,
          deepseek_api_key: undefined,
        })
      } else {
        form.setFieldsValue(data)
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      // 如果没有设置，使用默认值
      form.setFieldsValue({
        daily_duration: 30,
        notification_enabled: true,
      })
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      await api.settings.update(values)

      message.success('设置已保存')
      loadSettings()
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleTestApiKey = async () => {
    try {
      const apiKey = form.getFieldValue('deepseek_api_key')
      if (!apiKey || !apiKey.trim()) {
        message.warning('请先输入 API Key')
        return
      }

      setLoading(true)
      message.loading('测试 API Key...', 0)

      await api.ai.testConnection({
        api_key: apiKey,
      })

      message.destroy()
      message.success('API Key 验证成功！')
    } catch (error: any) {
      message.destroy()
      message.error(error.response?.data?.message || 'API Key 验证失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      // 数据导出需要特殊处理（blob 响应）
      const response = await fetch('/api/data/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('导出失败')
      }
      
      const blob = await response.blob()

      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `interview-training-backup-${Date.now()}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      message.success('数据导出成功')
    } catch (error) {
      message.error('数据导出失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClearData = () => {
    Modal.confirm({
      title: '⚠️ 确认清空所有数据？',
      content: '此操作将删除所有训练记录、会话和进度数据，但保留题库和学校档案。此操作不可恢复！',
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.data.clear()
          message.success('数据已清空')
        } catch (error) {
          message.error('清空失败')
        }
      },
    })
  }

  const handleImportData = () => {
    // 创建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0]
      if (!file) return

      try {
        setLoading(true)
        
        // 读取文件内容
        const text = await file.text()
        const data = JSON.parse(text)
        
        // 验证备份文件格式
        if (!data.data || typeof data.data !== 'object') {
          message.error('无效的备份文件格式')
          return
        }
        
        // 询问导入选项
        Modal.confirm({
          title: '选择导入模式',
          content: (
            <div>
              <p><strong>合并模式</strong>：保留现有数据，只导入新数据（推荐）</p>
              <p><strong>覆盖模式</strong>：清空现有数据，然后导入（慎用）</p>
            </div>
          ),
          okText: '合并导入',
          cancelText: '覆盖导入',
          onOk: async () => {
            await performImport(data, { merge: true, overwrite: false })
          },
          onCancel: async () => {
            await performImport(data, { merge: false, overwrite: true })
          },
        })
      } catch (error: any) {
        message.error('读取文件失败：' + error.message)
      } finally {
        setLoading(false)
      }
    }
    
    input.click()
  }

  const performImport = async (data: any, options: { merge: boolean; overwrite: boolean }) => {
    try {
      setLoading(true)
      message.loading('导入数据中...', 0)
      
      const response = await api.data.import({
        data,
        options,
      })
      
      message.destroy()
      
      const imported = response.data
      const summary = Object.entries(imported)
        .filter(([_, count]) => (count as number) > 0)
        .map(([key, count]) => `${key}: ${count}`)
        .join(', ')
      
      message.success(`数据导入成功！${summary}`)
    } catch (error: any) {
      message.destroy()
      message.error(error.response?.data?.message || '导入失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>
        <SettingOutlined /> 系统设置
      </Title>

      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: '基本设置',
            children: (
              <Card>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                  <Title level={4}>
                    <UserOutlined /> 学生信息
                  </Title>

                  <Form.Item
                    name="student_name"
                    label="学生姓名"
                    rules={[{ required: true, message: '请输入学生姓名' }]}
                  >
                    <Input placeholder="请输入姓名" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="target_school"
                    label="目标学校"
                    rules={[{ required: true, message: '请选择目标学校' }]}
                  >
                    <Select 
                      placeholder="选择目标学校" 
                      size="large"
                      loading={loadingSchools}
                      showSearch
                      optionFilterProp="children"
                    >
                      {schools.map((school) => (
                        <Option key={school.code} value={school.code}>
                          {school.name_zh} ({school.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="daily_duration" label="默认每日训练时长" initialValue={30}>
                    <Select size="large">
                      <Option value={15}>15 分钟</Option>
                      <Option value={30}>30 分钟</Option>
                      <Option value={45}>45 分钟</Option>
                      <Option value={60}>60 分钟</Option>
                    </Select>
                  </Form.Item>

                  <Divider />

                  <Title level={4}>
                    <KeyOutlined /> AI 配置
                  </Title>

                  <Alert
                    message="DeepSeek API Key"
                    description={
                      <>
                        <Paragraph>
                          系统需要 DeepSeek API Key 来生成训练计划、题目和反馈。请访问{' '}
                          <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">
                            DeepSeek 平台
                          </a>{' '}
                          获取 API Key。
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 0 }}>
                          <Text type="warning">注意：API Key 将加密存储在本地，不会上传到任何服务器。</Text>
                        </Paragraph>
                      </>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    name="deepseek_api_key"
                    label="DeepSeek API Key"
                    rules={[{ required: true, message: '请输入 API Key' }]}
                  >
                    <Input.Password
                      placeholder="sk-..."
                      size="large"
                      prefix={<KeyOutlined />}
                      addonAfter={
                        <Button type="link" onClick={handleTestApiKey} loading={loading}>
                          测试连接
                        </Button>
                      }
                    />
                  </Form.Item>

                  <Form.Item style={{ marginTop: 32 }}>
                    <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={loading}>
                      保存设置
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: '2',
            label: '数据管理',
            children: (
              <Card>
                <Title level={4}>
                  <ExportOutlined /> 数据备份与恢复
                </Title>
                <Paragraph type="secondary">导出或清空您的训练数据</Paragraph>

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card type="inner" title="导出数据">
                    <Paragraph>
                      导出所有训练计划、练习记录、反馈和进度数据，用于备份或迁移到其他设备。
                    </Paragraph>
                    <Button type="primary" icon={<ExportOutlined />} onClick={handleExportData} loading={loading}>
                      导出所有数据
                    </Button>
                  </Card>

                  <Card type="inner" title="导入数据">
                    <Paragraph>
                      从之前导出的备份文件恢复数据。支持合并导入（保留现有数据）和覆盖导入（清空后导入）。
                    </Paragraph>
                    <Alert
                      message="提示"
                      description="导入前建议先导出当前数据作为备份，避免数据丢失。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Button icon={<ImportOutlined />} onClick={handleImportData} loading={loading}>
                      选择备份文件并导入
                    </Button>
                  </Card>

                  <Card type="inner" title="清理问题数据">
                    <Paragraph>
                      自动修复数据问题，包括：补充缺失的题目列表、删除孤立记录、修复无效关联等。
                    </Paragraph>
                    <Button 
                      icon={<WarningOutlined />} 
                      onClick={async () => {
                        try {
                          setLoading(true)
                          const res = await api.data.cleanup()
                          if (res.success) {
                            message.success(`清理完成：${JSON.stringify(res.data)}`)
                          } else {
                            message.error('清理失败')
                          }
                        } catch (error: any) {
                          message.error(error.response?.data?.message || '清理失败')
                        } finally {
                          setLoading(false)
                        }
                      }} 
                      loading={loading}
                    >
                      清理问题数据
                    </Button>
                  </Card>

                  <Card type="inner" title="清空数据" style={{ borderColor: '#ff4d4f' }}>
                    <Alert
                      message="危险操作"
                      description="此操作将删除所有训练记录、会话和进度数据，但保留题库和学校档案。操作不可恢复！"
                      type="error"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Button danger icon={<DeleteOutlined />} onClick={handleClearData} loading={loading}>
                      清空所有数据
                    </Button>
                  </Card>

                  <Card type="inner" title="弱点管理">
                    <Paragraph>
                      查看和管理学生的弱点分析记录。系统会自动从面试回忆和反馈中识别弱点，您可以查看详情、更新状态或生成针对性题目。
                    </Paragraph>
                    <Space>
                      <Button
                        type="primary"
                        icon={<WarningOutlined />}
                        onClick={() => navigate('/progress')}
                      >
                        查看弱点追踪
                      </Button>
                      <Button
                        icon={<WarningOutlined />}
                        onClick={async () => {
                          try {
                            const res = await api.weaknesses.stats()
                            const stats = res.success ? res.data : null
                            Modal.info({
                              title: '弱点统计',
                              width: 600,
                              content: (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <div>
                                    <Text strong>总弱点数：</Text>
                                    <Text>{stats?.total || 0}</Text>
                                  </div>
                                  <div>
                                    <Text strong>按严重程度：</Text>
                                    {stats.by_severity?.map((s: any) => (
                                      <Tag key={s.severity} color={s.severity === 'high' ? 'red' : s.severity === 'medium' ? 'orange' : 'blue'}>
                                        {s.severity === 'high' ? '高' : s.severity === 'medium' ? '中' : '低'}：{s.count}个
                                      </Tag>
                                    ))}
                                  </div>
                                  <div>
                                    <Text strong>按状态：</Text>
                                    {stats?.by_status?.map((s: any) => (
                                      <Tag key={s.status} color={s.status === 'active' ? 'orange' : s.status === 'improved' ? 'green' : 'default'}>
                                        {s.status === 'active' ? '活跃' : s.status === 'improved' ? '已改善' : '已解决'}：{s.count}个
                                      </Tag>
                                    ))}
                                  </div>
                                  <div>
                                    <Text strong>按类型：</Text>
                                    {stats?.by_type?.slice(0, 5).map((t: any) => (
                                      <Tag key={t.weakness_type}>{t.weakness_type}：{t.count}个</Tag>
                                    ))}
                                  </div>
                                </Space>
                              ),
                            })
                          } catch (error: any) {
                            message.error('获取弱点统计失败：' + (error.response?.data?.message || error.message))
                          }
                        }}
                      >
                        查看统计
                      </Button>
                    </Space>
                  </Card>
                </Space>
              </Card>
            ),
          },
          {
            key: '3',
            label: '关于',
            children: (
              <Card>
                <Title level={3}>🎓 升中面试训练系统</Title>
                <Paragraph>
                  <Text strong>版本：</Text> 1.0.0
                </Paragraph>
                <Paragraph>
                  <Text strong>描述：</Text> 为香港小学生提供升中面试训练的本地应用系统
                </Paragraph>

                <Divider />

                <Title level={4}>功能特性</Title>
                <ul>
                  <li>✅ 七大专项类别训练（英文口语、中文表达、逻辑思维等）</li>
                  <li>✅ AI 智能生成训练计划和题目</li>
                  <li>✅ 实时 AI 反馈和弱点分析</li>
                  <li>✅ 针对 TOP 学校的定制化训练</li>
                  <li>✅ 完整的进度追踪和数据可视化</li>
                  <li>✅ 本地运行，保护隐私</li>
                </ul>

                <Divider />

                <Title level={4}>技术栈</Title>
                <Paragraph>
                  <Text strong>前端：</Text> React 18 + TypeScript + Vite + Ant Design
                </Paragraph>
                <Paragraph>
                  <Text strong>后端：</Text> Node.js + Express + MySQL
                </Paragraph>
                <Paragraph>
                  <Text strong>AI：</Text> DeepSeek API
                </Paragraph>

                <Divider />

                <Paragraph type="secondary">
                  © 2026 升中面试训练系统 | Made with ❤️ for Hong Kong students
                </Paragraph>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
