import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Card, Row, Col, Button,Tag, Space, Empty, 
  Tabs, Table, Modal, Form, Input, Switch, message, Popconfirm, Tooltip 
} from 'antd';
import { 
  VideoCameraOutlined, SettingOutlined, 
 PlusOutlined, EditOutlined, DeleteOutlined,
  SyncOutlined, PlayCircleOutlined, PauseCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { violenceApiService } from '../../services/violenceApi.service';
import type { ViolenceCamera } from '../../types/violence';


const { Title, Text } = Typography;

// --- COMPONENT CON: LIVE MONITOR ---
const LiveMonitor: React.FC<{ cameras: ViolenceCamera[] }> = ({ cameras }) => {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={16}>
        <Card 
            title={<Space><VideoCameraOutlined /> <span>Live Monitor</span></Space>}
            extra={<Tag color="processing">AI Active</Tag>}
            styles={{ 
              body: { 
                padding: 0, 
                height: '500px', 
                background: '#000', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              } 
            }}
        >
            <div style={{ color: 'white', textAlign: 'center' }}>
                <VideoCameraOutlined style={{ fontSize: 64, opacity: 0.5 }} />
                <p style={{ marginTop: 16, opacity: 0.7 }}>
                  {cameras.length > 0 ? 'Select a camera to view feed' : 'No cameras available'}
                </p>
            </div>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card 
          title="Realtime Alerts" 
          style={{ height: '100%' }} 
          styles={{ body: { padding: '12px' } }}
        >
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No threats detected" />
        </Card>
      </Col>
    </Row>
  );
};

// --- COMPONENT CON: QUẢN LÝ CAMERA ---
const CameraManagement: React.FC<{ 
  cameras: ViolenceCamera[], 
  loading: boolean, 
  onRefresh: () => void 
}> = ({ cameras, loading, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCam, setEditingCam] = useState<ViolenceCamera | null>(null);
  const [form] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  // Reset form data khi mở modal
  useEffect(() => {
    if (isModalOpen) {
      if (editingCam) {
        form.setFieldsValue({
          camera_id: editingCam.camera_id,
          url: editingCam.url,
          is_active: editingCam.is_active ?? true,
          is_detection: true
        });
      } else {
        form.resetFields();
      }
    }
  }, [isModalOpen, editingCam, form]);

  const handleAdd = () => {
    setEditingCam(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cam: ViolenceCamera) => {
    setEditingCam(cam);
    setIsModalOpen(true);
  };

  const handleFinish = async (values: any) => {
    setActionLoading(true);
    try {
      if (editingCam) {
        // Cập nhật (PATCH)
        await violenceApiService.update(editingCam.camera_id, {
          camera_id: editingCam.camera_id,
          url: values.url || "",
          is_active: values.is_active ?? true
        });
        message.success('Cập nhật camera thành công');
      } else {
        // Đăng ký mới (POST)
        const payload = {
          camera_id: values.camera_id,
          url: values.url || "",
          is_detection: values.is_detection !== undefined ? values.is_detection : true 
        };
        
        console.log("Sending Register Payload:", payload);

        await violenceApiService.register(payload);
        message.success('Đăng ký camera thành công');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (error: any) {
      console.error("API Error Details:", error);
      message.error('Lỗi: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async (cam: ViolenceCamera) => {
    try {
      message.loading({ content: `Đang khởi động ${cam.camera_id}...`, key: 'control' });
      await violenceApiService.startDetection(cam.camera_id);
      message.success({ content: `Đã bắt đầu nhận diện trên ${cam.camera_id}`, key: 'control' });
      onRefresh();
    } catch (error: any) {
      message.error({ content: `Lỗi Start: ${error.message}`, key: 'control' });
    }
  };

  const handleStop = async (cam: ViolenceCamera) => {
    try {
      message.loading({ content: `Đang dừng ${cam.camera_id}...`, key: 'control' });
      await violenceApiService.stopDetection(cam.camera_id);
      message.success({ content: `Đã dừng nhận diện trên ${cam.camera_id}`, key: 'control' });
      onRefresh();
    } catch (error: any) {
      message.error({ content: `Lỗi Stop: ${error.message}`, key: 'control' });
    }
  };

  const handleDelete = async (cameraId: string) => {
    try {
      await violenceApiService.delete(cameraId);
      message.success('Đã xóa camera');
      onRefresh();
    } catch (error: any) {
      message.error('Lỗi xóa: ' + error.message);
    }
  };

  const columns: ColumnsType<ViolenceCamera> = [
    {
      title: 'Camera ID',
      dataIndex: 'camera_id',
      key: 'camera_id',
      width: 150,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'URL Nguồn',
      dataIndex: 'url',
      key: 'url',
      width: 250,
      ellipsis: true,
      render: (url) => <Tooltip title={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></Tooltip>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      width: 120,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'RUNNING' : 'STOPPED'}
        </Tag>
      )
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'last_run',
      key: 'last_run',
      width: 180,
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : '-'
    },
    {
      title: 'Điều khiển',
      key: 'control',
      align: 'center',
      width: 120,
      render: (_, record) => (
        <Space>
          {!record.is_active ? (
            <Tooltip title="Bắt đầu nhận diện">
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />} 
                onClick={() => handleStart(record)}
              >
                Start
              </Button>
            </Tooltip>
          ) : (
             <Popconfirm title="Dừng nhận diện?" onConfirm={() => handleStop(record)}>
                <Button 
                  danger 
                  icon={<PauseCircleOutlined />} 
                >
                  Stop
                </Button>
             </Popconfirm>
          )}
        </Space>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 200, // Tăng độ rộng cột
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {/* Nút Sửa: To hơn, có chữ */}
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>

          {/* Nút Xóa: To hơn, có chữ, màu đỏ */}
          <Popconfirm 
            title="Xóa camera này?" 
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDelete(record.camera_id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<SyncOutlined />} onClick={onRefresh} loading={loading}>Làm mới</Button>
          <span style={{ color: '#888', fontSize: 12 }}>API Port: 9001</span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Đăng ký Camera
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={cameras} 
        rowKey="camera_id" 
        loading={loading}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 1200 }} // Thêm scroll ngang để đảm bảo không vỡ layout trên màn nhỏ
      />

      <Modal
        title={editingCam ? `Sửa Camera: ${editingCam.camera_id}` : "Đăng ký Camera Mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={actionLoading}
        destroyOnClose
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleFinish}
          initialValues={{ 
            is_active: true, 
            is_detection: true 
          }}
        >
          <Form.Item 
            label="Camera ID" 
            name="camera_id" 
            rules={[{ required: true, message: 'Vui lòng nhập ID' }]}
          >
            <Input disabled={!!editingCam} placeholder="VD: cam_sanh_chinh" />
          </Form.Item>

          <Form.Item 
            label="RTSP/HTTP URL" 
            name="url" 
            rules={[{ required: true, message: 'Vui lòng nhập URL' }]}
          >
            <Input placeholder="rtsp://admin:pass@ip:554/..." />
          </Form.Item>

          {editingCam ? (
             <Form.Item label="Trạng thái hoạt động" name="is_active" valuePropName="checked">
               <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
             </Form.Item>
          ) : (
             <Form.Item 
               label="Tự động nhận diện ngay" 
               name="is_detection" 
               valuePropName="checked"
             >
               <Switch checkedChildren="Bật" unCheckedChildren="Tắt" defaultChecked />
             </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

// --- TRANG CHÍNH ---
export const ViolenceDetectionPage: React.FC = () => {
  const [cameras, setCameras] = useState<ViolenceCamera[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCameras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await violenceApiService.getList();
      setCameras(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const tabItems = [
    {
      key: 'monitor',
      label: <span><EyeOutlined /> Giám sát Trực tuyến</span>,
      children: <LiveMonitor cameras={cameras} />,
    },
    {
      key: 'management',
      label: <span><SettingOutlined /> Quản lý Camera & AI</span>,
      children: <CameraManagement cameras={cameras} loading={loading} onRefresh={fetchCameras} />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, color: '#cf1322' }}>
            <Space>
              Violence Detection System
              <Tag color="#f50">Security AI</Tag>
            </Space>
          </Title>
          <Text type="secondary">Hệ thống phát hiện bạo lực (Sử dụng API Engine Port 9001)</Text>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
         <Tabs defaultActiveKey="management" items={tabItems} type="card" />
      </Card>
    </div>
  );
};