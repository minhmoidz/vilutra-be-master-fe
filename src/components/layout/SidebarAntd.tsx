// File: src/components/layout/SidebarAntd.tsx (Phiên bản HIỆN ĐẠI)

import { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  SearchOutlined,
  DashboardOutlined,
  VideoCameraAddOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export const SidebarAntd: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const getSelectedKey = () => {
    const hash = window.location.hash;
    if (hash === '#/upload') return 'upload';
    if (hash === '#/search') return 'search';
    if (hash.startsWith('#/job/')) return 'dashboard';
    return 'dashboard';
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      width={260}
      theme="light"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        borderRight: '1px solid #e8e8e8',
        boxShadow: '4px 0 12px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      
      {/* Logo Section - Redesigned */}
      <div
        style={{
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid #f0f0f0',
          background: 'white',
          transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
        }}
      >
        <a 
          href="#/" 
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            textDecoration: 'none',
            gap: '12px'
          }}
        >
          {/* Icon với gradient background */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✨
          </div>
          
          {/* Text logo */}
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                Vilutra
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '11px', 
                color: '#8c8c8c',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}>
                VIDEO SEARCH
              </p>
            </div>
          )}
        </a>
      </div>

      {/* Menu Section */}
      <div style={{ 
        padding: '16px 12px',
        flex: 1,
        overflowY: 'auto'
      }}>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          style={{ 
            border: 'none',
            background: 'transparent',
          }}
          onClick={({ key }) => {
            // Xử lý navigation trực tiếp
            if (key === 'dashboard') window.location.hash = '#/';
            if (key === 'upload') window.location.hash = '#/upload';
            if (key === 'search') window.location.hash = '#/search';
          }}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
              label: (
                <span style={{ 
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  Danh sách Jobs
                </span>
              ),
              style: {
                height: '44px',
                borderRadius: '8px',
                margin: '4px 0',
                cursor: 'pointer',
              }
            },
            {
              key: 'upload',
              icon: <VideoCameraAddOutlined style={{ fontSize: '18px' }} />,
              label: (
                <span style={{ 
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  Upload Video
                </span>
              ),
              style: {
                height: '44px',
                borderRadius: '8px',
                margin: '4px 0',
                cursor: 'pointer',
              }
            },
          ]}
        />
      </div>

      {/* Search Button - Premium Design */}
      <div
        style={{
          padding: collapsed ? '16px 8px' : '16px 16px 20px 16px',
          borderTop: '1px solid #f0f0f0',
          background: 'white',
        }}
      >
        <Button
          type="primary"
          href="#/search"
          icon={<SearchOutlined style={{ fontSize: '16px' }} />}
          block
          size="large"
          style={{
            height: collapsed ? '48px' : '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            fontWeight: 600,
            fontSize: collapsed ? '0' : '15px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
          }}
        >
          {!collapsed && 'Tìm kiếm Nâng cao'}
        </Button>
      </div>
      
    </Sider>
  );
};