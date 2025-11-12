// File: src/pages/JobDashboard.tsx (Đã CẬP NHẬT routing)

import React, { useState, useEffect, useRef } from 'react';
import { Layout, message } from 'antd';
import { JobListAntd, type JobListHandle } from './JobList';
import { VideoUploadPageAntd } from '../upload/VideoUploadModal';
import { SearchPageAntd } from '../search/SearchModal';
import { JobDetailAntd } from './JobDetail';
import { SidebarAntd } from '../layout/SidebarAntd';


const { Content } = Layout;

// Định nghĩa các view mà chúng ta có
type ViewType = 'list' | 'detail' | 'upload' | 'search';

export const JobDashboard: React.FC = () => {
  // State quản lý view hiện tại
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const jobListRef = useRef<JobListHandle>(null);

  // Effect xử lý routing bằng hash (NÂNG CẤP)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (hash === '#/upload') {
        setCurrentView('upload');
        setCurrentJobId(null);
      } else if (hash === '#/search') {
        setCurrentView('search');
        setCurrentJobId(null);
      } else if (hash.startsWith('#/job/')) {
        setCurrentView('detail');
        setCurrentJobId(hash.substring(6)); // Lấy ID
      } else {
        setCurrentView('list');
        setCurrentJobId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Kiểm tra hash ngay khi load trang

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []); // Chỉ chạy 1 lần

  const handlePageSuccess = () => {
    message.success('Thao tác thành công! Đang quay về danh sách jobs...');
    // Chuyển hash về trang chủ, `handleHashChange` ở trên sẽ tự động bắt
    window.location.hash = '#/';
  
    setTimeout(() => {
        jobListRef.current?.reload();
    }, 100);
  };

  // Hàm quyết định render component nào (NÂNG CẤP)
  const renderContent = () => {
    switch (currentView) {
      case 'upload':
        return <VideoUploadPageAntd onSuccess={handlePageSuccess} />;
      case 'search':
        return <SearchPageAntd onSuccess={handlePageSuccess} />;
      case 'detail':
        return <JobDetailAntd jobId={currentJobId!} onBack={() => (window.location.hash = '#/')} />;
      case 'list':
      default:
    
        return <JobListAntd ref={jobListRef} />;
    }
  };

  // --- RENDER ---
  return (
    <Layout style={{ minHeight: '100vh' }}>
      
  
      <SidebarAntd />

      {/* 2. Layout phụ bọc Content */}
      <Layout className="site-layout">
        <Content style={{ backgroundColor: '#f0f2f5' }}> 
          {renderContent()}
        </Content>
      </Layout>

      {/* 3. BỎ: Các Modals */}
    </Layout>
  );
};