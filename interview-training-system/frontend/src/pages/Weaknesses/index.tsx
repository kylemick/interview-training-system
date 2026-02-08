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

// 專項類別映射
const CATEGORY_MAP: Record<string, string> = {
  'english-oral': '英文口語',
  'chinese-expression': '中文表達',
  'chinese-oral': '中文表達', // 兼容舊數據
  'logic-thinking': '邏輯思維',
  'logical-thinking': '邏輯思維', // 兼容舊數據
  'current-affairs': '時事常識',
  'science-knowledge': '科學常識',
  'personal-growth': '个人成長',
  'group-discussion': '小組討論',
};

// 弱點類型映射
const WEAKNESS_TYPE_MAP: Record<string, string> = {
  vocabulary: '詞汇量不足',
  grammar: '語法错误',
  logic: '邏輯不清晰',
  knowledge_gap: '知識盲区',
  confidence: '信心不足',
  expression: '表達能力弱',
};

// 嚴重程度映射
const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'blue' },
};

// 狀態映射
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

// 趋勢數據接口（暫時未使用，保留用于後续可视化功能）
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
  
  // 筛選条件
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

  // 加载弱點列表
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
        // 分页信息會在表格組件中自動处理
      } else {
        console.warn('获取弱點列表失敗:', res);
        setWeaknesses([]);
        message.warning('获取弱點列表失敗，請稍後重試');
      }
    } catch (error: any) {
      console.error('加载弱點列表失敗:', error);
      setWeaknesses([]);
      const errorMsg = error?.response?.data?.message || error?.message || '加载弱點列表失敗';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 加载統計數據
  const loadStats = useCallback(async () => {
    try {
      const res = await api.weaknesses.stats();
      if (res.success) {
        setStats(res.data);
      } else {
        console.warn('获取統計數據失敗:', res);
        // 設置默認值，確保頁面可以顯示
        setStats({ total: 0, by_category: [], by_type: [], by_severity: [], by_status: [] });
      }
    } catch (error) {
      console.error('加载統計數據失敗:', error);
      // 設置默認值，確保頁面可以顯示
      setStats({ total: 0, by_category: [], by_type: [], by_severity: [], by_status: [] });
    }
  }, []);

  // 加载设置信息
  const loadSettings = useCallback(async () => {
    try {
      const res = await api.settings.get();
      if (res.success) {
        setSettings(res.data);
      } else {
        console.warn('获取设置失敗:', res);
        // 設置默認值，確保頁面可以顯示
        setSettings({});
      }
    } catch (error) {
      console.error('加载设置失敗:', error);
      // 設置默認值，確保頁面可以顯示
      setSettings({});
    }
  }, []);


  // 加载单个弱點详情
  const loadWeaknessDetail = useCallback(async (weaknessId: string) => {
    try {
      setLoading(true);
      const res = await api.weaknesses.get(weaknessId);
      if (res.success) {
        setCurrentWeakness(res.data);
      } else {
        const errorMsg = res?.message || '获取弱點详情失敗';
        message.error(errorMsg);
        setCurrentWeakness(null);
        // 延遲導航，讓用戶看到錯誤提示
        setTimeout(() => {
          navigate('/weaknesses');
        }, 2000);
      }
    } catch (error: any) {
      console.error('加载弱點详情失敗:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '加载弱點详情失敗';
      message.error(errorMsg);
      setCurrentWeakness(null);
      // 延遲導航，讓用戶看到錯誤提示
      setTimeout(() => {
        navigate('/weaknesses');
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) {
      loadWeaknessDetail(id);
    } else {
      // 並行加載數據，即使部分失敗也不影響頁面顯示
      Promise.allSettled([
        loadWeaknesses(),
        loadStats(),
        loadSettings(),
      ]).catch((error) => {
        console.error('加載數據時發生錯誤:', error);
      });
      // 趋勢數據和學校列表在需要時再加载（用于後续可视化功能）
    }
    
    return () => {
      cancelAllPendingRequests();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filters]);

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

// 弱點列表組件
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
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color="blue">{CATEGORY_MAP[category] || category}</Tag>
      ),
    },
    {
      title: '弱點類型',
      dataIndex: 'weakness_type',
      key: 'weakness_type',
      width: 120,
      render: (type: string) => (
        <Tag>{WEAKNESS_TYPE_MAP[type] || type}</Tag>
      ),
    },
    {
      title: '嚴重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        const config = SEVERITY_MAP[severity] || { label: severity, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '狀態',
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
      title: '練習次數',
      dataIndex: 'practice_count',
      key: 'practice_count',
      width: 100,
      sorter: (a: Weakness, b: Weakness) => a.practice_count - b.practice_count,
    },
    {
      title: '創建時間',
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
            狀態
          </Button>
          <Popconfirm
            title="確定删除此弱點記錄？"
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

  const [currentWeaknessForStatus, setCurrentWeaknessForStatus] = useState<Weakness | null>(null);

  // 更新狀態
  const handleUpdateStatus = async (weakness: Weakness) => {
    setCurrentWeaknessForStatus(weakness);
    setStatusModalOpen(true);
  };

  const handleStatusConfirm = async (status: string) => {
    if (!currentWeaknessForStatus) return;
    try {
      const res = await api.weaknesses.updateStatus(currentWeaknessForStatus.id.toString(), status);
      if (res.success !== false) {
        message.success('狀態更新成功');
        setStatusModalOpen(false);
        setCurrentWeaknessForStatus(null);
        onRefresh();
      } else {
        message.error(res.message || '狀態更新失敗');
      }
    } catch (error: any) {
      console.error('狀態更新失敗:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '狀態更新失敗';
      message.error(errorMsg);
    }
  };

  // 删除弱點
  const handleDelete = async (id: number) => {
    try {
      const res = await api.weaknesses.delete(id.toString());
      if (res.success !== false) {
        message.success('删除成功');
        onRefresh();
      } else {
        message.error(res.message || '删除失敗');
      }
    } catch (error: any) {
      console.error('删除失敗:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '删除失敗';
      message.error(errorMsg);
    }
  };

  // 批量更新狀態
  const handleBatchUpdateStatus = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先選擇弱點');
      return;
    }
    setBatchStatus('');
    setStatusModalOpen(true);
  };

  const handleBatchStatusConfirm = async () => {
    if (!batchStatus || selectedRowKeys.length === 0) return;
    try {
      let successCount = 0;
      let failCount = 0;
      for (const key of selectedRowKeys) {
        try {
          const res = await api.weaknesses.updateStatus(key.toString(), batchStatus);
          if (res.success !== false) {
            successCount++;
          } else {
            failCount++;
            console.warn(`更新弱點 ${key} 狀態失敗:`, res);
          }
        } catch (error) {
          failCount++;
          console.error(`更新弱點 ${key} 狀態失敗:`, error);
        }
      }
      if (successCount > 0) {
        message.success(`成功更新 ${successCount} 个弱點的狀態${failCount > 0 ? `，${failCount} 个失敗` : ''}`);
      } else {
        message.error('批量更新失敗，請稍後重試');
      }
      setStatusModalOpen(false);
      setBatchStatus('');
      setSelectedRowKeys([]);
      onRefresh();
    } catch (error: any) {
      console.error('批量更新失敗:', error);
      message.error(error?.message || '批量更新失敗');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先選擇弱點');
      return;
    }
    Modal.confirm({
      title: `確定删除選中的 ${selectedRowKeys.length} 条弱點記錄？`,
      onOk: async () => {
        try {
          let successCount = 0;
          let failCount = 0;
          for (const key of selectedRowKeys) {
            try {
              const res = await api.weaknesses.delete(key.toString());
              if (res.success !== false) {
                successCount++;
              } else {
                failCount++;
                console.warn(`删除弱點 ${key} 失敗:`, res);
              }
            } catch (error) {
              failCount++;
              console.error(`删除弱點 ${key} 失敗:`, error);
            }
          }
          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 条記錄${failCount > 0 ? `，${failCount} 条失敗` : ''}`);
          } else {
            message.error('批量删除失敗，請稍後重試');
          }
          setSelectedRowKeys([]);
          onRefresh();
        } catch (error: any) {
          console.error('批量删除失敗:', error);
          message.error(error?.message || '批量删除失敗');
        }
      },
    });
  };

  // 筛選预设
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

  // 表格行選擇
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div>
      <Title level={2}>
        <WarningOutlined style={{ marginRight: 8 }} />
        弱點管理
      </Title>

      {/* 統計卡片 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="總弱點數"
                value={stats.total}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="活跃弱點"
                value={stats.by_status.find(s => s.status === 'active')?.count || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="高嚴重度"
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

      {/* 筛選和操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>筛選：</span>
          <Select
            placeholder="專項類別"
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
            placeholder="狀態"
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
            placeholder="嚴重程度"
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
            placeholder="弱點類型"
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
            高嚴重度活跃
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
                批量更新狀態 ({selectedRowKeys.length})
              </Button>
              <Button danger onClick={handleBatchDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </>
          )}
        </Space>
      </Card>

      {/* 弱點列表表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={weaknesses}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            total: weaknesses.length,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: loading ? '加載中...' : '暫無弱點記錄',
          }}
        />
      </Card>

      {/* 狀態更新對話框 */}
      <Modal
        title={currentWeaknessForStatus ? "更新弱點狀態" : `批量更新狀態 (${selectedRowKeys.length}个)`}
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

// 弱點详情組件
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

  // 所有 hooks 必須在條件返回之前調用
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingMaterial, setGeneratingMaterial] = useState(false);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await api.schools.list();
        if (res.success) {
          setSchools(res.data || []);
        } else {
          console.warn('获取學校列表失敗:', res);
          setSchools([]);
        }
      } catch (error) {
        console.error('加载學校列表失敗:', error);
        setSchools([]);
      }
    };
    loadSchools();

    // 加载關聯的學習素材
    const loadMaterials = async () => {
      if (weakness?.id) {
        try {
          const res = await api.learningMaterials.getByWeakness(weakness.id);
          if (res.success) {
            setMaterials(res.data || []);
          } else {
            console.warn('获取學習素材失敗:', res);
            setMaterials([]);
          }
        } catch (error) {
          console.error('加载學習素材失敗:', error);
          setMaterials([]);
        }
      } else {
        setMaterials([]);
      }
    };
    loadMaterials();
  }, [weakness?.id]);

  // 所有 hooks（包括 useCallback）必須在條件返回之前
  // 更新狀態
  const handleUpdateStatus = useCallback(async (status: string) => {
    if (!weakness) return;
    try {
      const res = await api.weaknesses.updateStatus(weakness.id.toString(), status);
      if (res.success !== false) {
        message.success('狀態更新成功');
        setStatusModalOpen(false);
        onBack();
      } else {
        message.error(res.message || '狀態更新失敗');
      }
    } catch (error: any) {
      console.error('狀態更新失敗:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '狀態更新失敗';
      message.error(errorMsg);
    }
  }, [weakness, onBack]);

  // 删除弱點
  const handleDelete = useCallback(async () => {
    if (!weakness) return;
    try {
      const res = await api.weaknesses.delete(weakness.id.toString());
      if (res.success !== false) {
        message.success('删除成功');
        navigate('/weaknesses');
      } else {
        message.error(res.message || '删除失敗');
      }
    } catch (error: any) {
      console.error('删除失敗:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '删除失敗';
      message.error(errorMsg);
    }
  }, [weakness, navigate]);

  // 生成針對性題目
  const handleGenerateQuestions = useCallback(async () => {
    if (!weakness) return;
    if (generatingQuestions) {
      message.warning('正在生成題目，请勿重复點击');
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
          taskName: '生成針對性題目',
          onSuccess: () => {
            message.success('題目生成成功');
            navigate('/questions');
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || '題目生成失敗');
          },
        }
      );
    } finally {
      setGeneratingQuestions(false);
    }
  }, [weakness, generatingQuestions, executeWithThinking, navigate]);

  // 創建訓練計劃
  const handleCreatePlan = useCallback(async (values: any) => {
    if (!weakness) return;
    try {
      // 检查设置中是否有學生信息
      if (!settings?.student_name) {
        message.warning('请先在设置页面配置學生姓名');
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
            // 不傳递student_name，让後端從设置获取
          });
        },
        {
          taskName: '生成訓練計劃',
          onSuccess: (res) => {
            message.success('訓練計劃創建成功');
            setPlanModalOpen(false);
            if (res.data?.plan_id) {
              navigate(`/plan`);
            }
          },
          onError: (error: any) => {
            message.error(error?.response?.data?.message || error?.message || '訓練計劃創建失敗');
          },
        }
      );
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || '訓練計劃創建失敗');
    }
  }, [weakness, settings, executeWithThinking, navigate]);

  // 生成學習素材
  const handleGenerateMaterial = useCallback(async () => {
    if (!weakness) return;
    if (generatingMaterial) {
      message.warning('正在生成學習素材，请勿重复點击');
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
          taskName: '生成學習素材',
          onSuccess: async (res) => {
            message.success('學習素材生成成功');
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
            message.error(error?.response?.data?.message || error?.message || '學習素材生成失敗');
          },
        }
      );
    } finally {
      setGeneratingMaterial(false);
    }
  }, [weakness, generatingMaterial, materialType, executeWithThinking, navigate, setMaterials]);

  // 條件返回必須在所有 hooks 之後
  if (loading) {
    return <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />;
  }

  if (!weakness) {
    return (
      <div>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <HomeOutlined /> <a onClick={() => navigate('/')}>首頁</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/weaknesses')}>弱點管理</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>弱點詳情</Breadcrumb.Item>
        </Breadcrumb>
        <Card>
          <Empty 
            description="弱點不存在或已刪除" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={onBack}>
              返回列表
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const severityConfig = SEVERITY_MAP[weakness.severity] || { label: weakness.severity, color: 'default' };
  const statusConfig = STATUS_MAP[weakness.status] || { label: weakness.status, color: 'default' };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined /> <a onClick={() => navigate('/')}>首页</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <a onClick={() => navigate('/weaknesses')}>弱點管理</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>弱點详情</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={
          <Space>
            <WarningOutlined />
            <span>弱點详情</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setStatusModalOpen(true)}>
              更新狀態
            </Button>
            <Popconfirm title="確定删除此弱點記錄？" onConfirm={handleDelete}>
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
          <Descriptions.Item label="專項類別">
            <Tag color="blue">{CATEGORY_MAP[weakness.category] || weakness.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="弱點類型">
            <Tag>{WEAKNESS_TYPE_MAP[weakness.weakness_type] || weakness.weakness_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="嚴重程度">
            <Tag color={severityConfig.color}>{severityConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="狀態">
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="練習次數">{weakness.practice_count}</Descriptions.Item>
          <Descriptions.Item label="創建時間" span={2}>
            {dayjs(weakness.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="更新時間" span={2}>
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
            <Descriptions.Item label="改進建議" span={2}>
              <Paragraph>{weakness.improvement_suggestions}</Paragraph>
            </Descriptions.Item>
          )}
          {weakness.related_topics && weakness.related_topics.length > 0 && (
            <Descriptions.Item label="相關話題" span={2}>
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
            生成針對性題目
          </Button>
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => setPlanModalOpen(true)}>
            創建訓練計劃
          </Button>
          <Button 
            type="primary" 
            icon={<BookOutlined />} 
            onClick={() => setMaterialModalOpen(true)}
            disabled={generatingMaterial}
          >
            生成學習素材
          </Button>
        </Space>

        {/* 關聯的學習素材 */}
        {materials.length > 0 && (
          <>
            <Divider />
            <Title level={5}>關聯的學習素材 ({materials.length})</Title>
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

      {/* 狀態更新對話框 */}
      <Modal
        title="更新弱點狀態"
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

      {/* 創建訓練計劃對話框 */}
      <Modal
        title="基于弱點創建訓練計劃"
        open={planModalOpen}
        onOk={() => planForm.submit()}
        onCancel={() => setPlanModalOpen(false)}
        width={600}
      >
        <Form form={planForm} onFinish={handleCreatePlan} layout="vertical">
          <Form.Item
            label="訓練周期"
            name="dateRange"
            rules={[{ required: true, message: '请選擇訓練周期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="每日可用時長（分鐘）"
            name="daily_duration"
            rules={[{ required: true, message: '请输入每日可用時長' }]}
          >
            <Input type="number" placeholder="例如：30" />
          </Form.Item>
          <Form.Item 
            label="目標學校（可選）" 
            name="target_school"
            tooltip={settings?.target_school ? `当前设置：${settings.target_school}` : undefined}
          >
            <Select 
              placeholder={settings?.target_school ? `当前设置：${settings.target_school}` : "選擇目標學校"} 
              allowClear
            >
              {schools.map((school) => (
                <Option key={school.code} value={school.code}>
                  {school.name_zh}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Card type="inner" title="學生信息" size="small" style={{ marginBottom: 16 }}>
            <Paragraph>
              <strong>學生姓名：</strong>{settings?.student_name || '未设置'}
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
                <strong>默认目標學校：</strong>{settings.target_school}
              </Paragraph>
            )}
          </Card>
          <Card type="inner" title="弱點信息" size="small">
            <Paragraph>
              <strong>類別：</strong>{CATEGORY_MAP[weakness.category] || weakness.category}
            </Paragraph>
            <Paragraph>
              <strong>類型：</strong>{WEAKNESS_TYPE_MAP[weakness.weakness_type] || weakness.weakness_type}
            </Paragraph>
            <Paragraph>
              <strong>嚴重程度：</strong>{severityConfig.label}
            </Paragraph>
            {weakness.improvement_suggestions && (
              <Paragraph>
                <strong>改進建議：</strong>{weakness.improvement_suggestions}
              </Paragraph>
            )}
          </Card>
        </Form>
      </Modal>

      {/* 生成學習素材對話框 */}
      <Modal
        title="生成學習素材"
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
          <Form.Item label="素材類型" required>
            <Radio.Group value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
              <Space direction="vertical">
                <Radio value="text">知識點讲解</Radio>
                <Radio value="example">常见错误示例</Radio>
                <Radio value="tip">改進技巧</Radio>
                <Radio value="practice">練習建議</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            係統将基于当前弱點的類型、嚴重程度和相關話題，使用AI生成个性化的學習素材。
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
