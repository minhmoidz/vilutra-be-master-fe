// File: src/components/search/SearchPageAntd.tsx (Phiên bản Page hoàn chỉnh)

import React, { useState } from 'react';
import { Tabs, Form, Input, InputNumber, Button, Upload, message, Divider, Card, Spin } from 'antd';
import { FileTextOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';

// Props: Chỉ cần onSuccess
interface SearchPageProps {
  onSuccess: () => void;
}

export const SearchPageAntd: React.FC<SearchPageProps> = ({ onSuccess }) => {
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
        values.textTimestamp || undefined,
        values.textDuration
      );
      onSuccess(); // Báo cho Dashboard chuyển trang
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
        onSuccess(); // Báo cho Dashboard chuyển trang
        message.success('Tìm kiếm bằng Ảnh đã được khởi tạo thành công!');
        imageForm.resetFields();
        setImageFile(null);
    } catch (error: any) {
        message.error('Lỗi khi tìm kiếm: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  // Cấu hình component Upload
  const uploadProps = {
    accept: 'image/*',
    beforeUpload: (file: File) => {
      setImageFile(file);
      return false; // Ngăn tự động upload
    },
    onRemove: () => {
      setImageFile(null);
    },
    fileList: imageFile ? [{ uid: '1', name: imageFile.name, status: 'done', size: imageFile.size } as any] : [],
  };

  // --- Nội dung các Tab ---

  const textTabContent = (
    <Form form={textForm} layout="vertical" onFinish={handleTextSearch} initialValues={{ textDuration: 60 }}>
      <Form.Item label="Nhập text tìm kiếm" name="searchText" rules={[{ required: true, message: 'Vui lòng nhập nội dung tìm kiếm!' }]}>
        <Input.TextArea rows={4} placeholder="Nhập từ khóa hoặc mô tả..." />
      </Form.Item>
      <Form.Item label="Timestamp (optional)" name="textTimestamp">
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
    <Form form={imageForm} layout="vertical" onFinish={handleImageSearch} initialValues={{ imageDuration: 60 }}>
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

  // Danh sách các tab
  const items = [
    {
      key: 'text',
      label: <span> <FileTextOutlined /> Tìm bằng Text </span>,
      children: textTabContent,
    },
    {
      key: 'image',
      label: <span> <PictureOutlined /> Tìm bằng Ảnh </span>,
      children: imageTabContent,
    },
  ];

  // --- Render ---
  return (
    // Layout của "trang"
    <div className="p-6 bg-gray-50 min-h-full">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Khởi tạo Tìm kiếm Mới</h1>
            
            {/* Dùng Card để bọc Tabs */}
            <Card className="shadow-lg">
                <Spin spinning={loading} tip="Đang xử lý...">
                    <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
                </Spin>
            </Card>
        </div>
    </div>
  );
};