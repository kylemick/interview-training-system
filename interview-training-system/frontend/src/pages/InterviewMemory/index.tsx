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
import { useAiThinking } from '../../hooks/useAiThinking'

const { TextArea } = Input
const { Option } = Select
const { Title, Paragraph, Text } = Typography

// 七大專項類別
const CATEGORIES = [
  { value: 'english-oral', label: '英文口語' },
  { value: 'chinese-oral', label: '中文表達' },
  { value: 'logic-thinking', label: '邏輯思維' },
  { value: 'current-affairs', label: '時事常識' },
  { value: 'science-knowledge', label: '科學常識' },
  { value: 'personal-growth', label: '个人成長' },
  { value: 'group-discussion', label: '小組討論' },
];

// 四个學科能力類別
const SUBJECT_CATEGORIES = [
  { value: 'chinese-reading', label: '中文阅读理解' },
  { value: 'english-reading', label: '英文阅读理解' },
  { value: 'mathematics', label: '數學基础' },
  { value: 'science-practice', label: '科學实践' },
];

// 所有類別（七大專項 + 四个學科能力）
const ALL_CATEGORIES = [...CATEGORIES, ...SUBJECT_CATEGORIES];

// 學校列表從API動態加载，存储在 schools 狀態中

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
  const [interviewRound, setInterviewRound] = useState<string>()
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [, setEditingQuestion] = useState<ExtractedQuestion | null>(null)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [form] = Form.useForm()
  const [schools, setSchools] = useState<Array<{ code: string; name_zh: string }>>([])
  const [loadingSchools, setLoadingSchools] = useState(false)

  // 加载學校列表
  useEffect(() => {
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
    loadSchools()
  }, [])

  const { executeWithThinking } = useAiThinking()

  // AI 分析文本
  const handleExtract = async () => {
    if (!inputText.trim()) {
      message.warning('请输入面試回憶文本')
      return
    }

    setExtracting(true)
    try {
      await executeWithThinking(
        'extract-interview-memory',
        async () => {
          return await api.ai.extractInterviewMemory({
            text: inputText,
            category,
            school_code: schoolCode,
            interview_round: interviewRound,
          });
        },
        {
          taskName: '提取面試回憶',
          onSuccess: (response) => {
            const raw = response?.data ?? response
            const data = {
              questions: Array.isArray(raw?.questions) ? raw.questions : [],
              summary: typeof raw?.summary === 'string' ? raw.summary : '',
              weaknesses: Array.isArray(raw?.weaknesses) ? raw.weaknesses : [],
            }
            setExtractedData(data)
            setCurrentStep(1)
            message.success(response?.message || 'AI 分析成功')
          },
          onError: (error: any) => {
            message.error(error.response?.data?.message || 'AI 分析失敗')
          },
        }
      );
    } finally {
      setExtracting(false)
    }
  }

  // 编輯問題
  const handleEdit = (question: ExtractedQuestion, index: number) => {
    setEditingQuestion(question)
    setEditingIndex(index)
    form.setFieldsValue(question)
    setEditModalVisible(true)
  }

  // 保存编輯
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields()
      
      if (extractedData && editingIndex >= 0) {
        const newQuestions = [...extractedData.questions]
        newQuestions[editingIndex] = { ...values, tags: values.tags || [] }
        setExtractedData({ ...extractedData, questions: newQuestions })
        message.success('已更新問題')
      }
      
      setEditModalVisible(false)
      setEditingQuestion(null)
      setEditingIndex(-1)
    } catch (error) {
      console.error('保存失敗:', error)
    }
  }

  // 删除問題
  const handleDelete = (index: number) => {
    Modal.confirm({
      title: '確认删除',
      content: '確定要删除这个問題吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (extractedData) {
          const newQuestions = extractedData.questions.filter((_, i) => i !== index)
          setExtractedData({ ...extractedData, questions: newQuestions })
          message.success('已删除問題')
        }
      },
    })
  }

  // 保存到題庫
  const handleSaveToQuestionBank = async () => {
    if (!extractedData || extractedData.questions.length === 0) {
      message.warning('没有可保存的問題')
      return
    }

    setSaving(true)
    try {
      // 保存問題
      await executeWithThinking(
        'save-interview-questions',
        async () => {
          return await api.ai.saveInterviewQuestions({
            questions: extractedData.questions,
            source_text: inputText,
          });
        },
        {
          taskName: '保存面試題目',
          onSuccess: async (questionsResponse) => {
            // 保存弱點分析（如果有）
            if (extractedData?.weaknesses && extractedData.weaknesses.length > 0) {
              await executeWithThinking(
                'save-weaknesses',
                async () => {
                  return await api.ai.saveWeaknesses({
                    weaknesses: extractedData.weaknesses!,
                    source_text: inputText,
                    // 不傳递student_name，让後端從设置获取
                  });
                },
                {
                  taskName: '保存弱點分析',
                  onSuccess: () => {
                    message.success(
                      `${questionsResponse.message || '問題已保存'}，同時保存了 ${extractedData?.weaknesses?.length || 0} 条弱點分析`
                    );
                  },
                  onError: (error: any) => {
                    message.warning('問題已保存，但弱點分析保存失敗：' + (error.response?.data?.message || '保存失敗'));
                  },
                }
              );
            } else {
              message.success(questionsResponse.message || '問題已保存');
            }
            
            // 重置表单
            setCurrentStep(0)
            setInputText('')
            setCategory(undefined)
            setSchoolCode(undefined)
            setExtractedData(null)
          },
          onError: (error: any) => {
            message.error(error.response?.data?.message || '保存失敗');
          },
        }
      );
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
      hard: '困難',
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
      title: '問題',
      dataIndex: 'question_text',
      key: 'question_text',
      ellipsis: true,
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: string) => <Tag color="blue">{getCategoryLabel(cat)}</Tag>,
    },
    {
      title: '難度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (diff: string) => (
        <Tag color={getDifficultyColor(diff)}>{getDifficultyLabel(diff)}</Tag>
      ),
    },
    {
      title: '標籤',
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
            编輯
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
        <FileTextOutlined /> 面試回憶錄入
      </Title>
      <Paragraph type="secondary">
        将面試回憶文本粘贴到下方，AI 将自動提取問題并分類，您可以编輯後保存到題庫。
      </Paragraph>

      <Steps
        current={currentStep}
        style={{ marginBottom: 32 }}
        items={[
          { title: '输入文本', icon: <FileTextOutlined /> },
          { title: 'AI 分析', icon: <RobotOutlined /> },
          { title: '保存題庫', icon: <SaveOutlined /> },
        ]}
      />

      {/* 步骤 1: 输入文本 */}
      {currentStep === 0 && (
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="使用說明"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>粘贴完整的面試回憶文本，包括問題和回答</li>
                  <li>AI 會自動識別問題、分類、難度和建議答案</li>
                  <li>您可以選擇指定專項類別和學校，AI 會優先使用您的選擇</li>
                  <li>分析後可以编輯每个問題，然後批量保存到題庫</li>
                </ul>
              }
              type="info"
              showIcon
            />

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                面試回憶文本 <Text type="danger">*</Text>
              </label>
              <TextArea
                rows={12}
                placeholder={`请粘贴面試回憶文本，例如：

今天去了SPCC面試，遇到了以下問題：

1. 面試官先用英文問我："Tell me about your favorite book."
我回答了我最喜欢的書是Harry Potter...

2. 然後問："What do you think about climate change?"
我說我认为气候变化是很嚴重的問題...

3. 最後問中文："你觉得什么是領導力？"
...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <Space size="middle" style={{ width: '100%' }} wrap>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>指定專項類別（可選）</label>
                <Select
                  placeholder="AI 自動識別"
                  allowClear
                  style={{ width: 200 }}
                  value={category}
                  onChange={setCategory}
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>目標學校（可選）</label>
                <Select
                  placeholder="選擇學校"
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
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>面試輪次（可選）</label>
                <Select
                  placeholder="選擇輪次"
                  allowClear
                  style={{ width: 150 }}
                  value={interviewRound}
                  onChange={setInterviewRound}
                >
                  <Option value="first-round">第一輪</Option>
                  <Option value="second-round">第二輪</Option>
                  <Option value="final-round">最终輪</Option>
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
              {extracting ? 'AI 分析中...' : 'AI 分析并提取問題'}
            </Button>
          </Space>
        </Card>
      )}

      {/* 步骤 2: 查看和编輯提取結果 */}
      {currentStep === 1 && extractedData && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* AI 分析總結：始終顯示，無內容時顯示佔位 */}
          <Card title="📊 AI 分析總結">
            <Paragraph>
              {extractedData.summary?.trim()
                ? extractedData.summary
                : '本次分析未生成總結。可重新貼上更完整的面試回憶文本後再試。'}
            </Paragraph>
          </Card>

          {/* 弱點分析：始終顯示，無弱點時顯示佔位 */}
          <Card
            title={
              extractedData.weaknesses && extractedData.weaknesses.length > 0
                ? `⚠️ 識別到 ${extractedData.weaknesses.length} 個需要改進的弱點`
                : '⚠️ 弱點分析'
            }
          >
            {extractedData.weaknesses && extractedData.weaknesses.length > 0 ? (
              <>
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
                             weakness.severity === 'medium' ? '中' : '低'}嚴重
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
                          <Text type="secondary">改進建議：</Text>
                          <Paragraph style={{ marginLeft: 16 }}>
                            {weakness.improvement_suggestions}
                          </Paragraph>
                        </div>
                        {weakness.related_topics && weakness.related_topics.length > 0 && (
                          <div>
                            <Text type="secondary">相關話題：</Text>
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
                  description="係統将保存这些弱點分析，後续可以根據弱點生成針對性的練習題目。"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </>
            ) : (
              <Paragraph type="secondary">
                本次未識別到需要改進的弱點。若面試回憶中包含學生回答或表現描述，AI 會嘗試從中分析弱點。
              </Paragraph>
            )}
          </Card>

          <Card
            title={`✅ 提取到 ${extractedData.questions.length} 个問題`}
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
                  保存到題庫
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

      {/* 编輯問題弹窗 */}
      <Modal
        title="编輯問題"
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
            label="問題內容"
            rules={[{ required: true, message: '请输入問題內容' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="category" label="專項類別" rules={[{ required: true, message: '请選擇類別' }]}>
            <Select>
              {CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="難度" rules={[{ required: true, message: '请選擇難度' }]}>
            <Select>
              <Option value="easy">简单</Option>
              <Option value="medium">中等</Option>
              <Option value="hard">困難</Option>
            </Select>
          </Form.Item>

          <Form.Item name="reference_answer" label="參考答案">
            <TextArea rows={4} placeholder="建議答案要點" />
          </Form.Item>

          <Form.Item name="tags" label="標籤">
            <Select mode="tags" placeholder="输入標籤後按回车" />
          </Form.Item>

          <Form.Item name="school_code" label="目標學校">
            <Select allowClear placeholder="選擇學校（可選）" loading={loadingSchools}>
              {schools.map((school) => (
                <Option key={school.code} value={school.code}>
                  {school.name_zh} ({school.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="備注">
            <TextArea rows={2} placeholder="原始回答或其他備注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
