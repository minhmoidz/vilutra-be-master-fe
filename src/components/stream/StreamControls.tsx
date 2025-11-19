// components/stream/StreamControls.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, message, Tooltip, Popconfirm } from 'antd';
import { PlayCircleOutlined, StopOutlined, LoadingOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service'; // Đường dẫn tới file service của bạn
import type { Camera } from '../../types';

// Interface cho dữ liệu Stream trả về từ API List
export interface StreamJob {
  job_id: string;
  camera_id: string;
  status: string;
  // thêm các field khác nếu có
}

// --- HOOK QUẢN LÝ DANH SÁCH STREAM (Dùng ở trang cha) ---
export const useStreamManager = () => {
  const [activeStreams, setActiveStreams] = useState<Record<string, string>>({}); // Map: camera_id -> job_id
  const [loadingStreams, setLoadingStreams] = useState<boolean>(false);

  const fetchActiveStreams = useCallback(async () => {
    setLoadingStreams(true);
    try {
      const list = await apiService.getStreamList();
      // Chuyển array thành map để tra cứu cho nhanh: { "cam_01": "job_abc", "cam_02": "job_xyz" }
      const map: Record<string, string> = {};
      
      // Lưu ý: Bạn cần kiểm tra cấu trúc trả về thực tế của API /list
      // Giả sử API trả về mảng object có { camera_id, job_id }
      if (Array.isArray(list)) {
        list.forEach((item: StreamJob) => {
          if (item.camera_id && item.job_id) {
            map[item.camera_id] = item.job_id;
          }
        });
      }
      setActiveStreams(map);
    } catch (error) {
      console.error("Lỗi tải danh sách stream", error);
    } finally {
      setLoadingStreams(false);
    }
  }, []);

  // Gọi danh sách khi hook được khởi tạo
  useEffect(() => {
    fetchActiveStreams();
    
    // Optional: Auto refresh status mỗi 10s
    const interval = setInterval(fetchActiveStreams, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveStreams]);

  const registerStream = (cameraId: string, jobId: string) => {
    setActiveStreams(prev => ({ ...prev, [cameraId]: jobId }));
  };

  const unregisterStream = (cameraId: string) => {
    setActiveStreams(prev => {
      const newState = { ...prev };
      delete newState[cameraId];
      return newState;
    });
  };

  return {
    activeStreams,
    loadingStreams,
    refreshStreams: fetchActiveStreams,
    registerStream,
    unregisterStream
  };
};

// --- COMPONENT NÚT BẤM (Dùng trong cột Action) ---
interface StreamActionButtonProps {
  camera: Camera;
  activeJobId?: string; // Nếu có job_id nghĩa là đang stream
  onStreamStarted: (cameraId: string, jobId: string) => void;
  onStreamStopped: (cameraId: string) => void;
}

export const StreamActionButton: React.FC<StreamActionButtonProps> = ({ 
  camera, 
  activeJobId, 
  onStreamStarted, 
  onStreamStopped 
}) => {
  const [loading, setLoading] = useState(false);
  const isStreaming = !!activeJobId;

  const handleStart = async () => {
    if (!camera.stream_url && !camera.video_path) {
      message.warning('Camera chưa có Stream URL hoặc Video Path');
      return;
    }

    setLoading(true);
    try {
      // Gọi API Start
      const payload = {
        camera_id: camera.camera_id,
        stream_url: camera.stream_url || camera.video_path || "", // Fallback
        config: camera.config || { additionalProp1: {} }
      };

      const res = await apiService.startStream(payload);
      
      // Giả sử res trả về { job_id: "..." } hoặc res chính là job_id
      const newJobId = res.job_id || res; 
      
      if (newJobId) {
        message.success(`Đã bật stream cho ${camera.name}`);
        onStreamStarted(camera.camera_id, newJobId);
      } else {
        message.warning('Không nhận được Job ID từ server');
      }
    } catch (error: any) {
      message.error(`Lỗi bật stream: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeJobId) return;

    setLoading(true);
    try {
      await apiService.stopStream(activeJobId);
      message.success(`Đã tắt stream của ${camera.name}`);
      onStreamStopped(camera.camera_id);
    } catch (error: any) {
      message.error(`Lỗi tắt stream: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isStreaming) {
    return (
      <Popconfirm
        title="Dừng Stream?"
        description="Bạn có chắc muốn dừng stream này không?"
        onConfirm={(e) => {
           e?.stopPropagation();
           handleStop();
        }}
        onCancel={(e) => e?.stopPropagation()}
        okText="Dừng"
        cancelText="Không"
      >
        <Button 
          danger
          size="small" 
          icon={loading ? <LoadingOutlined /> : <StopOutlined />} 
          loading={loading}
          onClick={(e) => e.stopPropagation()} // Ngăn click vào dòng
        >
          Stop
        </Button>
      </Popconfirm>
    );
  }

  return (
    <Tooltip title="Bắt đầu Stream">
      <Button 
        type="primary" 
        ghost
        size="small" 
        icon={loading ? <LoadingOutlined /> : <PlayCircleOutlined />} 
        loading={loading}
        onClick={(e) => {
          e.stopPropagation();
          handleStart();
        }}
        disabled={!camera.is_active} // Disable nếu camera đang inactive
      >
        Start
      </Button>
    </Tooltip>
  );
};