// File: src/components/search/SearchModalAntd.tsx (Phiên bản mới)

import React, { useState } from 'react';
import { Modal, Tabs, Form, Input, InputNumber, Button, Upload, message, Divider } from 'antd';
import { FileTextOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Định nghĩa props như cũ
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SearchModalAntd: React.FC<SearchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState('text'); // 'text' hoặc 'image'
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [textForm] = Form.useForm();
  const [imageForm] = Form.useForm();

  // --- Logic Search by Text ---
  const handleTextSearch = async (values: any) => {
    setLoading(true);
    try {
      await apiService.searchByText(
        values.searchText,
        values.textTimestamp || undefined, // Đảm bảo giá trị trống là undefined
        values.textDuration // InputNumber sẽ đảm bảo là number hoặc undefined
      );
      onSuccess();
      onClose();
      message.success('Tìm kiếm bằng Text đã được khởi tạo thành công!');
      textForm.resetFields();
    } catch (error: any) {
      message.error('Lỗi khi tìm kiếm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Logic Search by Image ---
  const handleImageSearch = async (values: any) => {
    if (!imageFile) {
      message.error('Vui lòng chọn ảnh');
      return;
    }
    setLoading(true);
    try {
      await apiService.searchByImage(
        imageFile,
        values.imageTimestamp || undefined,
        values.imageDuration
      );
      onSuccess();
      onClose();
      message.success('Tìm kiếm bằng Ảnh đã được khởi tạo thành công!');
      imageForm.resetFields();
      setImageFile(null); // Reset file
    } catch (error: any) {
      message.error('Lỗi khi tìm kiếm: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình cho component Upload của Antd
  const uploadProps = {
    accept: 'image/*',
    beforeUpload: (file: File) => {
      setImageFile(file);
      return false; // Ngăn chặn Antd tự động upload
    },
    onRemove: () => {
      setImageFile(null);
    },
    fileList: imageFile ? [{ uid: '1', name: imageFile.name, status: 'done', size: imageFile.size } as any] : [],
  };

  const textTabContent = (
    <Form
      form={textForm}
      layout="vertical"
      onFinish={handleTextSearch}
      initialValues={{ textDuration: 60 }}
    >
      <Form.Item
        label="Nhập text tìm kiếm"
        name="searchText"
        rules={[{ required: true, message: 'Vui lòng nhập nội dung tìm kiếm!' }]}
      >
        <Input.TextArea rows={4} placeholder="Nhập từ khóa hoặc mô tả..." />
      </Form.Item>
      <Form.Item label="Timestamp (optional)" name="textTimestamp">
        {/* Antd không có datetime-local, dùng Input text cho định dạng ISO 8601 */}
        <Input placeholder="VD: 2025-11-10T15:30:00Z" />
      </Form.Item>
      <Form.Item label="Duration (seconds, optional)" name="textDuration">
        <InputNumber min={1} style={{ width: '100%' }} placeholder="Thời lượng tìm kiếm" />
      </Form.Item>
      <Divider />
      <Button type="primary" htmlType="submit" block loading={loading}>
        Bắt đầu Tìm kiếm
      </Button>
    </Form>
  );

  const imageTabContent = (
    <Form
      form={imageForm}
      layout="vertical"
      onFinish={handleImageSearch}
      initialValues={{ imageDuration: 60 }}
    >
      <Form.Item label="Chọn ảnh" required>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
        </Upload>
      </Form.Item>
      <Form.Item label="Timestamp (optional)" name="imageTimestamp">
        <Input placeholder="VD: 2025-11-10T15:30:00Z" />
      </Form.Item>
      <Form.Item label="Duration (seconds, optional)" name="imageDuration">
        <InputNumber min={1} style={{ width: '100%' }} placeholder="Thời lượng tìm kiếm" />
      </Form.Item>
      <Divider />
      <Button type="primary" htmlType="submit" block loading={loading}>
        Bắt đầu Tìm kiếm
      </Button>
    </Form>
  );

  const items = [
    {
      key: 'text',
      label: (
        <span>
          <FileTextOutlined /> Tìm bằng Text
        </span>
      ),
      children: textTabContent,
    },
    {
      key: 'image',
      label: (
        <span>
          <PictureOutlined /> Tìm bằng Ảnh
        </span>
      ),
      children: imageTabContent,
    },
  ];

  return (
    <Modal
      title="Khởi tạo Tìm kiếm Mới"
      open={isOpen} // antd dùng 'open' thay vì 'isOpen'
      onCancel={onClose}
      footer={null} // Ẩn footer mặc định (vì đã có nút submit trong form)
      centered // Hiển thị ở giữa màn hình
      maskClosable={!loading} // Ngăn đóng khi đang tải
    >
      {loading && <LoadingSpinner />}
      <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
    </Modal>
  );
};