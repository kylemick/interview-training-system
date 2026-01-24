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
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const API_BASE = 'http://localhost:3001/api';

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
}

const TrainingPlan = () => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/plans`);
      setPlans(response.data.data);
    } catch (error) {
      message.error('获取训练计划列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const [startDate, endDate] = values.dateRange;

      const response = await axios.post(`${API_BASE}/plans`, {
        student_name: values.student_name,
        target_school: values.target_school,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        daily_duration: values.daily_duration,
      });

      message.success(response.data.message);
      setModalOpen(false);
      form.resetFields();
      fetchPlans();
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '创建训练计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/plans/${plan.id}`);
      setDailyTasks(response.data.data.tasks);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('获取计划详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`${API_BASE}/plans/${id}/status`, { status });
      message.success('状态已更新');
      fetchPlans();
    } catch (error) {
      message.error('更新状态失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/plans/${id}`);
      message.success('训练计划已删除');
      fetchPlans();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      active: { label: '进行中', color: 'green' },
      completed: { label: '已完成', color: 'blue' },
      paused: { label: '已暂停', color: 'orange' },
    };
    const config = statusMap[status] || { label: status, color: 'default' };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      'english-oral': '英文口语',
      'chinese-oral': '中文表达',
      'logic-thinking': '逻辑思维',
      'current-affairs': '时事常识',
      'science-knowledge': '科学常识',
      'personal-growth': '个人成长',
      'group-discussion': '小组讨论',
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
      title: '学生姓名',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 120,
    },
    {
      title: '目标学校',
      dataIndex: 'target_school',
      key: 'target_school',
      width: 100,
      render: (school: string) => <Tag color="blue">{school}</Tag>,
    },
    {
      title: '训练周期',
      key: 'period',
      width: 200,
      render: (_: any, record: TrainingPlan) => (
        <span>
          {record.start_date} ~ {record.end_date} ({record.total_days}天)
        </span>
      ),
    },
    {
      title: '每日时长',
      dataIndex: 'daily_duration',
      key: 'daily_duration',
      width: 100,
      render: (duration: number) => `${duration} 分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
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
              暂停
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
          <Popconfirm title="确定删除此计划？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const taskColumns = [
    {
      title: '日期',
      dataIndex: 'task_date',
      key: 'task_date',
      width: 120,
    },
    {
      title: '专项',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => getCategoryLabel(category),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${duration} 分钟`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const map: Record<string, { label: string; color: string }> = {
          pending: { label: '待完成', color: 'default' },
          in_progress: { label: '进行中', color: 'blue' },
          completed: { label: '已完成', color: 'green' },
        };
        const config = map[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-CN') : '-'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>训练计划</h1>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          创建训练计划
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={loading}
        pagination={{
          showTotal: (total) => `共 ${total} 个计划`,
        }}
      />

      {/* 创建训练计划弹窗 */}
      <Modal
        title="🎯 创建训练计划"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText="AI 生成计划"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="student_name" label="学生姓名" rules={[{ required: true, message: '请输入学生姓名' }]}>
            <Input placeholder="输入学生姓名" />
          </Form.Item>

          <Form.Item name="target_school" label="目标学校" rules={[{ required: true, message: '请选择目标学校' }]}>
            <Select placeholder="选择目标学校">
              <Option value="SPCC">圣保罗男女中学 (SPCC)</Option>
              <Option value="QC">皇仁书院 (QC)</Option>
              <Option value="LSC">喇沙书院 (LSC)</Option>
              <Option value="DBS">拔萃男书院 (DBS)</Option>
              <Option value="DGS">拔萃女书院 (DGS)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="训练周期" rules={[{ required: true, message: '请选择训练周期' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="daily_duration" label="每日训练时长（分钟）" initialValue={30}>
            <Select>
              <Option value={15}>15 分钟</Option>
              <Option value={30}>30 分钟</Option>
              <Option value={45}>45 分钟</Option>
              <Option value={60}>60 分钟</Option>
            </Select>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <p style={{ marginBottom: 0, color: '#666' }}>
            💡 AI 将根据目标学校特点和训练周期，自动生成个性化的训练计划和每日任务安排。
          </p>
        </div>
      </Modal>

      {/* 计划详情弹窗 */}
      <Modal
        title={`📋 训练计划详情 - ${selectedPlan?.student_name}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedPlan && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="目标学校" value={selectedPlan.target_school} />
                </Col>
                <Col span={6}>
                  <Statistic title="总天数" value={selectedPlan.total_days} suffix="天" />
                </Col>
                <Col span={6}>
                  <Statistic title="每日时长" value={selectedPlan.daily_duration} suffix="分钟" />
                </Col>
                <Col span={6}>
                  <div>
                    <div style={{ color: '#666', fontSize: 14 }}>状态</div>
                    <div style={{ marginTop: 8 }}>{getStatusTag(selectedPlan.status)}</div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 类别分配 */}
            <Card title="专项类别分配" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {Object.entries(selectedPlan.category_allocation).map(([category, percentage]) => (
                  <Col span={12} key={category}>
                    <div style={{ marginBottom: 8 }}>{getCategoryLabel(category)}</div>
                    <Progress percent={percentage} />
                  </Col>
                ))}
              </Row>
            </Card>

            {/* AI 建议 */}
            {selectedPlan.ai_suggestions && (
              <Card title="AI 建议" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedPlan.ai_suggestions}</p>
              </Card>
            )}

            {/* 每日任务 */}
            <Card title={`每日任务清单（${dailyTasks.length} 天）`}>
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
