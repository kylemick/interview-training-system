import { Layout as AntLayout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  CalendarOutlined,
  EditOutlined,
  CommentOutlined,
  LineChartOutlined,
  SettingOutlined,
  FileTextOutlined,
  BankOutlined,
  DatabaseOutlined,
  ToolOutlined,
  WarningOutlined,
  BookOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import AiThinkingDisplay from './AiThinkingDisplay'

const { Header, Sider, Content } = AntLayout

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">仪表盘</Link> },
    { key: '/plan', icon: <CalendarOutlined />, label: <Link to="/plan">訓練計劃</Link> },
    { key: '/practice', icon: <EditOutlined />, label: <Link to="/practice">開始練習</Link> },
    { key: '/feedback', icon: <CommentOutlined />, label: <Link to="/feedback">查看反馈</Link> },
    { key: '/progress', icon: <LineChartOutlined />, label: <Link to="/progress">進度报告</Link> },
    { key: '/weaknesses', icon: <WarningOutlined />, label: <Link to="/weaknesses">弱點管理</Link> },
    { key: '/learning-materials', icon: <BookOutlined />, label: <Link to="/learning-materials">學習素材</Link> },
    { key: '/schools', icon: <BankOutlined />, label: <Link to="/schools">學校檔案</Link> },
    { key: '/questions', icon: <DatabaseOutlined />, label: <Link to="/questions">題庫管理</Link> },
    { key: '/memory', icon: <FileTextOutlined />, label: <Link to="/memory">面試回憶</Link> },
    { key: '/data', icon: <ToolOutlined />, label: <Link to="/data">數據管理</Link> },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">设置</Link> },
  ]

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
          📚 升中面試訓練係統
        </div>
      </Header>
      <AntLayout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <AntLayout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: '8px',
            }}
          >
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
      <AiThinkingDisplay />
    </AntLayout>
  )
}
