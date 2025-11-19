import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch, 
  message, 
  Button, 
  InputNumber, 
  Row, 
  Col 
} from 'antd';
import type { Camera } from '../../types';
import { apiService } from '../../services/api.service';

interface AddCameraModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (newCamera: Camera) => void;
}

const { Option } = Select;

export const AddCameraModal: React.FC<AddCameraModalProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sourceType, setSourceType] = useState<'stream' | 'video'>('stream');

  const handleFinish = async (values: any) => {
    setLoading(true);
    
    // CHỈNH SỬA QUAN TRỌNG:
    // Không dùng lệnh 'delete'. Luôn gửi đầy đủ các trường.
    // Trường nào không dùng thì gửi chuỗi rỗng "" hoặc 0.
    
    const postData = {
      camera_id: values.camera_id,
      name: values.name,
      source_type: values.source_type,
      
      // Logic xử lý URL/Path: Gửi chuỗi rỗng "" nếu không dùng, không được xóa key
      stream_url: values.source_type === 'stream' ? (values.stream_url || "") : "",
      video_path: values.source_type === 'video' ? (values.video_path || "") : "",
      
      location: values.location || "", // Gửi chuỗi rỗng nếu user không nhập
      
      // Tọa độ: Mặc định là 0 nếu user không nhập
      lat: values.lat ?? 0,
      lon: values.lon ?? 0,
      
      description: values.description || "",
      is_active: values.is_active ?? true,
      
      // Config: Luôn phải là Object {}, không được null
      config: values.config ? JSON.parse(values.config) : {}, 
    };

    console.log('Payload gửi đi:', postData); // F12 để kiểm tra

    try {
      const newCamera = await apiService.addCamera(postData); 
      message.success(`Thêm camera '${newCamera.name}' thành công!`);
      form.resetFields();
      setSourceType('stream');
      onSuccess(newCamera); 
    } catch (error: any) {
      console.error(error);
      message.error(`Lỗi server: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm Camera Mới"
      open={open}
      onCancel={onCancel}
      destroyOnClose
      width={650}
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
        initialValues={{ 
          is_active: true, 
          source_type: 'stream',
          lat: 0,
          lon: 0
        }}
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
        
        <Form.Item label="Tên địa điểm (Location Name)" name="location">
          <Input placeholder="Vd: Tầng 1, Khu A" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label="Vĩ độ (Latitude)" 
              name="lat"
              rules={[{ type: 'number', message: 'Phải là số!' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Vd: 21.028511" 
                step="0.000001" 
                min={-90}
                max={90}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              label="Kinh độ (Longitude)" 
              name="lon"
              rules={[{ type: 'number', message: 'Phải là số!' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Vd: 105.854444" 
                step="0.000001"
                min={-180}
                max={180}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item label="Mô tả (Description)" name="description">
          <Input.TextArea rows={2} placeholder="Mô tả thêm" />
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
                return Promise.reject(new Error('JSON sai định dạng'));
              }
            }
          }]}
        >
          <Input.TextArea rows={2} placeholder='{}' style={{ fontFamily: 'monospace' }} />
        </Form.Item>
        
        <Form.Item label="Kích hoạt (Is Active)" name="is_active" valuePropName="checked">
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </Modal>
  );
};