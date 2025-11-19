import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Table, Tag, Space, Button, Input, message, Tooltip, InputNumber, Modal, Alert } from 'antd';
import { SearchOutlined, CheckCircleOutlined, SyncOutlined, VideoCameraOutlined, PlayCircleOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// Import Service & Types
import { violenceApiService, VIOLENCE_BASE_URL } from '../../services/violenceApi.service';
import type { ViolenceIncident } from '../../types/violence';

const { Title } = Typography;

export const ViolenceListPage: React.FC = () => {
  const [data, setData] = useState<ViolenceIncident[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State cho bộ lọc
  const [searchCameraId, setSearchCameraId] = useState('');
  const [searchLimit, setSearchLimit] = useState<number>(100);

  // State cho Modal Video Player
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentVideoName, setCurrentVideoName] = useState('');
  const [videoError, setVideoError] = useState(false);

  const fetchIncidents = useCallback(async (camId?: string, limitVal: number = 100) => {
    setLoading(true);
    try {
      const incidents = await violenceApiService.getIncidents(camId || undefined, limitVal);
      setData(incidents || []);
    } catch (error: any) {
      message.error('Lỗi tải danh sách sự cố: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents('', 100);
  }, [fetchIncidents]);

  const handleReview = async (id: number) => {
    try {
      await violenceApiService.reviewIncident(id);
      message.success(`Đã xác nhận sự cố #${id}`);
      setData(prevData => prevData.map(item => 
        item.id === id ? { ...item, is_reviewed: true } : item
      ));
    } catch (error: any) {
      message.error('Lỗi xác nhận: ' + error.message);
      fetchIncidents(searchCameraId, searchLimit);
    }
  };

  const handleSearch = () => {
    fetchIncidents(searchCameraId, searchLimit);
  };

  const handleClear = () => {
    setSearchCameraId('');
    setSearchLimit(100);
    fetchIncidents('', 100);
  };

  // Helper tạo link video
  const getVideoUrl = (relativePath: string) => {
    if (!relativePath) return '';
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return `${VIOLENCE_BASE_URL}/${cleanPath}`;
  };

  // --- HÀM MỞ MODAL VIDEO ---
  const handlePlayVideo = (videoPath: string) => {
    if (!videoPath) return;
    const fullUrl = getVideoUrl(videoPath);
    const fileName = videoPath.split('/').pop() || 'Video';
    
    console.log("Attempting to play video:", fullUrl);

    setVideoError(false);
    setCurrentVideoUrl(fullUrl);
    setCurrentVideoName(fileName);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setCurrentVideoUrl('');
    setVideoError(false);
  };

  const columns: ColumnsType<ViolenceIncident> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
      render: (id) => <span style={{ fontWeight: 'bold' }}>#{id}</span>,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Camera ID',
      dataIndex: 'camera_id',
      key: 'camera_id',
      width: 150,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Thời gian phát hiện',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (time) => {
        if (!time) return '-';
        return new Date(time).toLocaleString('vi-VN', { hour12: false });
      },
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend', 
    },
    {
      title: 'Video Bằng chứng',
      dataIndex: 'video_path',
      key: 'video_path',
      render: (path) => {
        if (!path) return <span style={{ color: '#ccc' }}>Không có file</span>;
        const fileName = path.split('/').pop();

        return (
          <Tooltip title="Bấm để xem ngay">
            <div 
              onClick={() => handlePlayVideo(path)}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6, 
                fontWeight: 500, 
                cursor: 'pointer',
                color: '#1890ff' 
              }}
            >
              <VideoCameraOutlined style={{ fontSize: 16 }} />
              <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline' }}>
                {fileName}
              </span>
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_reviewed',
      key: 'is_reviewed',
      width: 140,
      align: 'center',
      render: (reviewed) => (
        <Tag color={reviewed ? 'green' : 'volcano'} style={{ minWidth: 80, textAlign: 'center' }}>
          {reviewed ? 'Đã xử lý' : 'Chưa xem'}
        </Tag>
      ),
      filters: [
        { text: 'Đã xử lý', value: true },
        { text: 'Chưa xem', value: false },
      ],
      onFilter: (value, record) => record.is_reviewed === value,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.video_path && (
            <Tooltip title="Xem Video">
              <Button 
                size="small" 
                icon={<PlayCircleOutlined />} 
                onClick={() => handlePlayVideo(record.video_path)}
              />
            </Tooltip>
          )}
          
          {!record.is_reviewed && (
            <Tooltip title="Đánh dấu đã xem">
              <Button 
                  type="primary" 
                  size="small" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleReview(record.id)}
              >
                  Xác nhận
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0, color: '#cf1322' }}>
           Lịch sử Cảnh báo Bạo lực
        </Title>
        <Space>
            <Button 
              icon={<SyncOutlined />} 
              loading={loading} 
              onClick={handleSearch}
            >
                Làm mới
            </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', background: '#fafafa', padding: 16, borderRadius: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Camera ID:</span>
                <Input 
                    placeholder="VD: test" 
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
                    style={{ width: 220 }} 
                    allowClear
                    value={searchCameraId}
                    onChange={(e) => setSearchCameraId(e.target.value)}
                    onPressEnter={handleSearch}
                />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>Số lượng hiển thị:</span>
              <InputNumber
                min={1}
                max={1000}
                value={searchLimit}
                onChange={(val) => setSearchLimit(val || 100)}
                style={{ width: 120 }}
                placeholder="Limit"
              />
            </div>

            <div style={{ marginTop: 22 }}>
                <Button type="primary" onClick={handleSearch} loading={loading} icon={<SearchOutlined />}>
                    Tìm kiếm
                </Button>
                {(searchCameraId || searchLimit !== 100) && (
                    <Button onClick={handleClear} style={{ marginLeft: 8 }}>
                        Mặc định
                    </Button>
                )}
            </div>
        </div>

        <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="id"
            loading={loading}
            pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `Tổng cộng ${total} sự cố`
            }} 
            scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={`Xem lại: ${currentVideoName}`}
        open={isVideoModalOpen}
        onCancel={handleCloseVideoModal}
        footer={[
          <Button 
            key="open-new" 
            icon={<ExportOutlined />} 
            onClick={() => window.open(currentVideoUrl, '_blank')}
          >
            Mở Tab Mới (Tải về)
          </Button>,
          <Button key="close" type="primary" onClick={handleCloseVideoModal}>
            Đóng
          </Button>
        ]}
        width={800}
        destroyOnClose
        centered
      >
        {currentVideoUrl && (
          <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', position: 'relative', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {/* CẬP NHẬT QUAN TRỌNG:
                - Dùng src trực tiếp trong thẻ video.
                - Thêm muted để hỗ trợ autoplay tốt hơn.
                - Bỏ crossOrigin nếu server chưa config CORS chuẩn để tránh lỗi block ngay lập tức.
             */}
             <video 
              key={currentVideoUrl} 
              controls 
              autoPlay
              muted 
              style={{ width: '100%', maxHeight: '60vh', display: videoError ? 'none' : 'block' }}
              src={currentVideoUrl}
              onError={(e) => {
                console.error("Video load error event:", e);
                setVideoError(true);
              }}
            >
              Trình duyệt của bạn không hỗ trợ thẻ video.
            </video>

            {videoError && (
              <div style={{ padding: 20, textAlign: 'center', width: '100%' }}>
                 <Alert
                    message="Không thể phát video"
                    description="Server chưa mở quyền truy cập file (404) hoặc file không tồn tại."
                    type="error"
                    showIcon
                 />
                 <div style={{ marginTop: 16 }}>
                    <p style={{ color: '#ccc', fontSize: '12px' }}>URL: {currentVideoUrl}</p>
                    <Button type="primary" ghost onClick={() => window.open(currentVideoUrl, '_blank')}>
                      Kiểm tra Link Gốc
                    </Button>
                 </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};