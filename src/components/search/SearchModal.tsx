// File: src/components/search/SearchPageAntd.tsx

import React, { useState, useRef } from 'react';
import { Tabs, Form, Input, InputNumber, Button, Upload, message, Divider, Card, Spin } from 'antd';
import { FileTextOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';

// Props: Thêm callback để chuyển đến trang detail
interface SearchPageProps {
  onSuccess: (jobId?: string) => void; // Nhận jobId để chuyển trang
}

export const SearchPageAntd: React.FC<SearchPageProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState('text'); // 'text' hoặc 'image'
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [textForm] = Form.useForm();
  const [imageForm] = Form.useForm();

  // === Thời điểm người dùng vào trang (ISO 8601), dùng chung cho 2 form ===
  const pageEnterISORef = useRef<string>(new Date().toISOString());

  // Regex validate ISO 8601 (Z hoặc offset +hh:mm/-hh:mm)
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/;

  // --- Logic Search by Text ---
  const handleTextSearch = async (values: any) => {
    setLoading(true);
    try {
      const response = await apiService.searchByText(
        values.searchText,
        // giữ optional: nếu user xoá trống -> undefined
        (typeof values.textTimestamp === 'string' && values.textTimestamp.trim()) || undefined,
        values.textDuration
      );
      
      // DEBUG: Log để xem response trả về gì
      console.log('=== TEXT SEARCH RESPONSE ===', response);
      
      // Thử nhiều cách lấy jobId (bao gồm cả snake_case)
      const jobId = response?.job_id || response?.jobId || response?.id || 
                    response?.data?.job_id || response?.data?.jobId || response?.data?.id;
      
      console.log('=== EXTRACTED JOB ID ===', jobId);
      
      message.success('Tìm kiếm bằng Text đã được khởi tạo thành công!');
      textForm.resetFields();
      
      // Chuyển đến trang detail với jobId
      if (jobId) {
        onSuccess(jobId);
      } else {
        console.error('Không tìm thấy jobId trong response:', response);
        message.warning('Không tìm thấy Job ID, chuyển về danh sách');
        onSuccess();
      }
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
      const response = await apiService.searchByImage(
        imageFile,
        // giữ optional: nếu user xoá trống -> undefined
        (typeof values.imageTimestamp === 'string' && values.imageTimestamp.trim()) || undefined,
        values.imageDuration
      );
      
      // DEBUG: Log để xem response trả về gì
      console.log('=== IMAGE SEARCH RESPONSE ===', response);
      
      // Thử nhiều cách lấy jobId
      const jobId = response?.jobId || response?.id || response?.data?.jobId || response?.data?.id;
      
      console.log('=== EXTRACTED JOB ID ===', jobId);
      
      message.success('Tìm kiếm bằng Ảnh đã được khởi tạo thành công!');
      imageForm.resetFields();
      setImageFile(null);
      
      // Chuyển đến trang detail với jobId
      if (jobId) {
        onSuccess(jobId);
      } else {
        console.error('Không tìm thấy jobId trong response:', response);
        message.warning('Không tìm thấy Job ID, chuyển về danh sách');
        onSuccess();
      }
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
    <Form
      form={textForm}
      layout="vertical"
      onFinish={handleTextSearch}
      initialValues={{
        textDuration: 60,
        textTimestamp: pageEnterISORef.current,
      }}
    >
      <Form.Item
        label="Nhập text tìm kiếm"
        name="searchText"
        rules={[{ required: true, message: 'Vui lòng nhập nội dung tìm kiếm!' }]}
      >
        <Input.TextArea rows={4} placeholder="Nhập từ khóa hoặc mô tả..." />
      </Form.Item>

      <Form.Item
        label="Timestamp (optional)"
        name="textTimestamp"
        tooltip="Mặc định là thời điểm bạn mở trang này (ISO 8601). Bạn có thể xóa trống hoặc chỉnh lại."
        rules={[
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve(); // optional
              return iso8601Regex.test(value)
                ? Promise.resolve()
                : Promise.reject(new Error('Không đúng định dạng ISO 8601 (ví dụ: 2025-11-10T15:30:00Z)'));
            },
          },
        ]}
      >
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
      initialValues={{
        imageDuration: 60,
        imageTimestamp: pageEnterISORef.current,
      }}
    >
      <Form.Item label="Chọn ảnh" required>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
        </Upload>
      </Form.Item>

      <Form.Item
        label="Timestamp (optional)"
        name="imageTimestamp"
        tooltip="Mặc định là thời điểm bạn mở trang này (ISO 8601). Bạn có thể xóa trống hoặc chỉnh lại."
        rules={[
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve(); // optional
              return iso8601Regex.test(value)
                ? Promise.resolve()
                : Promise.reject(new Error('Không đúng định dạng ISO 8601 (ví dụ: 2025-11-10T15:30:00Z)'));
            },
          },
        ]}
      >
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

  // --- Render ---
  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Khởi tạo Tìm kiếm Mới</h1>

        <Card className="shadow-lg">
          <Spin spinning={loading} tip="Đang xử lý...">
            <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
          </Spin>
        </Card>
      </div>
    </div>
  );
};