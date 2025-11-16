// File: src/components/upload/VideoUploadPageAntd.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Form, message, notification } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
// Import các service và types (Giả định bạn đã định nghĩa chúng)
import { apiService } from '../../services/api.service'; 
import type { Camera, VideoMetadata } from '../../types';
// Import 2 component con
import { VideoUploadForm } from './VideoUploadForm'; 
import { AddCameraModal } from './AddCameraModal'; 
import type { UploadProps } from 'antd';

interface VideoUploadPageProps {
  onSuccess: () => void;
}

export const VideoUploadPageAntd: React.FC<VideoUploadPageProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [form] = Form.useForm();
  
  // Ref giữ thời điểm vào trang
  const pageEnterISORef = useRef<string>(new Date().toISOString());

  // State mới để quản lý camera và modal
  const [cameraList, setCameraList] = useState<Camera[]>([]);
  const [cameraListLoading, setCameraListLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hàm gọi API GET /api/v1/cameras
  const fetchCameras = useCallback(async () => {
    setCameraListLoading(true);
    try {
      // Giả định apiService.getCameras() trả về Promise<Camera[]>
      const cameras = await apiService.getCameras(); 
      setCameraList(cameras);
    } catch (error: any) {
      message.error(`Không thể tải danh sách camera: ${error.message}`);
    } finally {
      setCameraListLoading(false);
    }
  }, []);

  // Gọi API GET khi component mount lần đầu
  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);
  
  // Hàm xử lý khi thêm camera thành công từ modal
  const handleModalSuccess = (newCamera: Camera) => {
    // Cập nhật lại danh sách camera
    setCameraList(currentList => [...currentList, newCamera]);
    
    // Tự động chọn camera vừa thêm
    form.setFieldsValue({ cameraId: newCamera.camera_id });
    
    // Đóng modal
    setIsModalOpen(false);
  };
  
  // Hàm xử lý upload chính (Không đổi)
  const handleUpload = async (values: any) => {
    if (!videoFile) {
      message.error('Vui lòng chọn file video!');
      return;
    }

    // Chuẩn hoá dữ liệu
    const mediaNameFinal = (values.mediaName ?? '').toString().trim() || '0';
    const timestampFinal = values.timestampStart || pageEnterISORef.current;
    const cameraIdFinal = String(values.cameraId); 

    const metadata: VideoMetadata = {
      video_id: values.videoId,
      camera_id: cameraIdFinal,
      timestamp_start: timestampFinal,
      media_name: mediaNameFinal,
    };

    setLoading(true);
    notification.info({
      message: 'Đang Upload',
      description: 'Video đang được gửi đi xử lý. Quá trình này có thể mất vài phút.',
      icon: <VideoCameraOutlined style={{ color: '#108ee9' }} />,
      duration: 0,
      key: 'uploading',
    });

    try {
      // Giả định apiService.uploadVideo(...)
      const response = await apiService.uploadVideo(videoFile, metadata); 

      notification.success({
        message: 'Upload Thành Công!',
        description: `Job ID: ${response.job_id || response.jobId}, Status: ${response.status}.`,
        duration: 4,
        key: 'uploading',
      });

      setTimeout(() => {
        onSuccess();
        form.resetFields();
        setVideoFile(null);
      }, 500);
    } catch (error: any) {
      const errMsg = (error?.message || String(error)).toLowerCase();
      notification.error({
        message: 'Lỗi Upload',
        description: errMsg.includes('timeout')
          ? 'Request bị timeout (quá 5 phút). Thử lại sau.'
          : `Lỗi: ${error?.message || String(error)}`,
        duration: 5,
        key: 'uploading',
      });
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình Upload (Không đổi)
  const uploadProps: UploadProps = {
    accept: 'video/*',
    beforeUpload: (file: File) => {
      setVideoFile(file);
      return false; // Ngăn Antd tự động upload
    },
    onRemove: () => {
      setVideoFile(null);
    },
    fileList: videoFile
      ? [{ uid: '1', name: videoFile.name, status: 'done', size: (videoFile as any).size } as any]
      : [],
  };

  return (
    <>
      <div className="p-6 bg-gray-50 min-h-full">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Upload Video Mới</h1>

          {/* Render component Form và truyền tất cả logic/state vào */}
          <VideoUploadForm
            form={form}
            loading={loading}
            onFinish={handleUpload}
            uploadProps={uploadProps}
            initialValues={{
              timestampStart: pageEnterISORef.current,
              mediaName: '0',
            }}
            
            // Truyền props mới cho việc chọn camera
            cameraList={cameraList}
            cameraListLoading={cameraListLoading}
            onAddNewCameraClick={() => setIsModalOpen(true)} // Hàm mở modal
          />
        </div>
      </div>

      {/* Render Modal (Modal sẽ tự hiển thị khi 'open' là true) */}
      <AddCameraModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};