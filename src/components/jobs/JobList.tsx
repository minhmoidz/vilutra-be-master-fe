// File: src/components/jobs/JobListAntd.tsx (Đã hoàn thiện UI Header & Căn giữa)

import React, { useState, useEffect } from 'react';
import { Search, Upload } from 'lucide-react'; 
import { Table, Button, Pagination, Space, Tag, Spin, message, Card, Row, Col, Statistic, Tooltip } from 'antd';
import { SearchOutlined, UploadOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, WarningOutlined, FileSearchOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { formatDate } from '../../utils/dateFormat';
import type { Job } from '../../types';
import { SearchModalAntd } from '../search/SearchModal';
import { VideoUploadModalAntd } from '../upload/VideoUploadModal';


// Hàm helper để lấy màu Tag của Ant Design từ status
const getAntdStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'PROCESSING': return 'blue';
    case 'FAILED': return 'error';
    case 'QUEUED': return 'default';
    default: return 'default';
  }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'COMPLETED': return <CheckCircleOutlined />;
        case 'PROCESSING': return <SyncOutlined spin />;
        case 'FAILED': return <CloseCircleOutlined />;
        case 'QUEUED': return <ClockCircleOutlined />;
        default: return <WarningOutlined />;
    }
};

interface JobSummary {
    total: number;
    completed: number;
    processing: number;
    failed: number;
}


export const JobListAntd: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); 
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<JobSummary | null>(null); 
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const pageSize = 10;

  const loadSummary = async () => {
      // Dùng tạm totalItems cho summary
      setSummary({ total: totalItems || 0, completed: 0, processing: 0, failed: 0 }); 
  }

  const loadJobs = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const backendPage = page - 1; 
      const data = await apiService.getAllJobs(backendPage, pageSize);
      setJobs(data.content.map(job => ({ ...job, key: job.jobId }))); 
      setTotalItems(data.totalElements);
    } catch (error: any) {
      message.error('Lỗi khi tải danh sách jobs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(currentPage);
  }, [currentPage]);

  useEffect(() => {
    loadSummary();
  }, [totalItems]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const columns = [
    {
      title: 'Job ID',
      dataIndex: 'jobId',
      key: 'jobId',
      render: (text: string) => <Tooltip title={text}>{text.substring(0, 8) + '...'}</Tooltip>,
      width: '15%',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type: string) => (
          <Tag color={type === 'SEARCH' ? 'geekblue' : 'purple'} className='font-medium'>
              {type}
          </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status: string) => (
        <Tag 
            color={getAntdStatusColor(status)} 
            icon={getStatusIcon(status)} 
            className="font-semibold text-sm"
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => formatDate(text),
      width: '25%',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (record: Job) => (
        <Button 
          type="link" 
          onClick={() => window.location.hash = `#/job/${record.jobId}`}
          className='font-medium'
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER ĐÃ SỬA ĐỔI: Sử dụng relative/absolute để căn giữa tuyệt đối */}
        <header className="mb-10 relative">
          
          {/* Tiêu đề H1 được căn giữa tuyệt đối */}
          <div className="absolute inset-x-0 top-0 flex justify-center items-center h-full">
            <h1 
              className="
                text-4xl md:text-5xl font-extrabold 
                bg-clip-text text-transparent 
                bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 
                animate-fadeIn slow-bounce
              "
            >
              ✨ Vilutra Job Management
            </h1>
          </div>

          {/* Nút bấm (actions) được căn chỉnh ở bên phải */}
          <div className="flex justify-end relative z-10 py-2"> 
            <Space size="middle">
              <Button
                type="primary"
                icon={<UploadOutlined />}
                size="large"
                onClick={() => setUploadModalOpen(true)}
              >
                Upload Video
              </Button>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                size="large"
                onClick={() => setSearchModalOpen(true)}
                className='bg-green-600 hover:!bg-green-700'
              >
                Tìm kiếm
              </Button>
            </Space>
          </div>
        </header>
        
        {/* Thẻ Thống kê Tổng quan */}
        {summary && (
            <Row gutter={16} className="mb-6">
                <Col span={6}>
                    <Card bordered={false} className="shadow-md">
                        <Statistic
                            title="Tổng số Jobs"
                            value={totalItems}
                            suffix={<FileSearchOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="shadow-md">
                        <Statistic
                            title="Hoàn thành"
                            value={summary.completed}
                            valueStyle={{ color: '#3f8600' }}
                            suffix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="shadow-md">
                        <Statistic
                            title="Đang xử lý"
                            value={summary.processing}
                            valueStyle={{ color: '#faad14' }}
                            suffix={<SyncOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="shadow-md">
                        <Statistic
                            title="Thất bại"
                            value={summary.failed}
                            valueStyle={{ color: '#cf1322' }}
                            suffix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>
        )}
        
        {/* Ant Design Table */}
        <Card 
            title="📋 Danh sách Jobs Gần đây" 
            className="shadow-lg"
            extra={
                <Button 
                    icon={<SyncOutlined />} 
                    onClick={() => loadJobs(currentPage)}
                    loading={loading}
                >
                    Tải lại
                </Button>
            }
        >
            <Spin spinning={loading}>
                <Table
                    columns={columns}
                    dataSource={jobs}
                    rowKey="jobId"
                    pagination={false} 
                    locale={{ emptyText: 'Không có job nào' }}
                    onRow={(record) => ({
                        className: 'cursor-pointer hover:bg-gray-50 transition-colors',
                    })}
                />
            </Spin>

            {/* Ant Design Pagination */}
            {totalItems > pageSize && (
                <div className="mt-4 flex justify-end">
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={totalItems}
                        onChange={handlePageChange}
                        showSizeChanger={false}
                        hideOnSinglePage
                        className='p-2'
                    />
                </div>
            )}
        </Card>
      </div>

      <SearchModalAntd
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSuccess={loadJobs}
      />

      <VideoUploadModalAntd
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={loadJobs}
      />
    </div>
  );
};