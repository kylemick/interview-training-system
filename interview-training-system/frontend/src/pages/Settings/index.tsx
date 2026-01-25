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
      console.error('加载學校列表失敗:', error)
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
      console.error('加载设置失敗:', error)
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
      message.error(error.response?.data?.message || '保存失敗')
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
      message.loading('测試 API Key...', 0)

      await api.ai.testConnection({
        api_key: apiKey,
      })

      message.destroy()
      message.success('API Key 验证成功！')
    } catch (error: any) {
      message.destroy()
      message.error(error.response?.data?.message || 'API Key 验证失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      // 數據導出需要特殊处理（blob 响应）
      const response = await fetch('/api/data/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('導出失敗')
      }
      
      const blob = await response.blob()

      // 創建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `interview-training-backup-${Date.now()}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      message.success('數據導出成功')
    } catch (error) {
      message.error('數據導出失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleClearData = () => {
    Modal.confirm({
      title: '⚠️ 確认清空所有數據？',
      content: '此操作将删除所有訓練記錄、會話和進度數據，但保留題庫和學校檔案。此操作不可恢复！',
      okText: '確认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.data.clear()
          message.success('數據已清空')
        } catch (error) {
          message.error('清空失敗')
        }
      },
    })
  }

  const handleImportData = () => {
    // 創建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0]
      if (!file) return

      try {
        setLoading(true)
        
        // 读取文件內容
        const text = await file.text()
        const data = JSON.parse(text)
        
        // 验证備份文件格式
        if (!data.data || typeof data.data !== 'object') {
          message.error('无效的備份文件格式')
          return
        }
        
        // 询問導入選項
        Modal.confirm({
          title: '選擇導入模式',
          content: (
            <div>
              <p><strong>合并模式</strong>：保留现有數據，只導入新數據（推荐）</p>
              <p><strong>覆盖模式</strong>：清空现有數據，然後導入（慎用）</p>
            </div>
          ),
          okText: '合并導入',
          cancelText: '覆盖導入',
          onOk: async () => {
            await performImport(data, { merge: true, overwrite: false })
          },
          onCancel: async () => {
            await performImport(data, { merge: false, overwrite: true })
          },
        })
      } catch (error: any) {
        message.error('读取文件失敗：' + error.message)
      } finally {
        setLoading(false)
      }
    }
    
    input.click()
  }

  const performImport = async (data: any, options: { merge: boolean; overwrite: boolean }) => {
    try {
      setLoading(true)
      message.loading('導入數據中...', 0)
      
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
      
      message.success(`數據導入成功！${summary}`)
    } catch (error: any) {
      message.destroy()
      message.error(error.response?.data?.message || '導入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>
        <SettingOutlined /> 係統设置
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
                    <UserOutlined /> 學生信息
                  </Title>

                  <Form.Item
                    name="student_name"
                    label="學生姓名"
                    rules={[{ required: true, message: '请输入學生姓名' }]}
                  >
                    <Input placeholder="请输入姓名" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="target_school"
                    label="目標學校"
                    rules={[{ required: true, message: '请選擇目標學校' }]}
                  >
                    <Select 
                      placeholder="選擇目標學校" 
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

                  <Form.Item name="daily_duration" label="默认每日訓練時長" initialValue={30}>
                    <Select size="large">
                      <Option value={15}>15 分鐘</Option>
                      <Option value={30}>30 分鐘</Option>
                      <Option value={45}>45 分鐘</Option>
                      <Option value={60}>60 分鐘</Option>
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
                          係統需要 DeepSeek API Key 來生成訓練計劃、題目和反馈。请访問{' '}
                          <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">
                            DeepSeek 平台
                          </a>{' '}
                          获取 API Key。
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 0 }}>
                          <Text type="warning">注意：API Key 将加密存储在本地，不會上傳到任何服務器。</Text>
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
                          测試连接
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
            label: '數據管理',
            children: (
              <Card>
                <Title level={4}>
                  <ExportOutlined /> 數據備份与恢复
                </Title>
                <Paragraph type="secondary">導出或清空您的訓練數據</Paragraph>

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card type="inner" title="導出數據">
                    <Paragraph>
                      導出所有訓練計劃、練習記錄、反馈和進度數據，用于備份或迁移到其他设備。
                    </Paragraph>
                    <Button type="primary" icon={<ExportOutlined />} onClick={handleExportData} loading={loading}>
                      導出所有數據
                    </Button>
                  </Card>

                  <Card type="inner" title="導入數據">
                    <Paragraph>
                      從之前導出的備份文件恢复數據。支持合并導入（保留现有數據）和覆盖導入（清空後導入）。
                    </Paragraph>
                    <Alert
                      message="提示"
                      description="導入前建議先導出当前數據作为備份，避免數據丢失。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Button icon={<ImportOutlined />} onClick={handleImportData} loading={loading}>
                      選擇備份文件并導入
                    </Button>
                  </Card>

                  <Card type="inner" title="清理問題數據">
                    <Paragraph>
                      自動修复數據問題，包括：补充缺失的題目列表、删除孤立記錄、修复无效關聯等。
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
                            message.error('清理失敗')
                          }
                        } catch (error: any) {
                          message.error(error.response?.data?.message || '清理失敗')
                        } finally {
                          setLoading(false)
                        }
                      }} 
                      loading={loading}
                    >
                      清理問題數據
                    </Button>
                  </Card>

                  <Card type="inner" title="清空數據" style={{ borderColor: '#ff4d4f' }}>
                    <Alert
                      message="危险操作"
                      description="此操作将删除所有訓練記錄、會話和進度數據，但保留題庫和學校檔案。操作不可恢复！"
                      type="error"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Button danger icon={<DeleteOutlined />} onClick={handleClearData} loading={loading}>
                      清空所有數據
                    </Button>
                  </Card>

                  <Card type="inner" title="弱點管理">
                    <Paragraph>
                      查看和管理學生的弱點分析記錄。係統會自動從面試回憶和反馈中識別弱點，您可以查看详情、更新狀態或生成針對性題目。
                    </Paragraph>
                    <Space>
                      <Button
                        type="primary"
                        icon={<WarningOutlined />}
                        onClick={() => navigate('/progress')}
                      >
                        查看弱點追踪
                      </Button>
                      <Button
                        icon={<WarningOutlined />}
                        onClick={async () => {
                          try {
                            const res = await api.weaknesses.stats()
                            const stats = res.success ? res.data : null
                            Modal.info({
                              title: '弱點統計',
                              width: 600,
                              content: (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <div>
                                    <Text strong>總弱點數：</Text>
                                    <Text>{stats?.total || 0}</Text>
                                  </div>
                                  <div>
                                    <Text strong>按嚴重程度：</Text>
                                    {stats.by_severity?.map((s: any) => (
                                      <Tag key={s.severity} color={s.severity === 'high' ? 'red' : s.severity === 'medium' ? 'orange' : 'blue'}>
                                        {s.severity === 'high' ? '高' : s.severity === 'medium' ? '中' : '低'}：{s.count}个
                                      </Tag>
                                    ))}
                                  </div>
                                  <div>
                                    <Text strong>按狀態：</Text>
                                    {stats?.by_status?.map((s: any) => (
                                      <Tag key={s.status} color={s.status === 'active' ? 'orange' : s.status === 'improved' ? 'green' : 'default'}>
                                        {s.status === 'active' ? '活跃' : s.status === 'improved' ? '已改善' : '已解决'}：{s.count}个
                                      </Tag>
                                    ))}
                                  </div>
                                  <div>
                                    <Text strong>按類型：</Text>
                                    {stats?.by_type?.slice(0, 5).map((t: any) => (
                                      <Tag key={t.weakness_type}>{t.weakness_type}：{t.count}个</Tag>
                                    ))}
                                  </div>
                                </Space>
                              ),
                            })
                          } catch (error: any) {
                            message.error('获取弱點統計失敗：' + (error.response?.data?.message || error.message))
                          }
                        }}
                      >
                        查看統計
                      </Button>
                    </Space>
                  </Card>
                </Space>
              </Card>
            ),
          },
          {
            key: '3',
            label: '關于',
            children: (
              <Card>
                <Title level={3}>🎓 升中面試訓練係統</Title>
                <Paragraph>
                  <Text strong>版本：</Text> 1.0.0
                </Paragraph>
                <Paragraph>
                  <Text strong>描述：</Text> 为香港小學生提供升中面試訓練的本地应用係統
                </Paragraph>

                <Divider />

                <Title level={4}>功能特性</Title>
                <ul>
                  <li>✅ 七大專項類別訓練（英文口語、中文表達、邏輯思維等）</li>
                  <li>✅ AI 智能生成訓練計劃和題目</li>
                  <li>✅ 实時 AI 反馈和弱點分析</li>
                  <li>✅ 針對 TOP 學校的定制化訓練</li>
                  <li>✅ 完整的進度追踪和數據可视化</li>
                  <li>✅ 本地运行，保护隐私</li>
                </ul>

                <Divider />

                <Title level={4}>技術栈</Title>
                <Paragraph>
                  <Text strong>前端：</Text> React 18 + TypeScript + Vite + Ant Design
                </Paragraph>
                <Paragraph>
                  <Text strong>後端：</Text> Node.js + Express + MySQL
                </Paragraph>
                <Paragraph>
                  <Text strong>AI：</Text> DeepSeek API
                </Paragraph>

                <Divider />

                <Paragraph type="secondary">
                  © 2026 升中面試訓練係統 | Made with ❤️ for Hong Kong students
                </Paragraph>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
