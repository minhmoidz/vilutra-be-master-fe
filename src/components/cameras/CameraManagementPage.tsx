import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Popconfirm, 
  message, 
  Tag, 
  Tooltip, 
  Card, 
  Typography, 
  Segmented 
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  VideoCameraAddOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// Services & Types
import { apiService } from '../../services/api.service';
import type { Camera } from '../../types';

// Components
import { AddCameraModal } from '../upload/AddCameraModal';
import { CameraEditModal } from './CameraEditModal';
import { CameraUploadModal } from './CameraUploadModal';
import { useStreamManager, StreamActionButton } from '../../components/stream/StreamControls';

const { Title, Text } = Typography;

export const CameraManagementPage: React.FC = () => {
  // --- State Management ---
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  // --- Hook Stream Manager ---
  const { 
    activeStreams,      
    registerStream,     
    unregisterStream    
  } = useStreamManager();

  // --- Data Fetching ---
  const fetchCameras = useCallback(async () => {
    setLoading(true);
    try {
      let isActive: boolean | undefined = undefined;
      if (filterStatus === 'active') isActive = true;
      if (filterStatus === 'inactive') isActive = false;
      
      const data = await apiService.getCameras(isActive);
      setCameras(data);
    } catch (error: any) {
      message.error(`Lỗi tải danh sách camera: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // --- Handlers ---

  // Xử lý sự kiện Stop Stream (Khắc phục lỗi gọi 2 lần tại đây)
  const handleStopStream = useCallback(async (cameraId: string) => {
    console.log("Stop stream requested for:", cameraId);
    // Gọi hàm unregister từ hook. 
    // LƯU Ý: Đảm bảo bên trong StreamActionButton KHÔNG gọi apiService.stopStream() nữa
    await unregisterStream(cameraId);
  }, [unregisterStream]);

  const handleDelete = useCallback(async (cameraId: string) => {
    try {
      await apiService.deleteCamera(cameraId);
      message.success('Xóa camera thành công!');
      fetchCameras(); // Refresh list
    } catch (error: any) {
      message.error(`Lỗi khi xóa camera: ${error.message}`);
    }
  }, [fetchCameras]);

  // Modal Handlers
  const handleAddSuccess = useCallback((newCamera: Camera) => {
    setIsAddModalOpen(false);
    fetchCameras();
    message.success(`Thêm camera '${newCamera.name}' thành công!`);
  }, [fetchCameras]);

  const handleEditSuccess = useCallback((updatedCamera: Camera) => {
    setIsEditModalOpen(false);
    setSelectedCamera(null);
    fetchCameras();
    message.success(`Cập nhật camera '${updatedCamera.name}' thành công!`);
  }, [fetchCameras]);

  const handleUploadSuccess = useCallback(() => {
    setIsUploadModalOpen(false);
    setSelectedCamera(null);
    window.location.hash = '#/'; // Redirect nếu cần
  }, []);

  // --- Table Columns Configuration ---
  const columns: ColumnsType<Camera> = [
    {
      title: 'Tên Camera',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      fixed: 'left', // Ghim cột tên để dễ nhìn trên mobile
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngưng'}
        </Tag>
      ),
    },
    {
      title: 'Điều khiển Stream', // Đổi tên cột cho rõ nghĩa
      key: 'stream',
      width: 140,
      align: 'center',
      render: (_, record) => (
        // Component này cần đảm bảo chỉ emit sự kiện, không gọi API trực tiếp
        <StreamActionButton 
          camera={record}
          activeJobId={activeStreams[record.camera_id]} 
          onStreamStarted={registerStream}
          onStreamStopped={handleStopStream} 
        />
      )
    },
    {
      title: 'Nguồn (URL/Path)',
      key: 'source',
      width: 250,
      ellipsis: true,
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Tag color={record.source_type === 'stream' ? 'blue' : 'purple'} style={{ marginBottom: 4 }}>
            {record.source_type?.toUpperCase()}
          </Tag>
          <Tooltip title={record.stream_url || record.video_path}>
            <Text ellipsis style={{ width: '100%', color: '#666' }}>
              {record.stream_url || record.video_path}
            </Text>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Camera ID',
      dataIndex: 'camera_id',
      key: 'camera_id',
      width: 150,
      render: (text) => <Text copyable>{text}</Text>
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (dateStr: string) => dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 160,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="Upload Video">
            <Button
              size="small"
              icon={<VideoCameraAddOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCamera(record);
                setIsUploadModalOpen(true);
              }}
            />
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              type="default"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCamera(record);
                setIsEditModalOpen(true);
              }}
            />
          </Tooltip>
          
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa camera này?"
              description={`Hành động này không thể hoàn tác.`}
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDelete(record.camera_id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý Camera</Title>
          <Text type="secondary">Danh sách và cấu hình các nguồn dữ liệu video</Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Thêm Camera Mới
        </Button>
      </div>
      
      {/* Filter Section */}
      <Card bodyStyle={{ padding: '16px' }} style={{ marginBottom: '16px' }}>
        <Space align="center">
          <Text strong>Bộ lọc:</Text>
          <Segmented
            options={[
              { label: 'Tất cả', value: 'all' },
              { label: 'Đang hoạt động', value: 'active' },
              { label: 'Đã ngưng', value: 'inactive' },
            ]}
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as any)}
          />
        </Space>
      </Card>
      
      {/* Table Section */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={cameras}
          loading={loading}
          rowKey="camera_id" // Quan trọng: dùng đúng unique ID
          scroll={{ x: 1500 }}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} camera`
          }}
        />
      </Card>

      {/* Modals */}
      <AddCameraModal
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <CameraEditModal
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedCamera(null);
        }}
        onSuccess={handleEditSuccess}
        camera={selectedCamera}
      />

      <CameraUploadModal
        open={isUploadModalOpen}
        camera={selectedCamera}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setSelectedCamera(null);
        }}
        onSuccess={handleUploadSuccess}
        cameraList={cameras}
        cameraListLoading={loading}
        onAddNewCameraClick={() => setIsAddModalOpen(true)}
      />
    </div>
  );
};