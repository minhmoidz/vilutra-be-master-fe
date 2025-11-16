import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag, Tooltip, Card, Typography, Segmented } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  QuestionCircleOutlined, 
  ReloadOutlined,
  VideoCameraAddOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '../../services/api.service';
import type { Camera } from '../../types';
import { AddCameraModal } from '../upload/AddCameraModal';
import { CameraEditModal } from './CameraEditModal';
import { CameraUploadModal } from './CameraUploadModal';

const { Title, Text } = Typography;

export const CameraManagementPage: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

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

  const handleDelete = useCallback(async (cameraId: string) => {
    try {
      await apiService.deleteCamera(cameraId);
      message.success('Xóa camera thành công!');
      fetchCameras();
    } catch (error: any) {
      message.error(`Lỗi khi xóa camera: ${error.message}`);
    }
  }, [fetchCameras]);

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
    window.location.hash = '#/';
  }, []);

  const handleOpenEditModal = (camera: Camera) => {
    setSelectedCamera(camera);
    setIsEditModalOpen(true);
  };
  
  const handleOpenUploadModal = (camera: Camera) => {
    setSelectedCamera(camera);
    setIsUploadModalOpen(true);
  };

  const columns: ColumnsType<Camera> = [
    {
      title: 'Tên Camera',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Camera ID',
      dataIndex: 'camera_id',
      key: 'camera_id',
      width: 150,
      sorter: (a, b) => a.camera_id.localeCompare(b.camera_id),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngưng'}
        </Tag>
      ),
      filters: [
        { text: 'Hoạt động', value: true },
        { text: 'Ngưng', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: 'Loại Nguồn',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'stream' ? 'blue' : 'purple'}>{type?.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'stream_url',
      key: 'source',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.stream_url || record.video_path}>
          <span>{record.stream_url || record.video_path}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (dateStr: string) => dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={12}>
          <Button
            size="small"
            icon={<VideoCameraAddOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenUploadModal(record);
            }}
          >
            Upload
          </Button>

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditModal(record);
            }}
          >
            Sửa
          </Button>
          
          <Popconfirm
            title="Xóa camera này?"
            description={`Xác nhận xóa "${record.name}"?`}
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.camera_id);
            }}
            okText="Có"
            cancelText="Không"
            okType="danger"
          >
            <DeleteOutlined 
              style={{ 
                fontSize: '16px', 
                color: '#ff4d4f',
                cursor: 'pointer',
                padding: '4px'
              }} 
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản lý Camera</Title>
          <Text type="secondary">Thêm, sửa, xóa và cấu hình các nguồn camera</Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Thêm Camera
          </Button>
        </Space>
      </div>
      
      <Segmented
        options={[
          { label: 'Tất cả', value: 'all' },
          { label: 'Đang hoạt động', value: 'active' },
          { label: 'Đã ngưng', value: 'inactive' },
        ]}
        value={filterStatus}
        onChange={(value) => setFilterStatus(value as any)}
        style={{ marginBottom: 16 }}
      />
      
      <Card>
        <Table
          columns={columns}
          dataSource={cameras}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1600 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

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