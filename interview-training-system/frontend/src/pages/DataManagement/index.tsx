import { useState, useEffect } from 'react';
import { Card, Button, Statistic, Row, Col, Space, message, Modal } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

interface DataStats {
  schools: number;
  questions: number;
  plans: number;
  sessions: number;
  seedSchools: number;
  questionsBySource: { source: string; count: number }[];
}

const DataManagement = () => {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  const handleSeedSchools = () => {
    Modal.confirm({
      title: '导入学校种子数据',
      icon: <ExclamationCircleOutlined />,
      content: '将导入 5 所香港顶尖中学的档案数据（SPCC、QC、LSC、DBS、DGS）。已存在的数据将被跳过。',
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await axios.post(`${API_BASE}/data/seed-schools`);
          message.success(response.data.message);
          await fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.error?.message || '导入失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSeedQuestions = () => {
    Modal.confirm({
      title: '导入题库种子数据',
      icon: <ExclamationCircleOutlined />,
      content: '将导入 21 道示例题目，覆盖七大专项类别，每类 3 道（简单、中等、困难）。已存在的种子数据将被跳过。',
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await axios.post(`${API_BASE}/data/seed-questions`);
          message.success(response.data.message);
          await fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.error?.message || '导入失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSeedAll = () => {
    Modal.confirm({
      title: '导入所有种子数据',
      icon: <ExclamationCircleOutlined />,
      content: '将一次性导入学校档案和题库的所有种子数据。已存在的数据将被跳过。',
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await axios.post(`${API_BASE}/data/seed-all`);
          message.success(response.data.message);
          await fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.error?.message || '导入失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>数据管理</h1>

      {/* 数据统计 */}
      <Card title="数据库统计" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="学校档案" value={stats?.schools || 0} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="题库题目" value={stats?.questions || 0} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="训练计划" value={stats?.plans || 0} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="练习会话" value={stats?.sessions || 0} prefix={<DatabaseOutlined />} />
          </Col>
        </Row>

        {stats?.questionsBySource && stats.questionsBySource.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4>题目来源分布：</h4>
            <Space>
              {stats.questionsBySource.map((item) => (
                <Statistic
                  key={item.source}
                  title={
                    item.source === 'seed'
                      ? '种子数据'
                      : item.source === 'ai_generated'
                      ? 'AI生成'
                      : item.source === 'manual'
                      ? '手动添加'
                      : item.source
                  }
                  value={item.count}
                  valueStyle={{ fontSize: 18 }}
                />
              ))}
            </Space>
          </div>
        )}
      </Card>

      {/* 种子数据导入 */}
      <Card title="种子数据导入" style={{ marginBottom: 24 }}>
        <p style={{ marginBottom: 16, color: '#666' }}>
          种子数据包含预置的学校档案和题库示例，用于快速开始使用系统。
        </p>

        <Space size="large">
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleSeedSchools}
            loading={loading}
          >
            导入学校数据
          </Button>

          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleSeedQuestions}
            loading={loading}
          >
            导入题库数据
          </Button>

          <Button icon={<CloudUploadOutlined />} onClick={handleSeedAll} loading={loading}>
            导入所有数据
          </Button>

          <Button icon={<ReloadOutlined />} onClick={fetchStats}>
            刷新统计
          </Button>
        </Space>

        <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <h4 style={{ marginBottom: 8 }}>💡 说明：</h4>
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>学校数据：包含 5 所香港顶尖中学（SPCC、QC、LSC、DBS、DGS）</li>
            <li>题库数据：包含 21 道示例题目，覆盖七大专项类别</li>
            <li>已存在的数据不会被重复导入</li>
            <li>导入后可在"学校档案"和"题库管理"页面查看</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default DataManagement;
