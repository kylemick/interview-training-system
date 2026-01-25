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

// 七大专项类别
const CATEGORIES = [
  { value: 'english-oral', label: '英文口语', color: 'blue' },
  { value: 'chinese-oral', label: '中文表达', color: 'green' },
  { value: 'logic-thinking', label: '逻辑思维', color: 'purple' },
  { value: 'current-affairs', label: '时事常识', color: 'orange' },
  { value: 'science-knowledge', label: '科学常识', color: 'cyan' },
  { value: 'personal-growth', label: '个人成长', color: 'magenta' },
  { value: 'group-discussion', label: '小组讨论', color: 'red' },
];

const DIFFICULTIES = [
  { value: 'easy', label: '简单', color: 'green' },
  { value: 'medium', label: '中等', color: 'orange' },
  { value: 'hard', label: '困难', color: 'red' },
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

  // 筛选条件
  const [filters, setFilters] = useState<{
    category?: string;
    difficulty?: string;
    source?: string;
  }>({});

  // 优化：并行加载数据，使用 useCallback 避免重复创建函数
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingSchools(true);

      // 并行请求所有数据
      const [questionsRes, statsRes, schoolsRes] = await Promise.all([
        api.questions.list(filters).catch(err => {
          console.error('获取题目列表失败:', err);
          message.error('获取题目列表失败');
          return { success: false, data: [] };
        }),
        api.questions.stats().catch(err => {
          console.error('获取统计信息失败:', err);
          return { success: false, data: null };
        }),
        api.schools.list().catch(err => {
          console.error('获取学校列表失败:', err);
          message.error('获取学校列表失败');
          return { success: false, data: [] };
        }),
      ]);

      // enhancedRequest 返回格式：{ success: true, data: ... }
      setQuestions(questionsRes.success ? questionsRes.data : []);
      setStats(statsRes.success ? statsRes.data : null);
      setSchools(schoolsRes.success ? schoolsRes.data : []);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
      setLoadingSchools(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
    
    // 清理函数：组件卸载时取消所有pending请求
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
      message.success('题目已删除');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  }, [loadData]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingQuestion) {
        await api.questions.update(editingQuestion.id.toString(), values);
        message.success('题目已更新');
      } else {
        await api.questions.create(values);
        message.success('题目已创建');
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  }, [editingQuestion, form, loadData]);

  const { executeWithThinking } = useAiThinking();

  const handleAiGenerate = useCallback(async () => {
    try {
      const values = await aiForm.validateFields();
      setLoading(true);

      const categoryLabel = CATEGORIES.find(c => c.value === values.category)?.label || values.category;

      await executeWithThinking(
        'generate-questions',
        async () => {
          return await api.ai.generateQuestions({
            ...values,
            save: true,
          });
        },
        {
          taskName: `生成${categoryLabel}题目`,
          onSuccess: (response) => {
            message.success(response.message || '题目生成成功');
            setAiModalOpen(false);
            aiForm.resetFields();
            loadData();
          },
          onError: (error: any) => {
            message.error(error.response?.data?.error?.message || 'AI 生成失败');
          },
        }
      );
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || 'AI 生成失败');
    } finally {
      setLoading(false);
    }
  }, [aiForm, loadData, executeWithThinking]);

  // 优化：使用 useMemo 缓存计算结果
  const getCategoryLabel = useCallback((value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  }, []);

  const getCategoryColor = useCallback((value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.color || 'default';
  }, []);

  const getDifficultyLabel = useCallback((value: string) => {
    return DIFFICULTIES.find((d) => d.value === value)?.label || value;
  }, []);

  const getDifficultyColor = useCallback((value: string) => {
    return DIFFICULTIES.find((d) => d.value === value)?.color || 'default';
  }, []);

  // 优化：使用 useMemo 缓存 columns 定义
  const columns = useMemo(() => [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>{getCategoryLabel(category)}</Tag>
      ),
    },
    {
      title: '题目内容',
      dataIndex: 'question_text',
      key: 'question_text',
      ellipsis: true,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>{getDifficultyLabel(difficulty)}</Tag>
      ),
    },
    {
      title: '标签',
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
      title: '学校',
      dataIndex: 'school_code',
      key: 'school_code',
      width: 80,
      render: (code: string) => code && <Tag>{code}</Tag>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => {
        const sourceMap: Record<string, { label: string; color: string }> = {
          seed: { label: '种子数据', color: 'blue' },
          ai_generated: { label: 'AI生成', color: 'purple' },
          manual: { label: '手动添加', color: 'green' },
          interview_memory: { label: '面试回忆', color: 'orange' },
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
            编辑
          </Button>
          <Popconfirm title="确定删除此题目？" onConfirm={() => handleDelete(record.id)}>
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
      <h1>题库管理</h1>

      {/* 统计信息 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="题目总数" value={stats.total || 0} />
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

      {/* 筛选和操作 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="选择类别"
          allowClear
          style={{ width: 150 }}
          value={filters.category}
          onChange={(value) => setFilters({ ...filters, category: value })}
        >
          {CATEGORIES.map((cat) => (
            <Option key={cat.value} value={cat.value}>
              {cat.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="选择难度"
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
          placeholder="选择来源"
          allowClear
          style={{ width: 120 }}
          value={filters.source}
          onChange={(value) => setFilters({ ...filters, source: value })}
        >
          <Option value="seed">种子数据</Option>
          <Option value="ai_generated">AI生成</Option>
          <Option value="manual">手动添加</Option>
          <Option value="interview_memory">面试回忆</Option>
        </Select>

        <Button icon={<ReloadOutlined />} onClick={loadData}>
          刷新
        </Button>

        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加题目
        </Button>

        <Button type="primary" icon={<RobotOutlined />} onClick={() => setAiModalOpen(true)}>
          AI 生成题目
        </Button>
      </Space>

      {/* 题目列表 */}
      <Table
        columns={columns}
        dataSource={questions}
        rowKey="id"
        loading={loading}
        pagination={{
          showTotal: (total) => `共 ${total} 道题目`,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 添加/编辑题目弹窗 */}
      <Modal
        title={editingQuestion ? '编辑题目' : '添加题目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择类别' }]}>
            <Select placeholder="选择类别">
              {CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
            <Select placeholder="选择难度">
              {DIFFICULTIES.map((diff) => (
                <Option key={diff.value} value={diff.value}>
                  {diff.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="question_text" label="题目内容" rules={[{ required: true, message: '请输入题目内容' }]}>
            <TextArea rows={4} placeholder="输入题目内容" />
          </Form.Item>

          <Form.Item name="reference_answer" label="参考答案">
            <TextArea rows={4} placeholder="输入参考答案要点" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车" />
          </Form.Item>

          <Form.Item name="school_code" label="目标学校（可选）">
            <Select
              placeholder="选择学校或不指定"
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

      {/* AI 生成题目弹窗 */}
      <Modal
        title="🤖 AI 生成题目"
        open={aiModalOpen}
        onOk={handleAiGenerate}
        onCancel={() => setAiModalOpen(false)}
        okText="生成并保存"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={aiForm} layout="vertical">
          <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择类别' }]}>
            <Select placeholder="选择类别">
              {CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="difficulty" label="难度" rules={[{ required: true, message: '请选择难度' }]}>
            <Select placeholder="选择难度">
              {DIFFICULTIES.map((diff) => (
                <Option key={diff.value} value={diff.value}>
                  {diff.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="count" label="生成数量" initialValue={5}>
            <Select>
              {[1, 3, 5, 10, 15, 20].map((num) => (
                <Option key={num} value={num}>
                  {num} 道题目
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="school_code" label="目标学校（可选）">
            <Select
              placeholder="选择学校或不指定"
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

          <Form.Item name="topic" label="主题（可选）">
            <Input placeholder="如: 环境保护, 科技发展" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Questions;
