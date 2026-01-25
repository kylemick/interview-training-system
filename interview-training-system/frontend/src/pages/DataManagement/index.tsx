import { useState, useEffect } from 'react';
import { Card, Button, Statistic, Row, Col, Space, message, Modal } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../utils/api';

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
      setLoading(true);
      const response = await api.data.stats();
      console.log('統計信息响应:', response);
      if (response.success && response.data) {
        // 確保數據格式正確
        const statsData: DataStats = {
          schools: Number(response.data.schools) || 0,
          questions: Number(response.data.questions) || 0,
          plans: Number(response.data.plans) || 0,
          sessions: Number(response.data.sessions) || 0,
          seedSchools: Number(response.data.seedSchools) || 0,
          questionsBySource: Array.isArray(response.data.questionsBySource) 
            ? response.data.questionsBySource.map((item: any) => ({
                source: String(item.source || 'unknown'),
                count: Number(item.count) || 0,
              }))
            : [],
        };
        setStats(statsData);
      } else {
        console.error('获取統計信息失敗: 响应格式不正確', response);
        message.error(`获取統計信息失敗: ${response.message || '响应格式不正確'}`);
      }
    } catch (error: any) {
      console.error('获取統計信息失敗:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '获取統計信息失敗';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedSchools = () => {
    Modal.confirm({
      title: '導入學校種子數據',
      icon: <ExclamationCircleOutlined />,
      content: '将導入 5 所香港顶尖中學的檔案數據（SPCC、QC、LSC、DBS、DGS）。已存在的數據将被跳過。',
      okText: '確认導入',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await api.data.seedSchools();
          message.success(response.message || '學校種子數據導入成功');
          await fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.error?.message || '導入失敗');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSeedQuestions = () => {
    Modal.confirm({
      title: '導入題庫種子數據',
      icon: <ExclamationCircleOutlined />,
      content: '将導入 21 道示例題目，覆盖七大專項類別，每類 3 道（简单、中等、困難）。已存在的種子數據将被跳過。',
      okText: '確认導入',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await api.data.seedQuestions();
          message.success(response.message || '題目種子數據導入成功');
          await fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.error?.message || '導入失敗');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSeedAll = () => {
    Modal.confirm({
      title: '導入所有種子數據',
      icon: <ExclamationCircleOutlined />,
      content: '将一次性導入學校檔案和題庫的所有種子數據。已存在的數據将被跳過。',
      okText: '確认導入',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await api.data.seedAll();
          message.success(response.message || '所有種子數據導入成功');
          await fetchStats();
        } catch (error: any) {
          message.error(error.response?.data?.error?.message || '導入失敗');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>數據管理</h1>

      {/* 數據統計 */}
      <Card title="數據庫統計" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="學校檔案" value={stats?.schools || 0} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="題庫題目" value={stats?.questions || 0} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="訓練計劃" value={stats?.plans || 0} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="練習會話" value={stats?.sessions || 0} prefix={<DatabaseOutlined />} />
          </Col>
        </Row>

        {stats?.questionsBySource && stats.questionsBySource.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4>題目來源分布：</h4>
            <Space>
              {stats.questionsBySource.map((item) => (
                <Statistic
                  key={item.source}
                  title={
                    item.source === 'seed'
                      ? '種子數據'
                      : item.source === 'ai_generated'
                      ? 'AI生成'
                      : item.source === 'manual'
                      ? '手動添加'
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

      {/* 種子數據導入 */}
      <Card title="種子數據導入" style={{ marginBottom: 24 }}>
        <p style={{ marginBottom: 16, color: '#666' }}>
          種子數據包含预置的學校檔案和題庫示例，用于快速開始使用係統。
        </p>

        <Space size="large">
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleSeedSchools}
            loading={loading}
          >
            導入學校數據
          </Button>

          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleSeedQuestions}
            loading={loading}
          >
            導入題庫數據
          </Button>

          <Button icon={<CloudUploadOutlined />} onClick={handleSeedAll} loading={loading}>
            導入所有數據
          </Button>

          <Button icon={<ReloadOutlined />} onClick={fetchStats}>
            刷新統計
          </Button>
        </Space>

        <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <h4 style={{ marginBottom: 8 }}>💡 說明：</h4>
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>學校數據：包含 5 所香港顶尖中學（SPCC、QC、LSC、DBS、DGS）</li>
            <li>題庫數據：包含 21 道示例題目，覆盖七大專項類別</li>
            <li>已存在的數據不會被重复導入</li>
            <li>導入後可在"學校檔案"和"題庫管理"页面查看</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default DataManagement;
