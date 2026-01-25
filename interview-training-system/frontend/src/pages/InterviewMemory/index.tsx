import { useState, useEffect } from 'react'
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Alert,
  Table,
  Tag,
  Modal,
  Form,
  message,
  Steps,
  Typography,
} from 'antd'
import {
  FileTextOutlined,
  RobotOutlined,
  SaveOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { api } from '../../utils/api'

const { TextArea } = Input
const { Option } = Select
const { Title, Paragraph, Text } = Typography

const CATEGORIES = [
  { value: 'english-oral', label: '英文口语' },
  { value: 'chinese-oral', label: '中文表达' },
  { value: 'logic-thinking', label: '逻辑思维' },
  { value: 'current-affairs', label: '时事常识' },
  { value: 'science-knowledge', label: '科学常识' },
  { value: 'personal-growth', label: '个人成长' },
  { value: 'group-discussion', label: '小组讨论' },
]

// 学校列表从API动态加载，存储在 schools 状态中

interface ExtractedQuestion {
  question_text: string
  category: string
  difficulty: string
  reference_answer: string
  tags: string[]
  notes?: string
  school_code?: string
}

interface ExtractedWeakness {
  category: string
  weakness_type: string
  description: string
  example_text?: string
  severity: string
  improvement_suggestions: string
  related_topics: string[]
}

interface ExtractionResult {
  questions: ExtractedQuestion[]
  weaknesses?: ExtractedWeakness[]
  summary: string
}

export default function InterviewMemory() {
  const [currentStep, setCurrentStep] = useState(0)
  const [inputText, setInputText] = useState('')
  const [category, setCategory] = useState<string>()
  const [schoolCode, setSchoolCode] = useState<string>()
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [, setEditingQuestion] = useState<ExtractedQuestion | null>(null)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [form] = Form.useForm()
  const [schools, setSchools] = useState<Array<{ code: string; name_zh: string }>>([])
  const [loadingSchools, setLoadingSchools] = useState(false)

  // 加载学校列表
  useEffect(() => {
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
    loadSchools()
  }, [])

  // AI 分析文本
  const handleExtract = async () => {
    if (!inputText.trim()) {
      message.warning('请输入面试回忆文本')
      return
    }

    setExtracting(true)
    try {
      const response = await api.ai.extractInterviewMemory({
        text: inputText,
        category,
        school_code: schoolCode,
      })

      setExtractedData(response.data)
      setCurrentStep(1)
      message.success(response.message || 'AI 分析成功')
    } catch (error: any) {
      message.error(error.response?.data?.message || 'AI 分析失败')
    } finally {
      setExtracting(false)
    }
  }

  // 编辑问题
  const handleEdit = (question: ExtractedQuestion, index: number) => {
    setEditingQuestion(question)
    setEditingIndex(index)
    form.setFieldsValue(question)
    setEditModalVisible(true)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields()
      
      if (extractedData && editingIndex >= 0) {
        const newQuestions = [...extractedData.questions]
        newQuestions[editingIndex] = { ...values, tags: values.tags || [] }
        setExtractedData({ ...extractedData, questions: newQuestions })
        message.success('已更新问题')
      }
      
      setEditModalVisible(false)
      setEditingQuestion(null)
      setEditingIndex(-1)
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  // 删除问题
  const handleDelete = (index: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个问题吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (extractedData) {
          const newQuestions = extractedData.questions.filter((_, i) => i !== index)
          setExtractedData({ ...extractedData, questions: newQuestions })
          message.success('已删除问题')
        }
      },
    })
  }

  // 保存到题库
  const handleSaveToQuestionBank = async () => {
    if (!extractedData || extractedData.questions.length === 0) {
      message.warning('没有可保存的问题')
      return
    }

    setSaving(true)
    try {
      // 保存问题
      const questionsResponse = await api.ai.saveInterviewQuestions({
        questions: extractedData.questions,
        source_text: inputText,
      })

      // 保存弱点分析（如果有）
      if (extractedData.weaknesses && extractedData.weaknesses.length > 0) {
        await api.ai.saveWeaknesses({
          weaknesses: extractedData.weaknesses,
          source_text: inputText,
          // 不传递student_name，让后端从设置获取
        })
        
        message.success(
          `${questionsResponse.message || '问题已保存'}，同时保存了 ${extractedData.weaknesses.length} 条弱点分析`
        )
      } else {
        message.success(questionsResponse.message || '问题已保存')
      }
      
      // 重置表单
      setCurrentStep(0)
      setInputText('')
      setCategory(undefined)
      setSchoolCode(undefined)
      setExtractedData(null)
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 重新输入
  const handleReset = () => {
    setCurrentStep(0)
    setExtractedData(null)
  }

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value
  }

  const getDifficultyColor = (value: string) => {
    const map: Record<string, string> = {
      easy: 'green',
      medium: 'orange',
      hard: 'red',
    }
    return map[value] || 'default'
  }

  const getDifficultyLabel = (value: string) => {
    const map: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    }
    return map[value] || value
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '问题',
      dataIndex: 'question_text',
      key: 'question_text',
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: string) => <Tag color="blue">{getCategoryLabel(cat)}</Tag>,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (diff: string) => (
        <Tag color={getDifficultyColor(diff)}>{getDifficultyLabel(diff)}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags: string[]) => (
        <>
          {tags.map((tag) => (
            <Tag key={tag} style={{ marginBottom: 4 }}>
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ExtractedQuestion, index: number) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, index)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(index)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>
        <FileTextOutlined /> 面试回忆录入
      </Title>
      <Paragraph type="secondary">
        将面试回忆文本粘贴到下方，AI 将自动提取问题并分类，您可以编辑后保存到题库。
      </Paragraph>

      <Steps
        current={currentStep}
        style={{ marginBottom: 32 }}
        items={[
          { title: '输入文本', icon: <FileTextOutlined /> },
          { title: 'AI 分析', icon: <RobotOutlined /> },
          { title: '保存题库', icon: <SaveOutlined /> },
        ]}
      />

      {/* 步骤 1: 输入文本 */}
      {currentStep === 0 && (
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="使用说明"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>粘贴完整的面试回忆文本，包括问题和回答</li>
                  <li>AI 会自动识别问题、分类、难度和建议答案</li>
                  <li>您可以选择指定专项类别和学校，AI 会优先使用您的选择</li>
                  <li>分析后可以编辑每个问题，然后批量保存到题库</li>
                </ul>
              }
              type="info"
              showIcon
            />

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                面试回忆文本 <Text type="danger">*</Text>
              </label>
              <TextArea
                rows={12}
                placeholder={`请粘贴面试回忆文本，例如：

今天去了SPCC面试，遇到了以下问题：

1. 面试官先用英文问我："Tell me about your favorite book."
我回答了我最喜欢的书是Harry Potter...

2. 然后问："What do you think about climate change?"
我说我认为气候变化是很严重的问题...

3. 最后问中文："你觉得什么是领导力？"
...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <Space size="middle" style={{ width: '100%' }} wrap>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>指定专项类别（可选）</label>
                <Select
                  placeholder="AI 自动识别"
                  allowClear
                  style={{ width: 200 }}
                  value={category}
                  onChange={setCategory}
                >
                  {CATEGORIES.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>目标学校（可选）</label>
                <Select
                  placeholder="选择学校"
                  allowClear
                  style={{ width: 200 }}
                  value={schoolCode}
                  onChange={setSchoolCode}
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
              </div>
            </Space>

            <Button
              type="primary"
              size="large"
              icon={<RobotOutlined />}
              onClick={handleExtract}
              loading={extracting}
              disabled={!inputText.trim()}
            >
              {extracting ? 'AI 分析中...' : 'AI 分析并提取问题'}
            </Button>
          </Space>
        </Card>
      )}

      {/* 步骤 2: 查看和编辑提取结果 */}
      {currentStep === 1 && extractedData && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {extractedData.summary && (
            <Card title="📊 AI 分析总结">
              <Paragraph>{extractedData.summary}</Paragraph>
            </Card>
          )}

          {/* 弱点分析卡片 */}
          {extractedData.weaknesses && extractedData.weaknesses.length > 0 && (
            <Card title={`⚠️ 识别到 ${extractedData.weaknesses.length} 个需要改进的弱点`}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {extractedData.weaknesses.map((weakness, index) => (
                  <Card
                    key={index}
                    type="inner"
                    size="small"
                    title={
                      <Space>
                        <Tag color={
                          weakness.severity === 'high' ? 'red' :
                          weakness.severity === 'medium' ? 'orange' : 'blue'
                        }>
                          {weakness.severity === 'high' ? '高' :
                           weakness.severity === 'medium' ? '中' : '低'}严重
                        </Tag>
                        <Tag color="blue">{getCategoryLabel(weakness.category)}</Tag>
                        <span>{weakness.description}</span>
                      </Space>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {weakness.example_text && (
                        <div>
                          <Text type="secondary">示例：</Text>
                          <Paragraph style={{ marginLeft: 16, fontStyle: 'italic' }}>
                            "{weakness.example_text}"
                          </Paragraph>
                        </div>
                      )}
                      <div>
                        <Text type="secondary">改进建议：</Text>
                        <Paragraph style={{ marginLeft: 16 }}>
                          {weakness.improvement_suggestions}
                        </Paragraph>
                      </div>
                      {weakness.related_topics && weakness.related_topics.length > 0 && (
                        <div>
                          <Text type="secondary">相关话题：</Text>
                          <div style={{ marginLeft: 16, marginTop: 8 }}>
                            {weakness.related_topics.map((topic) => (
                              <Tag key={topic}>{topic}</Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
              <Alert
                message="💡 提示"
                description="系统将保存这些弱点分析，后续可以根据弱点生成针对性的练习题目。"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </Card>
          )}

          <Card
            title={`✅ 提取到 ${extractedData.questions.length} 个问题`}
            extra={
              <Space>
                <Button onClick={handleReset}>重新输入</Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveToQuestionBank}
                  loading={saving}
                  disabled={extractedData.questions.length === 0}
                >
                  保存到题库
                </Button>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={extractedData.questions}
              rowKey={(_, index) => index!.toString()}
              pagination={false}
              size="small"
            />
          </Card>
        </Space>
      )}

      {/* 编辑问题弹窗 */}
      <Modal
        title="编辑问题"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="question_text"
            label="问题内容"
            rules={[{ required: true, message: '请输入问题内容' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="category" label="专项类别" rules={[{ required: true, message: '请选择类别' }]}>
            <Select>
              {CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
            <Select>
              <Option value="easy">简单</Option>
              <Option value="medium">中等</Option>
              <Option value="hard">困难</Option>
            </Select>
          </Form.Item>

          <Form.Item name="reference_answer" label="参考答案">
            <TextArea rows={4} placeholder="建议答案要点" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车" />
          </Form.Item>

          <Form.Item name="school_code" label="目标学校">
            <Select allowClear placeholder="选择学校（可选）" loading={loadingSchools}>
              {schools.map((school) => (
                <Option key={school.code} value={school.code}>
                  {school.name_zh} ({school.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="原始回答或其他备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
