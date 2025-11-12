// FIX 1: Xóa 'React' (không cần thiết từ React 17+)
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
// FIX 2: Xóa 'Space' (không được sử dụng)
import { Table, Button, Pagination, Tag, Spin, message, Card, Row, Col, Statistic, Tooltip } from 'antd';
import { 
    SyncOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    ClockCircleOutlined, 
    WarningOutlined, 
    FileSearchOutlined 
} from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { formatDate } from '../../utils/dateFormat';
import type { Job } from '../../types';

// --- CÁC HÀM HELPERS ---
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

// --- CÁC INTERFACES ---
interface JobSummary {
    total: number;
    completed: number;
    processing: number;
    failed: number;
}

export interface JobListHandle {
  reload: () => void;
}

// --- COMPONENT CHÍNH ---
// FIX 3: Đổi 'props' thành '_' (vì không dùng)
export const JobListAntd = forwardRef<JobListHandle>((_, ref) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); 
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<JobSummary | null>(null); 
  const pageSize = 10;

  const loadSummary = async () => {
      setSummary({ total: totalItems || 0, completed: 0, processing: 0, failed: 0 }); 
  }

  const loadJobs = async (page: number = 1) => {
    setLoading(true);
    if (page !== currentPage) {
        setCurrentPage(page);
    }

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

  useImperativeHandle(ref, () => ({
    reload: () => {
      loadJobs(1);
    }
  }));

  useEffect(() => {
    loadJobs(currentPage);
  }, [currentPage]);

  useEffect(() => {
    loadSummary();
  }, [totalItems]);

  const handlePageChange = (page: number) => {
    loadJobs(page); 
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

  // --- RENDER ---
  return (
    <div className="bg-gray-50 p-6"> 
      
      <div className="max-w-7xl mx-auto">
        
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
        
        {/* Bảng Danh sách Jobs */}
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
                    // FIX 4: Đổi 'record' thành '_' (vì không dùng)
                    onRow={(_) => ({
                        className: 'cursor-pointer hover:bg-gray-50 transition-colors',
                    })}
                />
            </Spin>

            {/* Phân trang tùy chỉnh của Ant Design */}
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

    </div>
  );
});