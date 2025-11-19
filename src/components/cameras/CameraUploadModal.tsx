import React, { useState, useRef, useEffect } from 'react';
import { Modal, Form, message, notification } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import type { Camera, VideoMetadata } from '../../types';
import type { UploadProps } from 'antd';
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
  
  const pageEnterISORef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (open && camera) {
      const defaultVideoId = `${camera.camera_id}_${new Date().getTime()}`;
      
      form.setFieldsValue({
        videoId: defaultVideoId,
        timestampStart: pageEnterISORef.current,
        mediaName: '0',
      });
    } else if (!open) {
      form.resetFields();
      setVideoFile(null);
      pageEnterISORef.current = new Date().toISOString();
    }
  }, [open, camera, form]);

  const handleUpload = async (values: any) => {
    if (!videoFile) {
      message.error('Vui lòng chọn file video!');
      return;
    }
    
    if (!values.cameraId || !values.videoId) { 
      message.error('Vui lòng kiểm tra lại Camera ID và Video ID!');
      return;
    }

    setLoading(true);
    
    const metadata: VideoMetadata = {
      video_id: values.videoId,
      camera_id: values.cameraId,
      timestamp_start: values.timestampStart || pageEnterISORef.current,
      media_name: (values.mediaName ?? '').toString().trim() || '0',
    };

    notification.info({
      message: 'Đang Upload',
      description: `Đang upload video cho ${camera?.name || values.cameraId}...`,
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
      
      onSuccess(response); 
      
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

  const uploadProps: UploadProps = {
    accept: 'video/*',
    beforeUpload: (file: File) => {
      setVideoFile(file);
      return false;
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
      title={`Upload Video cho: ${camera?.name || 'Camera mới'}`}
      open={open}
      onCancel={onCancel}
      destroyOnClose
      footer={null} 
      width={640} 
    >
      <div style={{ paddingTop: '16px' }}>
        <VideoUploadForm
          form={form}
          loading={loading}
          onFinish={handleUpload}
          uploadProps={uploadProps}
          cameraList={cameraList} 
          cameraListLoading={cameraListLoading} 
          onAddNewCameraClick={onAddNewCameraClick} 
          initialValues={{
            cameraId: camera?.camera_id, 
            videoId: camera ? `${camera.camera_id}_${new Date().getTime()}` : undefined,
            timestampStart: pageEnterISORef.current,
            mediaName: '0',
          }}
          initialCameraId={camera?.camera_id} 
          initialCameraName={camera?.name} // Truyền tên để component con hiển thị
        />
      </div>
    </Modal>
  );
};