import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Tag,
  Space,
  message,
  Progress,
  Statistic,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlayCircleFilled,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Alert } from 'antd';
import { useAiThinking } from '../../hooks/useAiThinking';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface TrainingPlan {
  id: number;
  student_name: string;
  target_school: string;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_duration: number;
  category_allocation: Record<string, number>;
  ai_suggestions: string;
  status: string;
  created_at: string;
}

interface DailyTask {
  id: number;
  task_date: string;
  category: string;
  duration: number;
  status: string;
  completed_at?: string;
  session_info?: {
    session_id: number;
    qa_records_count: number;
  };
}

interface Settings {
  student_name?: string;
  target_school?: string;
  daily_duration?: number;
}

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { executeWithThinking } = useAiThinking();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [schools, setSchools] = useState<Array<{ code: string; name_zh: string }>>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlans();
    loadSettings();
    loadSchools();
  }, []);

  // 加载學校列表
  const loadSchools = async () => {
    try {
      setLoadingSchools(true);
      const response = await api.schools.list();
      if (response.success && response.data) {
        setSchools(response.data);
      }
    } catch (error) {
      console.error('加载學校列表失敗:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  // 加载设置信息
  const loadSettings = async () => {
    try {
      const response = await api.settings.get();
      const settingsData = response.data;
      setSettings(settingsData);
    } catch (error) {
      console.error('加载设置失敗:', error);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.plans.list();
      setPlans(response.success ? response.data : []);
    } catch (error) {
      message.error('获取訓練計劃列表失敗');
    } finally {
      setLoading(false);
    }
  };

  // 打開創建弹窗時,自動填充设置中的學生信息
  const handleOpenCreateModal = () => {
    // 自動填充學生信息(如果有)
    form.setFieldsValue({
      student_name: settings?.student_name || '',
      target_school: settings?.target_school || '',
      daily_duration: settings?.daily_duration || 30,
    });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      
      // 验证必填字段
      if (!values.dateRange || !Array.isArray(values.dateRange) || values.dateRange.length !== 2) {
        message.error('请選擇訓練周期');
        return;
      }

      const [startDate, endDate] = values.dateRange;
      
      // 验证目標學校
      const targetSchool = values.target_school || settings?.target_school;
      if (!targetSchool) {
        message.error('请選擇目標學校');
        return;
      }

      // 验证學生姓名（必须從设置获取）
      if (!settings?.student_name) {
        message.error('请先在设置页面配置學生姓名');
        return;
      }

      setLoading(true);

      // 使用思考展示
      await executeWithThinking(
        'generate-plan',
        async () => {
          return await api.plans.create({
            // 不傳递student_name，让後端從设置获取
            target_school: targetSchool,
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
            daily_duration: values.daily_duration || settings?.daily_duration || 30,
          });
        },
        {
          taskName: '生成訓練計劃',
          onSuccess: (response) => {
            message.success(response.message || '訓練計劃創建成功');
            setModalOpen(false);
            form.resetFields();
            fetchPlans();
          },
          onError: (error: any) => {
            console.error('創建訓練計劃失敗:', error);
            const errorMessage = error.response?.data?.error?.message 
              || error.response?.data?.message 
              || error.message 
              || '創建訓練計劃失敗';
            message.error(errorMessage);
          },
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setLoading(true);
    try {
      const response = await api.plans.get(String(plan.id));
      setDailyTasks(response.success ? response.data.tasks : []);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('获取計劃详情失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.plans.updateStatus(String(id), status);
      message.success('狀態已更新');
      fetchPlans();
      // 如果详情弹窗打開,刷新任務列表
      if (detailModalOpen && selectedPlan) {
        handleViewDetails(selectedPlan);
      }
    } catch (error) {
      message.error('更新狀態失敗');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.plans.delete(String(id));
      message.success('訓練計劃已删除');
      fetchPlans();
      if (detailModalOpen) {
        setDetailModalOpen(false);
      }
    } catch (error) {
      message.error('删除失敗');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      active: { label: '進行中', color: 'green' },
      completed: { label: '已完成', color: 'blue' },
      paused: { label: '已暫停', color: 'orange' },
    };
    const config = statusMap[status] || { label: status, color: 'default' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      'english-oral': '英文口語',
      'chinese-oral': '中文表達',
      'logic-thinking': '邏輯思維',
      'current-affairs': '時事常識',
      'science-knowledge': '科學常識',
      'personal-growth': '个人成長',
      'group-discussion': '小組討論',
    };
    return map[category] || category;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '學生姓名',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 120,
    },
    {
      title: '目標學校',
      dataIndex: 'target_school',
      key: 'target_school',
      width: 100,
      render: (school: string) => <Tag color="blue">{school}</Tag>,
    },
    {
      title: '訓練周期',
      key: 'period',
      width: 200,
      render: (_: any, record: TrainingPlan) => (
        <span>
          {record.start_date} ~ {record.end_date} ({record.total_days}天)
        </span>
      ),
    },
    {
      title: '每日時長',
      dataIndex: 'daily_duration',
      key: 'daily_duration',
      width: 100,
      render: (duration: number) => `${duration} 分鐘`,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: TrainingPlan) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>
            详情
          </Button>
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handleUpdateStatus(record.id, 'paused')}
            >
              暫停
            </Button>
          )}
          {record.status === 'paused' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleUpdateStatus(record.id, 'active')}
            >
              继续
            </Button>
          )}
          {record.status !== 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleUpdateStatus(record.id, 'completed')}
            >
              完成
            </Button>
          )}
          <Popconfirm title="確定删除此計劃？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 開始任務練習
  const handleStartTask = (taskId: number) => {
    navigate(`/practice?taskId=${taskId}`);
  };

  // 跳過任務
  const handleSkipTask = async (taskId: number) => {
    Modal.confirm({
      title: '確认跳過任務',
      content: `確认跳過此任務?将不計入練習記錄。`,
      okText: '確认跳過',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.plans.skipTask(String(taskId));
          message.success('任務已跳過');
          fetchPlans(); // 重新加载數據
        } catch (error: any) {
          message.error(error.response?.data?.message || '跳過任務失敗');
        }
      },
    });
  };

  const taskColumns = [
    {
      title: '日期',
      dataIndex: 'task_date',
      key: 'task_date',
      width: 120,
    },
    {
      title: '專項',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => getCategoryLabel(category),
    },
    {
      title: '時長',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${duration} 分鐘`,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const map: Record<string, { label: string; color: string }> = {
          pending: { label: '待完成', color: 'default' },
          in_progress: { label: '進行中', color: 'processing' },
          completed: { label: '已完成', color: 'success' },
        };
        const config = map[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '完成時間',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: DailyTask) => {
        if (record.status === 'completed') {
          const sessionId = (record as any).session_info?.session_id;
          return (
            <Space size="small">
              <Tag icon={<CheckCircleOutlined />} color="success">
                已完成
              </Tag>
              {sessionId ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/feedback?session=${sessionId}`)}
                >
                  查看提交記錄
                </Button>
              ) : (
                <Button
                  type="default"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={async () => {
                    // 如果没有 session_info，尝試查找會話
                    try {
                      const sessionsRes = await api.sessions.recent(100);
                      if (sessionsRes.success) {
                        const taskSession = sessionsRes.data.find((s: any) => s.task_id === record.id);
                        if (taskSession) {
                          navigate(`/feedback?session=${taskSession.id}`);
                        } else {
                          message.warning('未找到该任務的練習記錄');
                        }
                      }
                    } catch (error) {
                      message.error('查找練習記錄失敗');
                    }
                  }}
                >
                  查找記錄
                </Button>
              )}
            </Space>
          );
        }
        if (record.status === 'in_progress') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleFilled />}
              onClick={() => handleStartTask(record.id)}
            >
              继续練習
            </Button>
          );
        }
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartTask(record.id)}
            >
              開始
            </Button>
            <Button
              type="default"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleSkipTask(record.id)}
            >
              跳過
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>訓練計劃</h1>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          創建訓練計劃
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={loading}
        pagination={{
          showTotal: (total) => `共 ${total} 个計劃`,
        }}
      />

      {/* 創建訓練計劃弹窗 */}
      <Modal
        title="🎯 創建訓練計劃"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText="AI 生成計劃"
        cancelText="取消"
        confirmLoading={loading}
      >
        {(!settings?.student_name || !settings?.target_school) && (
          <Alert
            message="请先配置學生信息"
            description="在創建訓練計劃前,请先在「设置」页面配置學生姓名和目標學校。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => navigate('/settings')}>
                前往设置
              </Button>
            }
          />
        )}
        
        <Form form={form} layout="vertical">
          <Form.Item 
            label="學生姓名"
            tooltip={settings?.student_name ? '此信息來自设置页面，如需修改请前往设置页面' : '请先在设置页面配置學生姓名'}
          >
            <Input 
              value={settings?.student_name || '未设置'} 
              disabled
              suffix={
                !settings?.student_name && (
                  <Button type="link" size="small" onClick={() => navigate('/settings')}>
                    前往设置
                  </Button>
                )
              }
            />
          </Form.Item>

          <Form.Item 
            name="target_school" 
            label="目標學校" 
            rules={[{ required: true, message: '请選擇目標學校' }]}
            tooltip={settings?.target_school ? '已自動填充设置中的目標學校，可以修改' : undefined}
          >
            <Select 
              placeholder={settings?.target_school ? `当前: ${settings.target_school}` : "選擇目標學校"}
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

          <Form.Item name="dateRange" label="訓練周期" rules={[{ required: true, message: '请選擇訓練周期' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="daily_duration" label="每日訓練時長（分鐘）" initialValue={30}>
            <Select>
              <Option value={15}>15 分鐘</Option>
              <Option value={30}>30 分鐘</Option>
              <Option value={45}>45 分鐘</Option>
              <Option value={60}>60 分鐘</Option>
            </Select>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <p style={{ marginBottom: 0, color: '#666' }}>
            💡 AI 将根據目標學校特點和訓練周期，自動生成个性化的訓練計劃和每日任務安排。
          </p>
        </div>
      </Modal>

      {/* 計劃详情弹窗 */}
      <Modal
        title={`📋 訓練計劃详情 - ${selectedPlan?.student_name}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            關闭
          </Button>,
        ]}
      >
        {selectedPlan && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="目標學校" value={selectedPlan.target_school} />
                </Col>
                <Col span={6}>
                  <Statistic title="總天數" value={selectedPlan.total_days} suffix="天" />
                </Col>
                <Col span={6}>
                  <Statistic title="每日時長" value={selectedPlan.daily_duration} suffix="分鐘" />
                </Col>
                <Col span={6}>
                  <div>
                    <div style={{ color: '#666', fontSize: 14 }}>狀態</div>
                    <div style={{ marginTop: 8 }}>{getStatusTag(selectedPlan.status)}</div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 類別分配 */}
            <Card title="專項類別分配" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {Object.entries(selectedPlan.category_allocation).map(([category, percentage]) => (
                  <Col span={12} key={category}>
                    <div style={{ marginBottom: 8 }}>{getCategoryLabel(category)}</div>
                    <Progress percent={percentage} />
                  </Col>
                ))}
              </Row>
            </Card>

            {/* AI 建議 */}
            {selectedPlan.ai_suggestions && (
              <Card title="AI 建議" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedPlan.ai_suggestions}</p>
              </Card>
            )}

            {/* 每日任務 */}
            <Card title={`每日任務清单（${dailyTasks.length} 天）`}>
              <Table
                columns={taskColumns}
                dataSource={dailyTasks}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ y: 400 }}
              />
            </Card>
          </>
        )}
      </Modal>
    </div>
  );
};

export default TrainingPlan;
