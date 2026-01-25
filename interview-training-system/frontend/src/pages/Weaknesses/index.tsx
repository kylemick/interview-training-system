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
  Empty,
  Spin,
  Typography,
  DatePicker,
  Breadcrumb,
  Descriptions,
  Divider,
  Radio,
} from 'antd';
import {
  WarningOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ReloadOutlined,
  CalendarOutlined,
  HomeOutlined,
  EyeOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { api, cancelAllPendingRequests } from '../../utils/api';
import dayjs from 'dayjs';
import { useAiThinking } from '../../hooks/useAiThinking';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 专项类别映射
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-expression': '中文表达',
  'chinese-oral': '中文表达', // 兼容旧数据
  'logic-thinking': '逻辑思维',
  'logical-thinking': '逻辑思维', // 兼容旧数据
  'current-affairs': '时事常识',
  'science-knowledge': '科学常识',
  'personal-growth': '个人成长',
  'group-discussion': '小组讨论',
};

// 弱点类型映射
const WEAKNESS_TYPE_MAP: Record<string, string> = {
  vocabulary: '词汇量不足',
  grammar: '语法错误',
  logic: '逻辑不清晰',
  knowledge_gap: '知识盲区',
  confidence: '信心不足',
  expression: '表达能力弱',
};

// 严重程度映射
const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'blue' },
};

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '活跃', color: 'orange' },
  improved: { label: '已改善', color: 'green' },
  resolved: { label: '已解决', color: 'default' },
};

interface Weakness {
  id: number;
  student_name?: string;
  category: string;
  weakness_type: string;
  description: string;
  example_text?: string;
  severity: string;
  status: string;
  improvement_suggestions?: string;
  related_topics?: string[];
  practice_count: number;
  created_at: string;
  updated_at: string;
  identified_by?: string;
  source_text?: string;
}

interface WeaknessStats {
  total: number;
  by_category: Array<{ category: string; count: number }>;
  by_type: Array<{ weakness_type: string; count: number }>;
  by_severity: Array<{ severity: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
}

// 趋势数据接口（暂时未使用，保留用于后续可视化功能）
// interface WeaknessTrend {
//   period_days: number;
//   total_weaknesses: number;
//   trends: {
//     weekly_new_weaknesses: Array<{ week: string; count: number }>;
//     improvement_by_type: Array<{ weakness_type: string; total: number; improved: number; resolved: number; improvement_rate: string }>;
//     high_severity_trend: Array<{ week: string; count: number }>;
//     practice_effectiveness: Array<{ practice_range: string; total: number; improved: number; improvement_rate: string }>;
//   };
//   insights: {
//     most_common_weakness: string;
//     best_improved_type: string;
//     high_severity_count: number;
//   };
// }

interface School {
  code: string;
  name_zh: string;
}

export default function Weaknesses() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [stats, setStats] = useState<WeaknessStats | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentWeakness, setCurrentWeakness] = useState<Weakness | null>(null);
  const [settings, setSettings] = useState<{ student_name?: string; target_school?: string } | null>(null);
  
  // 筛选条件
  const [filters, setFilters] = useState<{
    category?: string;
    status?: string;
    severity?: string;
    weakness_type?: string;
  }>({});
  
  // 分页
  const [pagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 加载弱点列表
  const loadWeaknesses = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        ...filters,
      };
      const res = await api.weaknesses.list(params);
      if (res.success) {
        const data = res.data || [];
        setWeaknesses(data);
        // 分页信息会在表格组件中自动处理
      }
    } catch (error) {
      console.error('加载弱点列表失败:', error);
      message.error('加载弱点列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const res = await api.weaknesses.stats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // 加载设置信息
  const loadSettings = useCallback(async () => {
    try {
      const res = await api.settings.get();
      if (res.success) {
        setSettings(res.data);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }, []);


  // 加载单个弱点详情
  const loadWeaknessDetail = useCallback(async (weaknessId: string) => {
    try {
      setLoading(true);
      const res = await api.weaknesses.get(weaknessId);
      if (res.success) {
        setCurrentWeakness(res.data);
      } else {
        message.error('获取弱点详情失败');
        navigate('/weaknesses');
      }
    } catch (error) {
      console.error('加载弱点详情失败:', error);
      message.error('加载弱点详情失败');
      navigate('/weaknesses');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) {
      loadWeaknessDetail(id);
    } else {
      loadWeaknesses();
      loadStats();
      loadSettings();
      // 趋势数据和学校列表在需要时再加载（用于后续可视化功能）
    }
    
    return () => {
      cancelAllPendingRequests();
    };
  }, [id, loadWeaknesses, loadStats, loadSettings, loadWeaknessDetail]);

  // 如果有ID，显示详情页面
  if (id) {
    return <WeaknessDetail weakness={currentWeakness} loading={loading} onBack={() => navigate('/weaknesses')} settings={settings} />;
  }

  // 列表页面
  return <WeaknessList 
    weaknesses={weaknesses}
    stats={stats}
    loading={loading}
    filters={filters}
    setFilters={setFilters}
    pagination={pagination}
    selectedRowKeys={selectedRowKeys}
    setSelectedRowKeys={setSelectedRowKeys}
    onRefresh={loadWeaknesses}
  />;
}

// 弱点列表组件
function WeaknessList({
  weaknesses,
  stats,
  loading,
  filters,
  setFilters,
  pagination,
  selectedRowKeys,
  setSelectedRowKeys,
  onRefresh,
}: {
  weaknesses: Weakness[];
  stats: WeaknessStats | null;
  loading: boolean;
  filters: any;
  setFilters: (filters: any) => void;
  pagination: any;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');

  // 表格列定义
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
        <Tag color="blue">{CATEGORY_MAP[category] || category}</Tag>
      ),
    },
    {
      title: '弱点类型',
      dataIndex: 'weakness_type',
      key: 'weakness_type',
      width: 120,
      render: (type: string) => (
        <Tag>{WEAKNESS_TYPE_MAP[type] || type}</Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        const config = SEVERITY_MAP[severity] || { label: severity, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = STATUS_MAP[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '练习次数',
      dataIndex: 'practice_count',
      key: 'practice_count',
      width: 100,
      sorter: (a: Weakness, b: Weakness) => a.practice_count - b.practice_count,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
      sorter: (a: Weakness, b: Weakness) => 
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Weakness) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/weaknesses/${record.id}`)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleUpdateStatus(record)}
          >
            状态
          </Button>
          <Popconfirm
            title="确定删除此弱点记录？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [navigate]);

  // 更新状态
  const handleUpdateStatus = async (weakness: Weakness) => {
    setCurrentWeaknessForStatus(weakness);
    setStatusModalOpen(true);
  };

  const [currentWeaknessForStatus, setCurrentWeaknessForStatus] = useState<Weakness | null>(null);

  const handleStatusConfirm = async (status: string) => {
    if (!currentWeaknessForStatus) return;
    try {
      await api.weaknesses.updateStatus(currentWeaknessForStatus.id.toString(), status);
      message.success('状态更新成功');
      setStatusModalOpen(false);
      onRefresh();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  // 删除弱点
  const handleDelete = async (id: number) => {
    try {
      await api.weaknesses.delete(id.toString());
      message.success('删除成功');
      onRefresh();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择弱点');
      return;
    }
    setBatchStatus('');
    setStatusModalOpen(true);
  };

  const handleBatchStatusConfirm = async () => {
    if (!batchStatus || selectedRowKeys.length === 0) return;
    try {
      let successCount = 0;
      for (const key of selectedRowKeys) {
        try {
          await api.weaknesses.updateStatus(key.toString(), batchStatus);
          successCount++;
        } catch (error) {
          console.error(`更新弱点 ${key} 状态失败:`, error);
        }
      }
      message.success(`成功更新 ${successCount} 个弱点的状态`);
      setStatusModalOpen(false);
      setSelectedRowKeys([]);
      onRefresh();
    } catch (error) {
      message.error('批量更新失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择弱点');
      return;
    }
    Modal.confirm({
      title: `确定删除选中的 ${selectedRowKeys.length} 条弱点记录？`,
      onOk: async () => {
        try {
          let successCount = 0;
          for (const key of selectedRowKeys) {
            try {
              await api.weaknesses.delete(key.toString());
              successCount++;
            } catch (error) {
              console.error(`删除弱点 ${key} 失败:`, error);
            }
          }
          message.success(`成功删除 ${successCount} 条记录`);
          setSelectedRowKeys([]);
          onRefresh();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 筛选预设
  const handleFilterPreset = (preset: string) => {
    switch (preset) {
      case 'high-active':
        setFilters({ severity: 'high', status: 'active' });
        break;
      case 'improved':
        setFilters({ status: 'improved' });
        break;
      case 'resolved':
        setFilters({ status: 'resolved' });
        break;
      case 'all':
        setFilters({});
        break;
    }
  };

  // 表格行选择
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div>
      <Title level={2}>
        <WarningOutlined style={{ marginRight: 8 }} />
        弱点管理
      </Title>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总弱点数"
                value={stats.total}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="活跃弱点"
                value={stats.by_status.find(s => s.status === 'active')?.count || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="高严重度"
                value={stats.by_severity.find(s => s.severity === 'high')?.count || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="已改善"
                value={
                  (stats.by_status.find(s => s.status === 'improved')?.count || 0) +
                  (stats.by_status.find(s => s.status === 'resolved')?.count || 0)
                }
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选和操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>筛选：</span>
          <Select
            placeholder="专项类别"
            allowClear
            style={{ width: 150 }}
            value={filters.category}
            onChange={(value) => setFilters({ ...filters, category: value })}
          >
            {Object.entries(CATEGORY_MAP).map(([key, label]) => (
              <Option key={key} value={key}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <Option value="active">活跃</Option>
            <Option value="improved">已改善</Option>
            <Option value="resolved">已解决</Option>
          </Select>
          <Select
            placeholder="严重程度"
            allowClear
            style={{ width: 120 }}
            value={filters.severity}
            onChange={(value) => setFilters({ ...filters, severity: value })}
          >
            <Option value="high">高</Option>
            <Option value="medium">中</Option>
            <Option value="low">低</Option>
          </Select>
          <Select
            placeholder="弱点类型"
            allowClear
            style={{ width: 150 }}
            value={filters.weakness_type}
            onChange={(value) => setFilters({ ...filters, weakness_type: value })}
          >
            {Object.entries(WEAKNESS_TYPE_MAP).map(([key, label]) => (
              <Option key={key} value={key}>{label}</Option>
            ))}
          </Select>
          <Divider type="vertical" />
          <span>预设：</span>
          <Button size="small" onClick={() => handleFilterPreset('high-active')}>
            高严重度活跃
          </Button>
          <Button size="small" onClick={() => handleFilterPreset('improved')}>
            已改善
          </Button>
          <Button size="small" onClick={() => handleFilterPreset('resolved')}>
            已解决
          </Button>
          <Button size="small" onClick={() => handleFilterPreset('all')}>
            全部
          </Button>
          <Divider type="vertical" />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          {selectedRowKeys.length > 0 && (
            <>
              <Button onClick={handleBatchUpdateStatus}>
                批量更新状态 ({selectedRowKeys.length})
              </Button>
              <Button danger onClick={handleBatchDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </>
          )}
        </Space>
      </Card>

      {/* 弱点列表表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={weaknesses}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 状态更新对话框 */}
      <Modal
        title={currentWeaknessForStatus ? "更新弱点状态" : `批量更新状态 (${selectedRowKeys.length}个)`}
        open={statusModalOpen}
        onOk={() => {
          if (currentWeaknessForStatus) {
            handleStatusConfirm(batchStatus || currentWeaknessForStatus.status);
          } else {
            handleBatchStatusConfirm();
          }
        }}
        onCancel={() => {
          setStatusModalOpen(false);
          setCurrentWeaknessForStatus(null);
          setBatchStatus('');
        }}
      >
        <Radio.Group
          value={batchStatus || currentWeaknessForStatus?.status || 'active'}
          onChange={(e) => setBatchStatus(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="active">活跃</Radio>
            <Radio value="improved">已改善</Radio>
            <Radio value="resolved">已解决</Radio>
          </Space>
        </Radio.Group>
      </Modal>
    </div>
  );
}

// 弱点详情组件
function WeaknessDetail({
  weakness,
  loading,
  onBack,
  settings,
}: {
  weakness: Weakness | null;
  loading: boolean;
  onBack: () => void;
  settings: { student_name?: string; target_school?: string } | null;
}) {
  const navigate = useNavigate();
  const { executeWithThinking } = useAiThinking();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm] = Form.useForm();
  const [schools, setSchools] = useState<School[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialType, setMaterialType] = useState<string>('text');
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        await api.schools.list().then((res) => {
          if (res.success) {
            setSchools(res.data || []);
          }
        });
      } catch (error) {
        console.error('加载学校列表失败:', error);
      }
    };
    loadSchools();

    // 加载关联的学习素材
    const loadMaterials = async () => {
      if (weakness?.id) {
        try {
          const res = await api.learningMaterials.getByWeakness(weakness.id);
          if (res.success) {
            setMaterials(res.data || []);
          }
        } catch (error) {
          console.error('加载学习素材失败:', error);
        }
      }
    };
    loadMaterials();
  }, [weakness?.id]);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />;
  }

  if (!weakness) {
    return <Empty description="弱点不存在" />;
  }

  // 更新状态
  const handleUpdateStatus = async (status: string) => {
    try {
      await api.weaknesses.updateStatus(weakness.id.toString(), status);
      message.success('状态更新成功');
      setStatusModalOpen(false);
      onBack();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  // 删除弱点
  const handleDelete = async () => {
    try {
      await api.weaknesses.delete(weakness.id.toString());
      message.success('删除成功');
      navigate('/weaknesses');
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 生成针对性题目
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const handleGenerateQuestions = async () => {
    if (generatingQuestions) {
      message.warning('正在生成题目，请勿重复点击');
      return;
    }
    try {
      setGeneratingQuestions(true);
      await executeWithThinking(
        'generate-questions',
        async () => {
          return await api.weaknesses.generateQuestions({
            weakness_ids: [weakness.id],
            count: 5,
          });
        },
        {
          taskName: '生成针对性题目',
          onSuccess: () => {
            message.success('题目生成成功');
            navigate('/questions');
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || '题目生成失败');
          },
        }
      );
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // 创建训练计划
  const handleCreatePlan = async (values: any) => {
    try {
      // 检查设置中是否有学生信息
      if (!settings?.student_name) {
        message.warning('请先在设置页面配置学生姓名');
        return;
      }

      const [startDate, endDate] = values.dateRange;
      await executeWithThinking(
        'generate-plan',
        async () => {
          return await api.plans.createFromWeakness({
            weakness_id: weakness.id,
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
            daily_duration: parseInt(values.daily_duration),
            target_school: values.target_school || settings?.target_school || null,
            // 不传递student_name，让后端从设置获取
          });
        },
        {
          taskName: '生成训练计划',
          onSuccess: (res) => {
            message.success('训练计划创建成功');
            setPlanModalOpen(false);
            if (res.data?.plan_id) {
              navigate(`/plan`);
            }
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || error?.message || '训练计划创建失败');
          },
        }
      );
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || '训练计划创建失败');
    }
  };

  // 生成学习素材
  const [generatingMaterial, setGeneratingMaterial] = useState(false);
  const handleGenerateMaterial = async () => {
    if (generatingMaterial) {
      message.warning('正在生成学习素材，请勿重复点击');
      return;
    }
    try {
      setGeneratingMaterial(true);
      await executeWithThinking(
        'generate-learning-material',
        async () => {
          return await api.ai.generateLearningMaterial({
            weakness_id: weakness.id,
            material_type: materialType,
          });
        },
        {
          taskName: '生成学习素材',
          onSuccess: async (res) => {
            message.success('学习素材生成成功');
            setMaterialModalOpen(false);
            
            // 重新加载素材列表
            const materialsRes = await api.learningMaterials.getByWeakness(weakness.id);
            if (materialsRes.success) {
              setMaterials(materialsRes.data || []);
            }
            
            // 跳转到素材详情
            if (res.data?.id) {
              navigate(`/learning-materials/${res.data.id}`);
            }
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || error?.message || '学习素材生成失败');
          },
        }
      );
    } finally {
      setGeneratingMaterial(false);
    }
  };

  const severityConfig = SEVERITY_MAP[weakness.severity] || { label: weakness.severity, color: 'default' };
  const statusConfig = STATUS_MAP[weakness.status] || { label: weakness.status, color: 'default' };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined /> <a onClick={() => navigate('/')}>首页</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <a onClick={() => navigate('/weaknesses')}>弱点管理</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>弱点详情</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={
          <Space>
            <WarningOutlined />
            <span>弱点详情</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setStatusModalOpen(true)}>
              更新状态
            </Button>
            <Popconfirm title="确定删除此弱点记录？" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Button onClick={onBack}>返回列表</Button>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="ID">{weakness.id}</Descriptions.Item>
          <Descriptions.Item label="专项类别">
            <Tag color="blue">{CATEGORY_MAP[weakness.category] || weakness.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="弱点类型">
            <Tag>{WEAKNESS_TYPE_MAP[weakness.weakness_type] || weakness.weakness_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="严重程度">
            <Tag color={severityConfig.color}>{severityConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="练习次数">{weakness.practice_count}</Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {dayjs(weakness.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间" span={2}>
            {dayjs(weakness.updated_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            <Paragraph>{weakness.description}</Paragraph>
          </Descriptions.Item>
          {weakness.example_text && (
            <Descriptions.Item label="示例文本" span={2}>
              <Paragraph style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                {weakness.example_text}
              </Paragraph>
            </Descriptions.Item>
          )}
          {weakness.improvement_suggestions && (
            <Descriptions.Item label="改进建议" span={2}>
              <Paragraph>{weakness.improvement_suggestions}</Paragraph>
            </Descriptions.Item>
          )}
          {weakness.related_topics && weakness.related_topics.length > 0 && (
            <Descriptions.Item label="相关话题" span={2}>
              <Space wrap>
                {weakness.related_topics.map((topic, index) => (
                  <Tag key={index}>{topic}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />

        <Space>
          <Button 
            type="primary" 
            icon={<RobotOutlined />} 
            onClick={handleGenerateQuestions}
            loading={generatingQuestions}
            disabled={generatingQuestions}
          >
            生成针对性题目
          </Button>
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => setPlanModalOpen(true)}>
            创建训练计划
          </Button>
          <Button 
            type="primary" 
            icon={<BookOutlined />} 
            onClick={() => setMaterialModalOpen(true)}
            disabled={generatingMaterial}
          >
            生成学习素材
          </Button>
        </Space>

        {/* 关联的学习素材 */}
        {materials.length > 0 && (
          <>
            <Divider />
            <Title level={5}>关联的学习素材 ({materials.length})</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {materials.map((material) => (
                <Card
                  key={material.id}
                  size="small"
                  hoverable
                  onClick={() => navigate(`/learning-materials/${material.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Space>
                    <BookOutlined />
                    <strong>{material.title}</strong>
                    <Tag>{material.material_type}</Tag>
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      {dayjs(material.created_at).format('YYYY-MM-DD')}
                    </span>
                  </Space>
                </Card>
              ))}
            </Space>
          </>
        )}
      </Card>

      {/* 状态更新对话框 */}
      <Modal
        title="更新弱点状态"
        open={statusModalOpen}
        onOk={() => {
          const status = (weakness as any).newStatus || weakness.status;
          handleUpdateStatus(status);
        }}
        onCancel={() => {
          setStatusModalOpen(false);
          (weakness as any).newStatus = undefined;
        }}
      >
        <Radio.Group
          value={(weakness as any).newStatus || weakness.status}
          onChange={(e) => {
            (weakness as any).newStatus = e.target.value;
          }}
        >
          <Space direction="vertical">
            <Radio value="active">活跃</Radio>
            <Radio value="improved">已改善</Radio>
            <Radio value="resolved">已解决</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      {/* 创建训练计划对话框 */}
      <Modal
        title="基于弱点创建训练计划"
        open={planModalOpen}
        onOk={() => planForm.submit()}
        onCancel={() => setPlanModalOpen(false)}
        width={600}
      >
        <Form form={planForm} onFinish={handleCreatePlan} layout="vertical">
          <Form.Item
            label="训练周期"
            name="dateRange"
            rules={[{ required: true, message: '请选择训练周期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="每日可用时长（分钟）"
            name="daily_duration"
            rules={[{ required: true, message: '请输入每日可用时长' }]}
          >
            <Input type="number" placeholder="例如：30" />
          </Form.Item>
          <Form.Item 
            label="目标学校（可选）" 
            name="target_school"
            tooltip={settings?.target_school ? `当前设置：${settings.target_school}` : undefined}
          >
            <Select 
              placeholder={settings?.target_school ? `当前设置：${settings.target_school}` : "选择目标学校"} 
              allowClear
            >
              {schools.map((school) => (
                <Option key={school.code} value={school.code}>
                  {school.name_zh}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Card type="inner" title="学生信息" size="small" style={{ marginBottom: 16 }}>
            <Paragraph>
              <strong>学生姓名：</strong>{settings?.student_name || '未设置'}
              {!settings?.student_name && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => navigate('/settings')}
                  style={{ padding: 0, marginLeft: 8 }}
                >
                  前往设置
                </Button>
              )}
            </Paragraph>
            {settings?.target_school && (
              <Paragraph>
                <strong>默认目标学校：</strong>{settings.target_school}
              </Paragraph>
            )}
          </Card>
          <Card type="inner" title="弱点信息" size="small">
            <Paragraph>
              <strong>类别：</strong>{CATEGORY_MAP[weakness.category] || weakness.category}
            </Paragraph>
            <Paragraph>
              <strong>类型：</strong>{WEAKNESS_TYPE_MAP[weakness.weakness_type] || weakness.weakness_type}
            </Paragraph>
            <Paragraph>
              <strong>严重程度：</strong>{severityConfig.label}
            </Paragraph>
            {weakness.improvement_suggestions && (
              <Paragraph>
                <strong>改进建议：</strong>{weakness.improvement_suggestions}
              </Paragraph>
            )}
          </Card>
        </Form>
      </Modal>

      {/* 生成学习素材对话框 */}
      <Modal
        title="生成学习素材"
        open={materialModalOpen}
        onOk={handleGenerateMaterial}
        onCancel={() => {
          if (!generatingMaterial) {
            setMaterialModalOpen(false);
          }
        }}
        okText="生成"
        cancelText="取消"
        confirmLoading={generatingMaterial}
        okButtonProps={{ disabled: generatingMaterial }}
        cancelButtonProps={{ disabled: generatingMaterial }}
      >
        <Form layout="vertical">
          <Form.Item label="素材类型" required>
            <Radio.Group value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
              <Space direction="vertical">
                <Radio value="text">知识点讲解</Radio>
                <Radio value="example">常见错误示例</Radio>
                <Radio value="tip">改进技巧</Radio>
                <Radio value="practice">练习建议</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            系统将基于当前弱点的类型、严重程度和相关话题，使用AI生成个性化的学习素材。
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
