import React, { useState, useEffect, useRef } from 'react';
import { Layout, message } from 'antd';
import { JobListAntd, type JobListHandle } from './JobList';
import { VideoUploadPageAntd } from '../upload/VideoUploadModal';
import { SearchPageAntd } from '../search/SearchModal';
import { JobDetailAntd } from './JobDetail';
import { SidebarAntd } from '../layout/SidebarAntd';
import { CameraManagementPage } from '../cameras/CameraManagementPage';
import { ViolenceDetectionPage } from '../violence/ViolenceDetectionPage';
import { ViolenceListPage } from '../violence/ViolenceListPage';

const { Content } = Layout;

// [CẬP NHẬT] Thêm 'violence-detection' và 'violence-list' vào định nghĩa view
type ViewType = 'list' | 'detail' | 'upload' | 'search' | 'cameras' | 'violence-detection' | 'violence-list';

export const JobDashboard: React.FC = () => {
  // State quản lý view hiện tại
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const jobListRef = useRef<JobListHandle>(null);

  // Effect xử lý routing bằng hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (hash === '#/upload') {
        setCurrentView('upload');
        setCurrentJobId(null);
      } else if (hash === '#/search') {
        setCurrentView('search');
        setCurrentJobId(null);
      } else if (hash === '#/cameras') { 
        setCurrentView('cameras');
        setCurrentJobId(null);
      
      // [THÊM MỚI] Route cho trang Detection
      } else if (hash === '#/violence-detection') {
        setCurrentView('violence-detection');
        setCurrentJobId(null);
      
      // [THÊM MỚI] Route cho trang List
      } else if (hash === '#/violence-list') {
        setCurrentView('violence-list');
        setCurrentJobId(null);

      } else if (hash.startsWith('#/job/')) {
        setCurrentView('detail');
        setCurrentJobId(hash.substring(6)); // Lấy ID sau #/job/
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
  }, []);

  // Xử lý khi Upload thành công - Về danh sách
  const handleUploadSuccess = () => {
    message.success('Upload video thành công! Đang quay về danh sách jobs...');
    window.location.hash = '#/';
  
    setTimeout(() => {
      jobListRef.current?.reload();
    }, 100);
  };

  // Xử lý khi Search thành công - Chuyển đến trang detail hoặc danh sách
  const handleSearchSuccess = (jobId?: string) => {
    if (jobId) {
      // Có jobId -> chuyển đến trang detail của job vừa tạo
      message.success('Tìm kiếm đã được khởi tạo! Đang chuyển đến trang kết quả...');
      window.location.hash = `#/job/${jobId}`;
    } else {
      // Không có jobId -> về danh sách
      message.success('Tìm kiếm đã được khởi tạo! Đang quay về danh sách...');
      window.location.hash = '#/';
      
      setTimeout(() => {
        jobListRef.current?.reload();
      }, 100);
    }
  };

  // Hàm quyết định render component nào
  const renderContent = () => {
    switch (currentView) {
      case 'upload':
        return <VideoUploadPageAntd onSuccess={handleUploadSuccess} />;
      
      case 'search':
        return <SearchPageAntd onSuccess={handleSearchSuccess} />;
      
      case 'cameras':
        return <CameraManagementPage />;

      // [THÊM MỚI] Render trang Violence Detection
      case 'violence-detection':
        return <ViolenceDetectionPage />;

      // [THÊM MỚI] Render trang Violence List
      case 'violence-list':
        return <ViolenceListPage />;
        
      case 'detail':
        if (!currentJobId) {
          message.error('Không tìm thấy Job ID');
          window.location.hash = '#/';
          return null;
        }
        return (
          <JobDetailAntd 
            jobId={currentJobId} 
            onBack={() => {
              window.location.hash = '#/';
            }} 
          />
        );
      
      case 'list':
      default:
        return <JobListAntd ref={jobListRef} />;
    }
  };

  // --- RENDER ---
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <SidebarAntd />

      {/* Layout phụ bọc Content */}
      <Layout className="site-layout" style={{ marginLeft: 260, transition: 'all 0.2s' }}>
        <Content style={{ backgroundColor: '#f0f2f5', minHeight: '100vh' }}> 
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};