import React, { useState, useEffect } from 'react';
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
        // Lat/Lon có thể là null từ DB, cần hiển thị đúng
        lat: camera.lat, 
        lon: camera.lon,
        // Config là object, cần stringify để hiển thị trong TextArea
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
      // Đảm bảo lat/lon là số (InputNumber đã trả về số hoặc null)
      // Nếu user xóa trắng ô input, ta gửi về 0 hoặc giá trị cũ tùy logic (ở đây để 0 theo mẫu json bạn đưa)
      lat: values.lat ?? 0,
      lon: values.lon ?? 0,
      is_active: values.is_active ?? true,
      config: values.config ? JSON.parse(values.config) : {},
    };
    
    // Xử lý cleanup dữ liệu thừa dựa trên loại nguồn
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
      width={650} // Tăng chiều rộng modal một chút để hiển thị 2 cột đẹp hơn
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
        {/* Camera ID - Không được sửa */}
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

        {/* Hiển thị Input tương ứng với Source Type */}
        {sourceType === 'stream' ? (
          <Form.Item
            label="Stream URL"
            name="stream_url"
            rules={[{ required: true, message: 'Vui lòng nhập Stream URL!' }]}
          >
            <Input placeholder="rtsp://admin:pass@192.168.1.10:554/..." />
          </Form.Item>
        ) : (
          <Form.Item
            label="Video Path"
            name="video_path"
            rules={[{ required: true, message: 'Vui lòng nhập đường dẫn video!' }]}
          >
            <Input placeholder="/data/videos/video01.mp4" />
          </Form.Item>
        )}
        
        {/* --- SECTION VỊ TRÍ --- */}
        <Form.Item label="Địa điểm (Location Name)" name="location">
          <Input placeholder="Vd: Tầng 1, Khu A" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label="Vĩ độ (Latitude)" 
              name="lat"
              rules={[{ type: 'number', message: 'Vui lòng nhập số hợp lệ' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Vd: 21.028511" 
                step="0.000001" // Cho phép nhập số thập phân nhỏ
                min={-90}
                max={90}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              label="Kinh độ (Longitude)" 
              name="lon"
              rules={[{ type: 'number', message: 'Vui lòng nhập số hợp lệ' }]}
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
        {/* ----------------------- */}
        
        <Form.Item label="Mô tả (Description)" name="description">
          <Input.TextArea rows={2} placeholder="Mô tả thêm (không bắt buộc)" />
        </Form.Item>

        {/* Validate JSON Config */}
        <Form.Item label="Config (JSON)" name="config"
          tooltip='Nhập một chuỗi JSON hợp lệ, ví dụ: {"fps": 25}'
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
          <Input.TextArea rows={3} placeholder='{}' style={{ fontFamily: 'monospace' }} />
        </Form.Item>
        
        <Form.Item label="Kích hoạt (Is Active)" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};