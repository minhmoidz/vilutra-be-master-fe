// File: src/components/upload/VideoUploadPageAntd.tsx (Phiên bản Page hoàn chỉnh)

import React, { useState } from 'react';
import { Form, Input, Button, Upload, message, notification, Divider, Card, Spin } from 'antd';
import { UploadOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import type { VideoMetadata } from '../../types';

// Props: Chỉ cần hàm onSuccess để báo cho Dashboard biết
interface VideoUploadPageProps {
  onSuccess: () => void;
}

export const VideoUploadPageAntd: React.FC<VideoUploadPageProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [form] = Form.useForm();

  const handleUpload = async (values: any) => {
    if (!videoFile) {
      message.error('Vui lòng chọn file video!');
      return;
    }

    // Lấy metadata từ form
    const metadata: VideoMetadata = {
        video_id: values.videoId,
        camera_id: values.cameraId,
        timestamp_start: values.timestampStart || undefined, 
        media_name: values.mediaName || undefined
    };

    setLoading(true);
    // Thông báo cho người dùng biết là đang upload
    notification.info({
        message: 'Đang Upload',
        description: 'Video đang được gửi đi xử lý. Quá trình này có thể mất vài phút.',
        icon: <VideoCameraOutlined style={{ color: '#108ee9' }} />,
        duration: 0, // Hiển thị vô thời hạn
        key: 'uploading',
    });

    try {
      // Gọi API
      const response = await apiService.uploadVideo(videoFile, metadata);
      
      // Cập nhật thông báo thành công
      notification.success({
        message: 'Upload Thành Công!',
        description: `Job ID: ${response.job_id || response.jobId}, Status: ${response.status}.`,
        duration: 4,
        key: 'uploading', // Thay thế thông báo 'Đang Upload'
      });
      
      // Chờ 0.5s để người dùng đọc thông báo, sau đó gọi onSuccess
      setTimeout(() => {
        onSuccess(); // Báo cho JobDashboard chuyển trang
        form.resetFields(); // Dọn dẹp form
        setVideoFile(null); // Xóa file đã chọn
      }, 500);
      
    } catch (error: any) {
      // Cập nhật thông báo thất bại
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

  // Cấu hình cho component Upload của Antd
  const uploadProps = {
    accept: 'video/*',
    beforeUpload: (file: File) => {
      setVideoFile(file);
      return false; // Ngăn Antd tự động upload
    },
    onRemove: () => {
      setVideoFile(null);
    },
    // Hiển thị file đã chọn trong danh sách
    fileList: videoFile ? [{ uid: '1', name: videoFile.name, status: 'done', size: videoFile.size } as any] : [],
  };


  return (
    // Đây là layout của "trang"
    <div className="p-6 bg-gray-50 min-h-full">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Upload Video Mới</h1>
            
            {/* Dùng Card để bọc form cho đẹp */}
            <Card className="shadow-lg">
                <Spin spinning={loading} tip="Đang upload, vui lòng không rời khỏi trang...">
                    <Form 
                        form={form} 
                        layout="vertical" 
                        onFinish={handleUpload} 
                        className="space-y-4"
                    >
                        {/* 1. File Upload */}
                        <Form.Item label="Chọn video" required>
                            <Upload {...uploadProps}>
                                <Button icon={<UploadOutlined />}>Chọn file video</Button>
                            </Upload>
                        </Form.Item>

                        <Divider orientation="left">Thông tin Video</Divider>

                        {/* 2. Video ID */}
                        <Form.Item
                            label="Video ID"
                            name="videoId"
                            rules={[{ required: true, message: 'Vui lòng nhập Video ID!' }]}
                        >
                            <Input placeholder="ID duy nhất của video" />
                        </Form.Item>
                        
                        {/* 3. Camera ID */}
                        <Form.Item
                            label="Camera ID"
                            name="cameraId"
                            rules={[{ required: true, message: 'Vui lòng nhập Camera ID!' }]}
                        >
                            <Input placeholder="ID của Camera nguồn" />
                        </Form.Item>

                        {/* 4. Timestamp Start */}
                        <Form.Item label="Timestamp Start (ISO 8601)" name="timestampStart">
                            <Input placeholder="VD: 2025-11-10T15:30:00Z (optional)" />
                        </Form.Item>

                        {/* 5. Media Name */}
                        <Form.Item label="Media Name" name="mediaName">
                            <Input placeholder="Tên hiển thị (optional)" />
                        </Form.Item>

                        {/* 6. Nút Submit */}
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
                </Spin>
            </Card>
        </div>
    </div>
  );
};