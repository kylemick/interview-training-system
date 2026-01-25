import { useState, useEffect, useCallback } from 'react';
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
  Popconfirm,
  Empty,
  Spin,
  Typography,
  Breadcrumb,
  Descriptions,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  BookOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  HomeOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 专项类别映射
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-expression': '中文表达',
  'chinese-oral': '中文表达',
  'logic-thinking': '逻辑思维',
  'logical-thinking': '逻辑思维',
  'current-affairs': '时事常识',
  'science-knowledge': '科学常识',
  'personal-growth': '个人成长',
  'group-discussion': '小组讨论',
};

// 弱点类型映射
const WEAKNESS_TYPE_MAP: Record<string, string> = {
  vocabulary: '词汇量',
  grammar: '语法',
  logic: '逻辑思维',
  knowledge_gap: '知识盲区',
  confidence: '自信心',
  expression: '表达能力',
};

// 素材类型映射
const MATERIAL_TYPE_MAP: Record<string, string> = {
  text: '知识点讲解',
  example: '常见错误示例',
  tip: '改进技巧',
  practice: '练习建议',
  link: '相关链接',
};

interface LearningMaterial {
  id: number;
  weakness_id?: number;
  category: string;
  weakness_type: string;
  title: string;
  content: string;
  material_type: string;
  tags: string[];
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  weakness?: any;
}

export default function LearningMaterials() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState<LearningMaterial | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // 筛选条件
  const [filters, setFilters] = useState<{
    category?: string;
    weakness_type?: string;
    material_type?: string;
    search?: string;
  }>({});
  
  // 分页
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 加载素材列表
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        ...filters,
        page: pagination.current,
        pageSize: pagination.pageSize,
      };
      const res = await api.learningMaterials.list(params);
      if (res.success) {
        setMaterials(res.data || []);
        if (res.pagination) {
          setPagination(prev => ({
            ...prev,
            total: res.pagination.total,
          }));
        }
      }
    } catch (error) {
      console.error('加载学习素材列表失败:', error);
      message.error('加载学习素材列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.pageSize]);

  // 加载素材详情
  const loadMaterialDetail = useCallback(async (materialId: string) => {
    try {
      setLoading(true);
      const res = await api.learningMaterials.get(materialId);
      if (res.success) {
        setCurrentMaterial(res.data);
        // 增加使用次数
        await api.learningMaterials.incrementUsage(materialId);
      }
    } catch (error) {
      console.error('加载素材详情失败:', error);
      message.error('加载素材详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadMaterialDetail(id);
    } else {
      loadMaterials();
    }
  }, [id, loadMaterials, loadMaterialDetail]);

  // 如果有ID，显示详情页面
  if (id) {
    return <MaterialDetail material={currentMaterial} loading={loading} onBack={() => navigate('/learning-materials')} />;
  }

  // 删除素材
  const handleDelete = async (materialId: number) => {
    try {
      await api.learningMaterials.delete(materialId);
      message.success('删除成功');
      loadMaterials();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 编辑素材
  const handleEdit = (material: LearningMaterial) => {
    setCurrentMaterial(material);
    form.setFieldsValue({
      title: material.title,
      content: material.content,
      material_type: material.material_type,
      tags: material.tags,
    });
    setEditModalOpen(true);
  };

  // 保存编辑
  const handleSave = async (values: any) => {
    if (!currentMaterial) return;
    
    try {
      await api.learningMaterials.update(currentMaterial.id, values);
      message.success('保存成功');
      setEditModalOpen(false);
      loadMaterials();
    } catch (error) {
      message.error('保存失败');
    }
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: LearningMaterial) => (
        <a onClick={() => navigate(`/learning-materials/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{CATEGORY_MAP[category] || category}</Tag>,
    },
    {
      title: '弱点类型',
      dataIndex: 'weakness_type',
      key: 'weakness_type',
      render: (type: string) => <Tag>{WEAKNESS_TYPE_MAP[type] || type}</Tag>,
    },
    {
      title: '素材类型',
      dataIndex: 'material_type',
      key: 'material_type',
      render: (type: string) => <Tag color="green">{MATERIAL_TYPE_MAP[type] || type}</Tag>,
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      sorter: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LearningMaterial) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/learning-materials/${record.id}`)}>
            查看
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此素材？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined /> <a onClick={() => navigate('/')}>首页</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>学习素材</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={
          <Space>
            <BookOutlined />
            <span>学习素材管理</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/learning-materials/new')}>
            新建素材
          </Button>
        }
      >
        {/* 筛选器 */}
        <Card type="inner" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="专项类别"
                allowClear
                style={{ width: '100%' }}
                value={filters.category}
                onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <Option key={key} value={key}>{label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="弱点类型"
                allowClear
                style={{ width: '100%' }}
                value={filters.weakness_type}
                onChange={(value) => setFilters(prev => ({ ...prev, weakness_type: value }))}
              >
                {Object.entries(WEAKNESS_TYPE_MAP).map(([key, label]) => (
                  <Option key={key} value={key}>{label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="素材类型"
                allowClear
                style={{ width: '100%' }}
                value={filters.material_type}
                onChange={(value) => setFilters(prev => ({ ...prev, material_type: value }))}
              >
                {Object.entries(MATERIAL_TYPE_MAP).map(([key, label]) => (
                  <Option key={key} value={key}>{label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Input
                placeholder="搜索标题或内容"
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                allowClear
              />
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={materials}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            },
          }}
        />
      </Card>

      {/* 编辑对话框 */}
      <Modal
        title="编辑学习素材"
        open={editModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalOpen(false);
          setCurrentMaterial(null);
          form.resetFields();
        }}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="material_type" label="素材类型" rules={[{ required: true, message: '请选择素材类型' }]}>
            <Select>
              {Object.entries(MATERIAL_TYPE_MAP).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="内容（Markdown格式）" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={10} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车">
              {currentMaterial?.tags?.map((tag) => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// 素材详情组件
function MaterialDetail({
  material,
  loading,
  onBack,
}: {
  material: LearningMaterial | null;
  loading: boolean;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />;
  }

  if (!material) {
    return <Empty description="素材不存在" />;
  }

  const handleEdit = () => {
    form.setFieldsValue({
      title: material.title,
      content: material.content,
      material_type: material.material_type,
      tags: material.tags,
    });
    setEditModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      await api.learningMaterials.update(material.id, values);
      message.success('保存成功');
      setEditModalOpen(false);
      onBack();
      window.location.reload(); // 重新加载页面
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDelete = async () => {
    try {
      await api.learningMaterials.delete(material.id);
      message.success('删除成功');
      navigate('/learning-materials');
    } catch (error) {
      message.error('删除失败');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined /> <a onClick={() => navigate('/')}>首页</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <a onClick={() => navigate('/learning-materials')}>学习素材</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>素材详情</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={
          <Space>
            <BookOutlined />
            <span>{material.title}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              编辑
            </Button>
            <Popconfirm title="确定删除此素材？" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Button onClick={onBack}>返回列表</Button>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="ID">{material.id}</Descriptions.Item>
          <Descriptions.Item label="专项类别">
            <Tag color="blue">{CATEGORY_MAP[material.category] || material.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="弱点类型">
            <Tag>{WEAKNESS_TYPE_MAP[material.weakness_type] || material.weakness_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="素材类型">
            <Tag color="green">{MATERIAL_TYPE_MAP[material.material_type] || material.material_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="使用次数">{material.usage_count}</Descriptions.Item>
          <Descriptions.Item label="创建方式">
            <Tag>{material.created_by === 'ai' ? 'AI生成' : '手动创建'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {dayjs(material.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {material.weakness && (
            <Descriptions.Item label="关联弱点" span={2}>
              <a onClick={() => navigate(`/weaknesses/${material.weakness_id}`)}>
                {material.weakness.description?.substring(0, 50)}...
              </a>
            </Descriptions.Item>
          )}
          {material.tags && material.tags.length > 0 && (
            <Descriptions.Item label="标签" span={2}>
              <Space wrap>
                {material.tags.map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />

        <Title level={4}>内容</Title>
        <Card>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
            {material.content}
          </div>
        </Card>
      </Card>

      {/* 编辑对话框 */}
      <Modal
        title="编辑学习素材"
        open={editModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalOpen(false);
          form.resetFields();
        }}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="material_type" label="素材类型" rules={[{ required: true, message: '请选择素材类型' }]}>
            <Select>
              {Object.entries(MATERIAL_TYPE_MAP).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="内容（Markdown格式）" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={15} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车">
              {material.tags?.map((tag) => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
