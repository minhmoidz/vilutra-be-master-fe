import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message, Button } from 'antd';
import { apiService } from '../../services/api.service';
import type { Camera, UpdateCameraData } from '../../types';

interface CameraEditModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (updatedCamera: Camera) => void;
  camera: Camera | null; // Camera đang được sửa
}

const { Option } = Select;

export const CameraEditModal: React.FC<CameraEditModalProps> = ({ open, onCancel, onSuccess, camera }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sourceType, setSourceType] = useState<'stream' | 'video' | string>('stream');

  // Điền dữ liệu vào form khi 'camera' thay đổi (khi modal mở)
  useEffect(() => {
    if (camera) {
      form.setFieldsValue({
        ...camera,
        // Config có thể là object, cần stringify để hiển thị
        config: camera.config ? JSON.stringify(camera.config, null, 2) : '{}'
      });
      setSourceType(camera.source_type);
    } else {
      form.resetFields();
    }
  }, [camera, form]);

  const handleFinish = async (values: any) => {
    if (!camera) return;

    setLoading(true);
    
    // Chuẩn bị data để PUT (UpdateCameraData không chứa camera_id)
    const postData: Partial<UpdateCameraData> = {
      ...values,
      is_active: values.is_active ?? true,
      config: values.config ? JSON.parse(values.config) : {},
    };
    
    if (postData.source_type === 'stream') {
      delete postData.video_path;
    } else {
      delete postData.stream_url;
    }

    try {
      const updatedCamera = await apiService.updateCamera(camera.camera_id, postData);
      onSuccess(updatedCamera);
    } catch (error: any) {
      message.error(`Lỗi khi cập nhật camera: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Sửa Camera: ${camera?.name || ''}`}
      open={open}
      onCancel={onCancel}
      destroyOnClose
      footer={[
        <Button key="back" onClick={onCancel}>
          Hủy bỏ
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          Lưu thay đổi
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        {/* Camera ID không cho sửa */}
        <Form.Item
          label="Camera ID"
          name="camera_id"
        >
          <Input placeholder="ID duy nhất, vd: cam_01" disabled />
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
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};