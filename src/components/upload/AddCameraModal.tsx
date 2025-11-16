// File: src/components/upload/AddCameraModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Switch, message, Button } from 'antd';
import type { Camera, NewCameraData } from '../../types';
import { apiService } from '../../services/api.service';
// Đảm bảo bạn đã export các hàm/types này từ service và types


interface AddCameraModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (newCamera: Camera) => void; // Callback khi thêm thành công
}

const { Option } = Select;

export const AddCameraModal: React.FC<AddCameraModalProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  // State để hiển thị đúng input (Stream URL hoặc Video Path)
  const [sourceType, setSourceType] = useState<'stream' | 'video'>('stream');

  const handleFinish = async (values: any) => {
    setLoading(true);
    
    // Chuẩn bị data để POST
    const postData: Partial<NewCameraData> = {
      ...values,
      is_active: values.is_active ?? true,
      config: values.config ? JSON.parse(values.config) : {}, // Parse JSON config
    };
    
    // Xóa trường không liên quan
    if (postData.source_type === 'stream') {
      delete postData.video_path;
    } else {
      delete postData.stream_url;
    }

    try {
      // Giả định apiService.addCamera(...)
      const newCamera = await apiService.addCamera(postData); 
      message.success(`Thêm camera '${newCamera.name}' thành công!`);
      form.resetFields();
      onSuccess(newCamera); // Trả camera mới về component cha (Page)
    } catch (error: any) {
      message.error(`Lỗi khi thêm camera: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm Camera Mới"
      open={open}
      onCancel={onCancel}
      destroyOnClose // Reset form fields khi đóng
      footer={[
        <Button key="back" onClick={onCancel}>
          Hủy bỏ
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          Thêm Camera
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ is_active: true, source_type: 'stream' }}
      >
        <Form.Item
          label="Camera ID"
          name="camera_id"
          rules={[{ required: true, message: 'Vui lòng nhập Camera ID!' }]}
        >
          <Input placeholder="ID duy nhất, vd: cam_01" />
        </Form.Item>
        
        <Form.Item
          label="Tên Camera (Name)"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên camera!' }]}
        >
          <Input placeholder="Vd: Camera Lối Vào" />
        </Form.Item>
        
        <Form.Item
          label="Loại Nguồn (Source Type)"
          name="source_type"
          rules={[{ required: true }]}
        >
          <Select onChange={(value) => setSourceType(value)}>
            <Option value="stream">Stream (RTSP/HTTP)</Option>
            <Option value="video">Video File</Option>
          </Select>
        </Form.Item>

        {/* Hiển thị input tương ứng với Source Type */}
        {sourceType === 'stream' ? (
          <Form.Item
            label="Stream URL"
            name="stream_url"
            rules={[{ required: true, message: 'Vui lòng nhập Stream URL!' }]}
          >
            <Input placeholder="rtsp://..." />
          </Form.Item>
        ) : (
          <Form.Item
            label="Video Path"
            name="video_path"
            rules={[{ required: true, message: 'Vui lòng nhập đường dẫn video!' }]}
          >
            <Input placeholder="/path/to/video.mp4" />
          </Form.Item>
        )}
        
        <Form.Item label="Vị trí (Location)" name="location">
          <Input placeholder="Vd: Tầng 1, Khu A" />
        </Form.Item>
        
        <Form.Item label="Mô tả (Description)" name="description">
          <Input.TextArea rows={2} placeholder="Mô tả thêm (không bắt buộc)" />
        </Form.Item>

        <Form.Item label="Config (JSON)" name="config"
          tooltip='Nhập một chuỗi JSON, vd: {"key": "value"}'
          rules={[{
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              try {
                JSON.parse(value);
                return Promise.resolve();
              } catch (e) {
                return Promise.reject(new Error('Chuỗi JSON không hợp lệ'));
              }
            }
          }]}
        >
          <Input.TextArea rows={2} placeholder='{}' />
        </Form.Item>
        
        <Form.Item label="Kích hoạt (Is Active)" name="is_active" valuePropName="checked">
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </Modal>
  );
};