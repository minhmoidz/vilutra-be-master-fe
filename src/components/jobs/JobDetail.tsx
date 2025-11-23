import React, { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server'; // Dùng để biến Icon Antd thành HTML cho Map
import { 
  Card, Descriptions, Tag, Spin, Alert, Empty, message, 
  Image, Tooltip, Divider, Button, Modal 
} from 'antd';
import { 
  LoadingOutlined, VideoCameraOutlined, VideoCameraFilled, 
  CalendarOutlined, InfoCircleOutlined, EnvironmentOutlined, 
  SearchOutlined, LeftOutlined 
} from '@ant-design/icons';

// --- IMPORT LEAFLET ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- SERVICE & CONFIG ---
import { apiService } from '../../services/api.service';
import { formatDate } from '../../utils/dateFormat';
import { API_CONFIG } from '../../config/api.config';
import type { Job } from '../../types';

// --- CẤU HÌNH VỊ TRÍ CAMERA ---
const CAMERA_POSITIONS = [
  { id: 'cam_01', lat: 21.0285, lng: 105.8542, label: 'CAM 1', address: 'Vị trí Camera 1' },
  { id: 'cam_02', lat: 21.0285, lng: 105.8552, label: 'CAM 2', address: 'Vị trí Camera 2' },
  { id: 'cam_03', lat: 21.0275, lng: 105.8542, label: 'CAM 3', address: 'Vị trí Camera 3' },
  { id: 'cam_04', lat: 21.0265, lng: 105.8552, label: 'CAM 4', address: 'Vị trí Camera 4' },
  { id: 'cam_05', lat: 21.0265, lng: 105.8538, label: 'CAM 5', address: 'Vị trí Camera 5' },
];

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
}

// --- HÀM TẠO ICON ANT DESIGN CHO LEAFLET ---
const createAntdMarker = (Component: React.ReactNode, isBlinking: boolean) => {
  const iconHtml = renderToStaticMarkup(Component);
  return new L.DivIcon({
    className: 'custom-antd-marker', // Class này dùng để reset style mặc định
    html: `
      <div class="${isBlinking ? 'blinking-wrapper' : ''}" style="display: flex; justify-content: center; align-items: center;">
        ${iconHtml}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// 1. Icon ĐỎ (Có dữ liệu - Nhấp nháy)
const activeIcon = createAntdMarker(
  <VideoCameraFilled style={{ color: '#ff4d4f', fontSize: '32px', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }} />,
  true
);

// 2. Icon XÁM (Không dữ liệu - Tĩnh)
const inactiveIcon = createAntdMarker(
  <VideoCameraFilled 
    style={{ 
      color: '#52c41a', // <--- MÀU XANH Ở ĐÂY
      fontSize: '28px', // Tăng size lên một chút cho dễ nhìn
      filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.2))' // Thêm chút bóng nhẹ cho đẹp
    }} 
  />,
  false // false nghĩa là không nhấp nháy
);

const getAntdStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'PROCESSING': return 'processing';
    case 'FAILED': return 'error';
    case 'QUEUED': return 'default';
    default: return 'default';
  }
};

export const JobDetailAntd: React.FC<JobDetailProps> = ({ jobId, onBack }) => {
  // --- STATE ---
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  // --- LOGIC ---
  const getFramesByCamera = (cameraId: string) => {
    if (!job?.frames) return [];
    return job.frames.filter((f) => f.cameraId === cameraId);
  };

  const loadJobDetail = async () => {
    setLoading(true);
    try {
      const data = await apiService.getJobDetail(jobId);
      setJob(data);

      const shouldContinuePolling = data.status !== 'COMPLETED' && data.status !== 'FAILED';
      setIsPolling(shouldContinuePolling);

      if (shouldContinuePolling) {
        setTimeout(() => loadJobDetail(), API_CONFIG.POLL_INTERVAL);
      }
    } catch (error: any) {
      message.error('Lỗi khi tải job detail: ' + error.message);
      setIsPolling(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByFrame = async (frameUrl: string) => {
    if (!frameUrl) return;

    setIsCreatingJob(true);
    const msgKey = 'create_job_msg';
    message.loading({ content: 'Đang xử lý ảnh và tạo Job tìm kiếm...', key: msgKey });

    try {
      // Fix lỗi CORS nếu ảnh từ server nội bộ
      const proxyUrl = frameUrl.includes('10.3.9.18:9001')
        ? frameUrl.replace('http://10.3.9.18:9001', '/proxy-image')
        : frameUrl;

      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Không thể tải ảnh frame (Lỗi CORS/Proxy)');
      const blob = await res.blob();
      const file = new File([blob], "frame_search.jpg", { type: blob.type });

      const response = await apiService.searchByImage(
        file, 
        new Date().toISOString(), 
        60
      );

      const newJobId = response?.jobId || response?.id || response?.data?.jobId;

      if (newJobId) {
        message.success({ content: 'Tạo Job thành công! Đang chuyển hướng...', key: msgKey });
        setModalVisible(false);
        // Reload lại trang với Job ID mới
        setTimeout(() => {
           window.location.href = `/?new_job_id=${newJobId}`;
        }, 800);
      } else {
        message.warning({ content: 'Không nhận được Job ID từ server.', key: msgKey });
      }

    } catch (error: any) {
      console.error(error);
      message.error({ content: 'Lỗi: ' + error.message, key: msgKey });
    } finally {
      setIsCreatingJob(false);
    }
  };

  useEffect(() => {
    loadJobDetail();
    return () => { setIsPolling(false); };
  }, [jobId]);

  if (!job) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Đang tải chi tiết Job..." />
      </div>
    );
  }

  const selectedCameraFrames = selectedCamera ? getFramesByCamera(selectedCamera) : [];
  const selectedCameraInfo = CAMERA_POSITIONS.find(c => c.id === selectedCamera);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px' }}>
      {/* --- CSS CHO LEAFLET & ANIMATION --- */}
      <style>
        {`
          /* Animation nhấp nháy cho Icon Antd */
          @keyframes antd-pulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 77, 79, 0.4)); }
            50% { transform: scale(1.2); filter: drop-shadow(0 0 12px rgba(255, 77, 79, 0.8)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 77, 79, 0.4)); }
          }
          .blinking-wrapper {
            animation: antd-pulse 1.5s infinite ease-in-out;
          }
          /* Xóa style mặc định của Leaflet DivIcon */
          .custom-antd-marker {
            background: transparent !important;
            border: none !important;
          }
        `}
      </style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <Button type="link" onClick={onBack} icon={<LeftOutlined />} style={{ paddingLeft: 0, fontSize: 16 }}>
             Quay lại danh sách
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>
                Chi tiết Job: <span style={{ color: '#1890ff' }}>{jobId.substring(0, 8)}...</span>
             </h1>
             <Tag color={getAntdStatusColor(job.status)} style={{ fontSize: 14, padding: '4px 10px' }}>
                {job.status}
             </Tag>
          </div>
        </div>

        {/* POLLING ALERT */}
        {(loading || isPolling) && job.status !== 'COMPLETED' && job.status !== 'FAILED' && (
           <Alert 
             message="Đang xử lý..." 
             description={`Job đang chạy. Hệ thống đang tự động cập nhật kết quả.`} 
             type="info" showIcon style={{ marginBottom: 24 }}
             icon={<Spin indicator={<LoadingOutlined spin />} />} 
           />
        )}

        {/* INFO CARD */}
        <Card title={<span><InfoCircleOutlined /> Tổng quan Job</span>} style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
           <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Job ID"><span style={{fontFamily:'monospace'}}>{job.jobId}</span></Descriptions.Item>
              <Descriptions.Item label="Loại"><Tag color={job.type === 'SEARCH' ? 'blue' : 'purple'}>{job.type}</Tag></Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{formatDate(job.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Từ khóa" span={3}>
                  {job.textValue || <span style={{color:'#ccc'}}>Không có text</span>}
              </Descriptions.Item>
           </Descriptions>
           {job.imageUrl && (
              <div style={{ marginTop: 24 }}>
                 <Divider orientation="left" style={{fontSize: 14, color:'#888'}}>Ảnh đầu vào</Divider>
                 <Image src={job.imageUrl} height={150} style={{borderRadius: 8, border: '1px solid #eee'}} />
              </div>
           )}
           {job.errorMessage && <Alert message={job.errorMessage} type="error" showIcon style={{ marginTop: 16 }} />}
        </Card>

        {/* MAP CARD */}
        <Card 
           title={<span><EnvironmentOutlined /> Bản đồ Camera (OpenStreetMap)</span>}
           extra={job.frames?.length ? <Tag color="volcano">{job.frames.length} kết quả tìm thấy</Tag> : null}
           style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
           bodyStyle={{ padding: 0 }} // Full width map
        >
           <div style={{ height: 600, width: '100%', position: 'relative' }}>
              <MapContainer center={[21.0285, 105.8542]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {CAMERA_POSITIONS.map((camera) => {
                      const cameraFrames = getFramesByCamera(camera.id);
                      const hasFrames = cameraFrames.length > 0;
                      return (
                          <Marker 
                              key={camera.id}
                              position={[camera.lat, camera.lng]}
                              icon={hasFrames ? activeIcon : inactiveIcon}
                              eventHandlers={{
                                  click: () => {
                                      if (hasFrames) {
                                          setSelectedCamera(camera.id);
                                          setModalVisible(true);
                                      }
                                  }
                              }}
                          >
                              <Popup>
                                  <strong>{camera.label}</strong><br/>
                                  {camera.address}<br/>
                                  {hasFrames ? 
                                     <span style={{color:'#ff4d4f'}}>Có {cameraFrames.length} kết quả</span> : 
                                     <span style={{color:'#59c76cff'}}>Không có dữ liệu</span>
                                  }
                              </Popup>
                          </Marker>
                      );
                  })}
              </MapContainer>
              
              {/* Legend Box */}
              <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <div style={{display:'flex', alignItems:'center', marginBottom: 4}}>
                     <VideoCameraFilled style={{color:'#ff4d4f', marginRight: 8, fontSize: 16}} /> 
                     <span style={{fontSize: 12, fontWeight: 600}}>Có dữ liệu (Click để xem)</span>
                  </div>
                  <div style={{display:'flex', alignItems:'center'}}>
                     <VideoCameraOutlined style={{color:'#8c8c8c', marginRight: 8, fontSize: 16}} /> 
                     <span style={{fontSize: 12, color: '#666'}}>Không có dữ liệu</span>
                  </div>
              </div>
           </div>
        </Card>

        {/* MODAL DANH SÁCH FRAMES */}
        <Modal
           title={<span><VideoCameraFilled style={{marginRight:8}} /> Kết quả tại {selectedCameraInfo?.label}</span>}
           open={modalVisible}
           onCancel={() => setModalVisible(false)}
           footer={null}
           width={900}
           centered
        >
           {selectedCameraFrames.length === 0 ? <Empty /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                 {selectedCameraFrames.map((frame, idx) => (
                    <Card 
                       key={idx} 
                       hoverable 
                       size="small"
                       cover={
                          <div style={{height: 120, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'#000'}}>
                             <Image src={frame.imageUrl} height="100%" style={{objectFit:'contain'}} />
                          </div>
                       }
                       actions={[
                          <Tooltip title="Dùng ảnh này để tìm kiếm tiếp">
                             <Button type="link" icon={<SearchOutlined />} loading={isCreatingJob} onClick={() => handleSearchByFrame(frame.imageUrl)}>
                                Tìm kiếm
                             </Button>
                          </Tooltip>
                       ]}
                    >
                       <Card.Meta 
                        
                          description={<span style={{fontSize:12}}><CalendarOutlined/> {formatDate(frame.frameTime)}</span>} 
                       />
                    </Card>
                 ))}
              </div>
           )}
        </Modal>
      </div>
    </div>
  );
};