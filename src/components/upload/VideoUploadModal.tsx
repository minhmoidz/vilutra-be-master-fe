// File: src/components/upload/VideoUploadModalAntd.tsx (Phiên bản mới)

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Upload, message, notification, Divider } from 'antd';
import { UploadOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { VideoMetadata } from '../../types';

// Định nghĩa props như cũ
interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VideoUploadModalAntd: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [form] = Form.useForm();

  // Tự động reset form khi modal được mở
  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setVideoFile(null);
    }
  }, [isOpen]);

  const handleUpload = async (values: any) => {
    if (!videoFile) {
      message.error('Vui lòng chọn file video!');
      return;
    }

    const metadata: VideoMetadata = {
      video_id: values.videoId,
      camera_id: values.cameraId,
      timestamp_start: values.timestampStart || undefined, 
      media_name: values.mediaName || undefined
    };

    setLoading(true);
    // Thay thế `setUploadProgress` bằng Ant Design notification
    notification.info({
      message: 'Đang Upload',
      description: 'Video đang được gửi đi xử lý. Quá trình này có thể mất vài phút.',
      icon: <VideoCameraOutlined style={{ color: '#108ee9' }} />,
      duration: 0, // Hiển thị vô thời hạn cho đến khi có kết quả
      key: 'uploading',
    });

    try {
      const response = await apiService.uploadVideo(videoFile, metadata);
      notification.success({
        message: 'Upload Thành Công!',
        description: `Job ID: ${response.job_id || response.jobId}, Status: ${response.status}.`,
        duration: 4,
        key: 'uploading',
      });
      
      setTimeout(() => {
        onSuccess(); 
        onClose(); 
      }, 500);
      
    } catch (error: any) {
      notification.error({
        message: 'Lỗi Upload',
        description: error.message.includes('timeout') 
          ? 'Request bị timeout (quá 5 phút). Thử lại sau.' 
          : `Lỗi: ${error.message}`,
        duration: 5,
        key: 'uploading',
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    accept: 'video/*',
    beforeUpload: (file: File) => {
      setVideoFile(file);
      return false; // Ngăn chặn Antd tự động upload
    },
    onRemove: () => {
      setVideoFile(null);
    },
    // Hiển thị file đã chọn
    fileList: videoFile ? [{ uid: '1', name: videoFile.name, status: 'done', size: videoFile.size } as any] : [],
  };


  return (
    <Modal
      title="Upload Video Mới"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      maskClosable={!loading}
    >
      <div className="relative">
        {loading && <LoadingSpinner />}
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleUpload} 
          className="space-y-4"
        >
          {/* File Upload */}
          <Form.Item label="Chọn video" required>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Chọn file video</Button>
            </Upload>
          </Form.Item>

          <Divider orientation="left">Thông tin Video</Divider>

          {/* Video ID */}
          <Form.Item
            label="Video ID"
            name="videoId"
            rules={[{ required: true, message: 'Vui lòng nhập Video ID!' }]}
          >
            <Input placeholder="ID duy nhất của video" />
          </Form.Item>
          
          {/* Camera ID */}
          <Form.Item
            label="Camera ID"
            name="cameraId"
            rules={[{ required: true, message: 'Vui lòng nhập Camera ID!' }]}
          >
            <Input placeholder="ID của Camera nguồn" />
          </Form.Item>

          {/* Timestamp Start */}
          <Form.Item label="Timestamp Start (ISO 8601)" name="timestampStart">
            <Input placeholder="VD: 2025-11-10T15:30:00Z (optional)" />
          </Form.Item>

          {/* Media Name */}
          <Form.Item label="Media Name" name="mediaName">
            <Input placeholder="Tên hiển thị (optional)" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={<VideoCameraOutlined />}
          >
            Bắt đầu Upload
          </Button>
        </Form>
      </div>
    </Modal>
  );
};