import React, { useState, useRef, useEffect } from 'react';
import { Modal, Form, message, notification } from 'antd';
// [THÊM MỚI] Import icon còn thiếu
import { VideoCameraOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import type { Camera, VideoMetadata } from '../../types';
import type { UploadProps } from 'antd';
// [MỚI] Import Form UI
import { VideoUploadForm } from '../upload/VideoUploadForm'; 

interface CameraUploadModalProps {
  open: boolean;
  camera: Camera | null; // Camera được chọn từ bảng
  cameraList: Camera[]; // Danh sách camera (để truyền xuống VideoUploadForm)
  cameraListLoading: boolean;
  onAddNewCameraClick: () => void; // Hàm để mở modal Add
  onCancel: () => void;
  onSuccess: (response: any) => void;
}

export const CameraUploadModal: React.FC<CameraUploadModalProps> = ({ 
  open, 
  camera, 
  cameraList, 
  cameraListLoading,
  onAddNewCameraClick,
  onCancel, 
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Lấy thời điểm modal mở
  const pageEnterISORef = useRef<string>(new Date().toISOString());

  // Tự động điền thông tin vào form khi modal được mở (khi props 'camera' thay đổi)
  useEffect(() => {
    if (open && camera) {
      // Tự động tạo Video ID
      const defaultVideoId = `${camera.camera_id}_${new Date().getTime()}`;
      
      form.setFieldsValue({
        cameraId: camera.camera_id, // Chọn camera trong Select
        videoId: defaultVideoId, // Điền Video ID
        timestampStart: pageEnterISORef.current,
        mediaName: '0',
      });
    } else if (!open) {
      // Reset khi đóng
      form.resetFields();
      setVideoFile(null);
    }
  }, [open, camera, form]);

  // Logic upload
  const handleUpload = async (values: any) => {
    if (!videoFile) {
      message.error('Vui lòng chọn file video!');
      return;
    }
    // Dù đã pre-fill, vẫn kiểm tra lại giá trị từ form
    if (!values.cameraId) { 
      message.error('Vui lòng chọn Camera ID!');
      return;
    }
    if (!values.videoId) {
      message.error('Vui lòng nhập Video ID!');
      return;
    }

    setLoading(true);
    
    // Chuẩn bị metadata
    const metadata: VideoMetadata = {
      video_id: values.videoId,
      camera_id: values.cameraId, // Lấy từ form
      timestamp_start: values.timestampStart || pageEnterISORef.current,
      media_name: (values.mediaName ?? '').toString().trim() || '0',
    };

    notification.info({
      message: 'Đang Upload',
      description: `Đang upload video cho ${camera?.name}...`,
      icon: <VideoCameraOutlined style={{ color: '#108ee9' }} />,
      duration: 0,
      key: 'uploading-modal',
    });

    try {
      const response = await apiService.uploadVideo(videoFile, metadata);
      
      notification.success({
        message: 'Upload Thành Công!',
        description: `Job ID: ${response.job_id || response.jobId}, Status: ${response.status}.`,
        duration: 4,
        key: 'uploading-modal',
      });
      
      onSuccess(response); // Thông báo cho component cha (CameraManagementPage)
      
    } catch (error: any) {
      notification.error({
        message: 'Lỗi Upload',
        description: `Lỗi: ${error.message}`,
        duration: 5,
        key: 'uploading-modal',
      });
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình Upload
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
    <Modal
      title={`Upload Video cho: ${camera?.name || ''}`}
      open={open}
      onCancel={onCancel}
      destroyOnClose
      footer={null} // Tắt footer mặc định, vì VideoUploadForm có nút "Submit" riêng
      width={640} // Rộng hơn
    >
      {/* [CẬP NHẬT] 
        Render VideoUploadForm bên trong Modal và truyền props
      */}
      <div style={{ paddingTop: '16px' }}> {/* Thêm chút padding */}
        <VideoUploadForm
          form={form}
          loading={loading}
          onFinish={handleUpload}
          uploadProps={uploadProps}
          cameraList={cameraList} // <-- Truyền danh sách camera
          cameraListLoading={cameraListLoading} // <-- Truyền trạng thái loading
          onAddNewCameraClick={onAddNewCameraClick} // <-- Truyền hàm mở modal "Add"
          initialValues={{
            timestampStart: pageEnterISORef.current,
            mediaName: '0',
          }}
        />
      </div>
    </Modal>
  );
};