import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Tag, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, RobotOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;

interface School {
  id: number;
  code: string;
  name: string;
  name_zh: string;
  focus_areas: string[];
  interview_style: string;
  notes: string;
}

const categoryLabels: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-expression': '中文表达',
  'logical-thinking': '逻辑思维',
  'current-affairs': '时事常识',
  'science-knowledge': '科学常识',
  'personal-growth': '个人成长',
  'group-discussion': '小组讨论',
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [form] = Form.useForm();

  // 加载学校列表
  const loadSchools = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3001/api/schools');
      setSchools(response.data.data);
    } catch (error) {
      message.error('加载学校列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  // 打开编辑/新增弹窗
  const handleEdit = (school?: School) => {
    if (school) {
      setEditingSchool(school);
      form.setFieldsValue(school);
    } else {
      setEditingSchool(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // AI 生成学校档案
  const handleAiGenerate = async () => {
    try {
      const schoolName = form.getFieldValue('name') || form.getFieldValue('name_zh');
      
      if (!schoolName || !schoolName.trim()) {
        message.warning('请先输入学校名称（中文或英文）');
        return;
      }

      setAiGenerating(true);
      message.loading('AI 正在生成学校档案...', 0);

      const response = await axios.post('http://localhost:3001/api/ai/generate-school', {
        schoolName: schoolName.trim(),
      });

      message.destroy();

      if (response.data.success) {
        const profile = response.data.data;
        
        // 自动填充表单
        form.setFieldsValue({
          code: profile.code,
          name: profile.name,
          name_zh: profile.name_zh,
          focus_areas: profile.focus_areas,
          interview_style: profile.interview_style,
          notes: profile.notes,
        });

        message.success('AI 已生成学校档案，请检查并修改');
      }
    } catch (error: any) {
      message.destroy();
      console.error('AI 生成失败:', error);
      
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('AI 生成失败，请检查 DeepSeek API Key 配置');
      }
    } finally {
      setAiGenerating(false);
    }
  };

  // 保存学校
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingSchool) {
        // 更新
        await axios.put(`http://localhost:3001/api/schools/${editingSchool.code}`, values);
        message.success('学校信息已更新');
      } else {
        // 新增
        await axios.post('http://localhost:3001/api/schools', values);
        message.success('学校已添加');
      }
      
      setModalVisible(false);
      loadSchools();
    } catch (error) {
      message.error('保存失败');
      console.error(error);
    }
  };

  // 删除学校
  const handleDelete = (school: School) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 ${school.name_zh} (${school.code}) 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`http://localhost:3001/api/schools/${school.code}`);
          message.success('学校已删除');
          loadSchools();
        } catch (error) {
          message.error('删除失败');
          console.error(error);
        }
      },
    });
  };

  const columns = [
    {
      title: '学校代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: '中文名称',
      dataIndex: 'name_zh',
      key: 'name_zh',
      width: 200,
    },
    {
      title: '英文名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
    },
    {
      title: '面试重点',
      dataIndex: 'focus_areas',
      key: 'focus_areas',
      render: (areas: string[]) => (
        <>
          {areas.map((area) => (
            <Tag key={area} color="blue" style={{ marginBottom: 4 }}>
              {categoryLabels[area] || area}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '面试风格',
      dataIndex: 'interview_style',
      key: 'interview_style',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: School) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>学校档案管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleEdit()}
        >
          添加学校
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={schools}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingSchool ? '编辑学校' : '添加学校'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
            <Button
              type="dashed"
              icon={<RobotOutlined />}
              onClick={handleAiGenerate}
              loading={aiGenerating}
              block
            >
              {aiGenerating ? 'AI 生成中...' : '🤖 AI 自动生成学校档案'}
            </Button>
            <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
              提示：先输入学校中文名或英文名，然后点击上方按钮让 AI 自动填充其他信息
            </div>
          </Space>

          <Form.Item
            label="学校中文名称"
            name="name_zh"
            rules={[{ required: true, message: '请输入中文名称' }]}
          >
            <Input placeholder="例如：圣保罗男女中学" />
          </Form.Item>

          <Form.Item
            label="学校英文名称"
            name="name"
            rules={[{ required: true, message: '请输入英文名称' }]}
          >
            <Input placeholder="例如：St. Paul's Co-educational College" />
          </Form.Item>

          <Form.Item
            label="学校代码"
            name="code"
            rules={[{ required: true, message: '请输入学校代码' }]}
          >
            <Input placeholder="例如：SPCC" disabled={!!editingSchool} />
          </Form.Item>

          <Form.Item
            label="面试重点领域"
            name="focus_areas"
            rules={[{ required: true, message: '请选择面试重点' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择面试重点领域"
              options={Object.entries(categoryLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="面试风格"
            name="interview_style"
            rules={[{ required: true, message: '请输入面试风格' }]}
          >
            <Input placeholder="例如：academic-rigorous" />
          </Form.Item>

          <Form.Item
            label="备注说明"
            name="notes"
          >
            <TextArea
              rows={4}
              placeholder="学校特点、面试特色等"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
