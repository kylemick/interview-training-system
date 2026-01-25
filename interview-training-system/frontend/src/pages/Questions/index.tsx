import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Card,
  Statistic,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { api, cancelAllPendingRequests } from '../../utils/api';
import { useAiThinking } from '../../hooks/useAiThinking';

const { TextArea } = Input;
const { Option } = Select;

// 七大專項類別
const CATEGORIES = [
  { value: 'english-oral', label: '英文口語', color: 'blue' },
  { value: 'chinese-oral', label: '中文表達', color: 'green' },
  { value: 'logic-thinking', label: '邏輯思維', color: 'purple' },
  { value: 'current-affairs', label: '時事常識', color: 'orange' },
  { value: 'science-knowledge', label: '科學常識', color: 'cyan' },
  { value: 'personal-growth', label: '个人成長', color: 'magenta' },
  { value: 'group-discussion', label: '小組討論', color: 'red' },
];

// 四个學科能力類別
const SUBJECT_CATEGORIES = [
  { value: 'chinese-reading', label: '中文阅读理解', color: 'green' },
  { value: 'english-reading', label: '英文阅读理解', color: 'blue' },
  { value: 'mathematics', label: '數學基础', color: 'purple' },
  { value: 'science-practice', label: '科學实践', color: 'cyan' },
];

// 所有類別（七大專項 + 四个學科能力）
const ALL_CATEGORIES = [...CATEGORIES, ...SUBJECT_CATEGORIES];

const DIFFICULTIES = [
  { value: 'easy', label: '简单', color: 'green' },
  { value: 'medium', label: '中等', color: 'orange' },
  { value: 'hard', label: '困難', color: 'red' },
];

interface Question {
  id: number;
  category: string;
  question_text: string;
  difficulty: string;
  reference_answer: string;
  tags: string[];
  school_code?: string;
  source: string;
  created_at: string;
  updated_at: string;
}

interface QuestionStats {
  total: number;
  by_category: { category: string; count: number }[];
  by_difficulty: { difficulty: string; count: number }[];
  by_source: { source: string; count: number }[];
}

interface School {
  id: number;
  code: string;
  name: string;
  name_zh: string;
  focus_areas: string[];
  interview_style: string;
  notes?: string;
}

const Questions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form] = Form.useForm();
  const [aiForm] = Form.useForm();

  // 筛選条件
  const [filters, setFilters] = useState<{
    category?: string;
    difficulty?: string;
    source?: string;
  }>({});

  // 優化：并行加载數據，使用 useCallback 避免重复創建函數
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingSchools(true);

      // 并行请求所有數據
      const [questionsRes, statsRes, schoolsRes] = await Promise.all([
        api.questions.list(filters).catch(err => {
          console.error('获取題目列表失敗:', err);
          message.error('获取題目列表失敗');
          return { success: false, data: [] };
        }),
        api.questions.stats().catch(err => {
          console.error('获取統計信息失敗:', err);
          return { success: false, data: null };
        }),
        api.schools.list().catch(err => {
          console.error('获取學校列表失敗:', err);
          message.error('获取學校列表失敗');
          return { success: false, data: [] };
        }),
      ]);

      // enhancedRequest 返回格式：{ success: true, data: ... }
      setQuestions(questionsRes.success ? questionsRes.data : []);
      setStats(statsRes.success ? statsRes.data : null);
      setSchools(schoolsRes.success ? schoolsRes.data : []);
    } catch (error) {
      console.error('加载數據失敗:', error);
    } finally {
      setLoading(false);
      setLoadingSchools(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
    
    // 清理函數：組件卸载時取消所有pending请求
    return () => {
      cancelAllPendingRequests();
    };
  }, [loadData]);

  const handleAdd = () => {
    setEditingQuestion(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = useCallback((record: Question) => {
    setEditingQuestion(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  }, [form]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.questions.delete(id.toString());
      message.success('題目已删除');
      loadData();
    } catch (error) {
      message.error('删除失敗');
    }
  }, [loadData]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingQuestion) {
        await api.questions.update(editingQuestion.id.toString(), values);
        message.success('題目已更新');
      } else {
        await api.questions.create(values);
        message.success('題目已創建');
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      message.error('操作失敗');
    }
  }, [editingQuestion, form, loadData]);

  const { executeWithThinking } = useAiThinking();

  const handleAiGenerate = useCallback(async () => {
    try {
      const values = await aiForm.validateFields();
      setLoading(true);

      const categoryLabel = ALL_CATEGORIES.find(c => c.value === values.category)?.label || values.category;

      await executeWithThinking(
        'generate-questions',
        async () => {
          return await api.ai.generateQuestions({
            ...values,
            save: true,
          });
        },
        {
          taskName: `生成${categoryLabel}題目`,
          onSuccess: (response) => {
            message.success(response.message || '題目生成成功');
            setAiModalOpen(false);
            aiForm.resetFields();
            loadData();
          },
          onError: (error: any) => {
            message.error(error.response?.data?.error?.message || 'AI 生成失敗');
          },
        }
      );
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || 'AI 生成失敗');
    } finally {
      setLoading(false);
    }
  }, [aiForm, loadData, executeWithThinking]);

  // 優化：使用 useMemo 缓存計算結果
  const getCategoryLabel = useCallback((value: string) => {
    return ALL_CATEGORIES.find((c) => c.value === value)?.label || value;
  }, []);

  const getCategoryColor = useCallback((value: string) => {
    return ALL_CATEGORIES.find((c) => c.value === value)?.color || 'default';
  }, []);

  const getDifficultyLabel = useCallback((value: string) => {
    return DIFFICULTIES.find((d) => d.value === value)?.label || value;
  }, []);

  const getDifficultyColor = useCallback((value: string) => {
    return DIFFICULTIES.find((d) => d.value === value)?.color || 'default';
  }, []);

  // 優化：使用 useMemo 缓存 columns 定义
  const columns = useMemo(() => [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>{getCategoryLabel(category)}</Tag>
      ),
    },
    {
      title: '題目內容',
      dataIndex: 'question_text',
      key: 'question_text',
      ellipsis: true,
    },
    {
      title: '難度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>{getDifficultyLabel(difficulty)}</Tag>
      ),
    },
    {
      title: '標籤',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags: string[]) => (
        <>
          {tags?.map((tag) => (
            <Tag key={tag} style={{ marginBottom: 4 }}>
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '學校',
      dataIndex: 'school_code',
      key: 'school_code',
      width: 80,
      render: (code: string) => code && <Tag>{code}</Tag>,
    },
    {
      title: '來源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => {
        const sourceMap: Record<string, { label: string; color: string }> = {
          seed: { label: '種子數據', color: 'blue' },
          ai_generated: { label: 'AI生成', color: 'purple' },
          manual: { label: '手動添加', color: 'green' },
          interview_memory: { label: '面試回憶', color: 'orange' },
        };
        const config = sourceMap[source] || { label: source, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Question) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编輯
          </Button>
          <Popconfirm title="確定删除此題目？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [getCategoryColor, getCategoryLabel, getDifficultyColor, getDifficultyLabel, handleEdit, handleDelete]);

  return (
    <div style={{ padding: 24 }}>
      <h1>題庫管理</h1>

      {/* 統計信息 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="題目總數" value={stats.total || 0} />
            </Card>
          </Col>
          {stats.by_category && stats.by_category.slice(0, 3).map((item) => (
            <Col span={6} key={item.category}>
              <Card>
                <Statistic title={getCategoryLabel(item.category)} value={item.count} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 筛選和操作 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="選擇類別"
          allowClear
          style={{ width: 150 }}
          value={filters.category}
          onChange={(value) => setFilters({ ...filters, category: value })}
        >
          {ALL_CATEGORIES.map((cat) => (
            <Option key={cat.value} value={cat.value}>
              {cat.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="選擇難度"
          allowClear
          style={{ width: 120 }}
          value={filters.difficulty}
          onChange={(value) => setFilters({ ...filters, difficulty: value })}
        >
          {DIFFICULTIES.map((diff) => (
            <Option key={diff.value} value={diff.value}>
              {diff.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="選擇來源"
          allowClear
          style={{ width: 120 }}
          value={filters.source}
          onChange={(value) => setFilters({ ...filters, source: value })}
        >
          <Option value="seed">種子數據</Option>
          <Option value="ai_generated">AI生成</Option>
          <Option value="manual">手動添加</Option>
          <Option value="interview_memory">面試回憶</Option>
        </Select>

        <Button icon={<ReloadOutlined />} onClick={loadData}>
          刷新
        </Button>

        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加題目
        </Button>

        <Button type="primary" icon={<RobotOutlined />} onClick={() => setAiModalOpen(true)}>
          AI 生成題目
        </Button>
      </Space>

      {/* 題目列表 */}
      <Table
        columns={columns}
        dataSource={questions}
        rowKey="id"
        loading={loading}
        pagination={{
          showTotal: (total) => `共 ${total} 道題目`,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 添加/编輯題目弹窗 */}
      <Modal
        title={editingQuestion ? '编輯題目' : '添加題目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="類別" rules={[{ required: true, message: '请選擇類別' }]}>
            <Select placeholder="選擇類別">
              {ALL_CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="難度" rules={[{ required: true, message: '请選擇難度' }]}>
            <Select placeholder="選擇難度">
              {DIFFICULTIES.map((diff) => (
                <Option key={diff.value} value={diff.value}>
                  {diff.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="question_text" label="題目內容" rules={[{ required: true, message: '请输入題目內容' }]}>
            <TextArea rows={4} placeholder="输入題目內容" />
          </Form.Item>

          <Form.Item name="reference_answer" label="參考答案">
            <TextArea rows={4} placeholder="输入參考答案要點" />
          </Form.Item>

          <Form.Item name="tags" label="標籤">
            <Select mode="tags" placeholder="输入標籤後按回车" />
          </Form.Item>

          <Form.Item name="school_code" label="目標學校（可選）">
            <Select
              placeholder="選擇學校或不指定"
              allowClear
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
        </Form>
      </Modal>

      {/* AI 生成題目弹窗 */}
      <Modal
        title="🤖 AI 生成題目"
        open={aiModalOpen}
        onOk={handleAiGenerate}
        onCancel={() => setAiModalOpen(false)}
        okText="生成并保存"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={aiForm} layout="vertical">
          <Form.Item name="category" label="類別" rules={[{ required: true, message: '请選擇類別' }]}>
            <Select placeholder="選擇類別">
              {ALL_CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="難度" rules={[{ required: true, message: '请選擇難度' }]}>
            <Select placeholder="選擇難度">
              {DIFFICULTIES.map((diff) => (
                <Option key={diff.value} value={diff.value}>
                  {diff.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="count" label="生成數量" initialValue={5}>
            <Select>
              {[1, 3, 5, 10, 15, 20].map((num) => (
                <Option key={num} value={num}>
                  {num} 道題目
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="school_code" label="目標學校（可選）">
            <Select
              placeholder="選擇學校或不指定"
              allowClear
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

          <Form.Item name="topic" label="主題（可選）">
            <Input placeholder="如: 环境保护, 科技發展" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Questions;
