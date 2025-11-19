// File: src/components/jobs/JobDetailAntd.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card, Descriptions, Tag, Spin, Alert, Empty, message, Image, Button, Modal, Tooltip, Divider } from 'antd';
import { LoadingOutlined, VideoCameraOutlined, CalendarOutlined, InfoCircleOutlined, EnvironmentOutlined, ZoomInOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { formatDate } from '../../utils/dateFormat';
import { API_CONFIG } from '../../config/api.config';
import type { Job, Camera} from '../../types';

// Type definitions for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
}

// Key Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyAjJ3aT8qkpWtHVfb2AgWPlBtCUFU0EY4c';

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
  const [job, setJob] = useState<Job | null>(null);
  const [allCameras, setAllCameras] = useState<Camera[]>([]); 
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Tải dữ liệu
  const loadData = async () => {
    if (job && (job.status === 'COMPLETED' || job.status === 'FAILED') && allCameras.length > 0) {
        return;
    }

    try {
      if (!job) setLoading(true);

      const [jobData, camerasData] = await Promise.all([
        apiService.getJobDetail(jobId),
        allCameras.length === 0 ? apiService.getCameras() : Promise.resolve(allCameras)
      ]);

      setJob(jobData);
      if (allCameras.length === 0) {
          setAllCameras(camerasData);
      }

      const shouldContinuePolling = jobData.status !== 'COMPLETED' && jobData.status !== 'FAILED';
      setIsPolling(shouldContinuePolling);

      if (shouldContinuePolling) {
        setTimeout(loadData, API_CONFIG.POLL_INTERVAL);
      }
    } catch (error: any) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
      setIsPolling(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => setIsPolling(false);
  }, [jobId]);

  // 2. Load Maps Script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => message.error('Không thể tải Google Maps');
      document.head.appendChild(script);
    };
    loadGoogleMapsScript();
  }, []);

  // 3. Xử lý Map: LUÔN HIỂN THỊ TẤT CẢ CAMERA
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !job || allCameras.length === 0) return;

    const google = window.google;
    if (!google) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 21.0285, lng: 105.8542 },
        zoom: 13, // Zoom xa hơn chút để nhìn tổng quan
        mapTypeId: 'roadmap',
      });
    }

    const map = googleMapRef.current;

    // Xóa marker cũ
    markersRef.current.forEach((marker: any) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidCamera = false;

    // --- LOGIC MỚI ---
    // Duyệt qua TOÀN BỘ danh sách Camera có trong hệ thống
    allCameras.forEach((camera) => {
      // Bỏ qua nếu camera không có tọa độ hợp lệ
      if (!camera.lat || !camera.lon) return;
      
      hasValidCamera = true;
      const position = { lat: Number(camera.lat), lng: Number(camera.lon) };

      // Tìm xem trong Job hiện tại, Camera này có frame nào không
      const relatedFrames = job.frames 
        ? job.frames.filter((f: any) => (f.camera_id === camera.camera_id) || (f.cameraId === camera.camera_id))
        : [];
      
      const hasDetection = relatedFrames.length > 0;

      // Cấu hình Marker dựa trên việc có detect hay không
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: camera.name,
        // Nếu có detection thì hiện số lượng, không thì để trống hoặc hiện tên
        label: hasDetection ? {
          text: relatedFrames.length.toString(),
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        } : undefined,
        // Z-Index: Camera có kết quả thì nổi lên trên
        zIndex: hasDetection ? 100 : 1, 
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: hasDetection ? 18 : 10, // Có kết quả thì to hơn
          // Màu đỏ nếu có kết quả, Màu xám nếu không
          fillColor: hasDetection ? '#ef4444' : '#9ca3af', 
          fillOpacity: hasDetection ? 1 : 0.7,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        // Chỉ nhảy animation nếu có kết quả
        animation: hasDetection ? google.maps.Animation.DROP : undefined,
      });

      // Info Window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0; font-weight: bold; color: ${hasDetection ? '#ef4444' : 'black'}">${camera.name}</h3>
            <p style="margin: 4px 0 0; color: gray; font-size: 12px;">${camera.location || 'Chưa có vị trí cụ thể'}</p>
            <p style="margin: 4px 0 0; font-weight: bold;">
              ${hasDetection 
                ? `<span style="color: #ef4444">✅ Tìm thấy: ${relatedFrames.length} kết quả</span>` 
                : `<span style="color: #9ca3af">⚪ Không có kết quả</span>`
              }
            </p>
             ${hasDetection ? '<p style="margin: 4px 0 0; font-style: italic; font-size: 11px; color: blue;">(Click để xem chi tiết)</p>' : ''}
          </div>
        `,
      });

      marker.addListener('mouseover', () => infoWindow.open(map, marker));
      marker.addListener('mouseout', () => infoWindow.close());

      // Sự kiện Click
      marker.addListener('click', () => {
        if (hasDetection) {
          // Chỉ mở Modal nếu có detection
          setSelectedCameraId(camera.camera_id);
          setModalVisible(true);
        } else {
          // Nếu không có detection, có thể hiển thị thông báo nhỏ hoặc chỉ mở info window (đã mở khi hover)
          message.info(`Camera "${camera.name}" không ghi nhận kết quả nào trong Job này.`);
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Fit map để nhìn thấy tất cả các camera (kể cả không detect)
    if (hasValidCamera) {
      map.fitBounds(bounds);
      // Nếu zoom quá gần thì zoom out bớt
      const listener = google.maps.event.addListener(map, "idle", () => { 
        if (map.getZoom() > 18) map.setZoom(18); 
        google.maps.event.removeListener(listener); 
      });
    }

  }, [mapLoaded, job, allCameras]);

  const getSelectedCameraFrames = () => {
    if (!job?.frames || !selectedCameraId) return [];
    return job.frames.filter((f: any) => 
      (f.camera_id === selectedCameraId) || (f.cameraId === selectedCameraId)
    );
  };

  const selectedFrames = getSelectedCameraFrames();
  const currentCameraDetail = allCameras.find(c => c.camera_id === selectedCameraId);

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Đang tải chi tiết Job..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <Button
            type="link"
            onClick={onBack}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors px-0 mb-4 font-medium"
          >
            <ChevronLeft size={20} />
            Quay lại danh sách
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết Job ID: <span className="text-indigo-600">{jobId.substring(0, 8)}...</span></h1>
        </header>
        
        {(loading || isPolling) && job.status !== 'COMPLETED' && job.status !== 'FAILED' && (
            <Alert
                message="Đang Cập nhật Trạng thái"
                description={`Job đang ở trạng thái ${job.status}. Hệ thống đang tự động tải lại.`}
                type="info"
                showIcon
                className="mb-6"
                icon={<Spin indicator={<LoadingOutlined />} />}
            />
        )}

        {/* --- THÔNG TIN JOB --- */}
        <Card 
            title={<span className="flex items-center gap-2 text-lg font-semibold"><InfoCircleOutlined /> Tổng quan Job</span>} 
            className="mb-8 shadow-xl border-t-4 border-indigo-500"
        >
          <Descriptions bordered size="middle" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Job ID">
                <Tooltip title={job.jobId}><span className='font-mono text-sm'>{job.jobId.substring(0, 15)}...</span></Tooltip>
            </Descriptions.Item>
            <Descriptions.Item label="Loại Job">
                <Tag color={job.type === 'SEARCH' ? 'geekblue' : 'purple'} className='font-medium'>{job.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={getAntdStatusColor(job.status)} className="font-semibold text-sm">{job.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<span className="flex items-center gap-1"><CalendarOutlined /> Ngày tạo</span>}>
                {formatDate(job.createdAt)}
            </Descriptions.Item>
            {job.updatedAt && (
                <Descriptions.Item label="Cập nhật cuối">{formatDate(job.updatedAt)}</Descriptions.Item>
            )}
            <Descriptions.Item label="Giá trị tìm kiếm" span={job.imageUrl ? 1 : 3}>
                <div className='bg-gray-50 p-2 rounded border border-dashed text-gray-700 font-code'>
                    {job.textValue || '— Không có dữ liệu tìm kiếm —'}
                </div>
            </Descriptions.Item>
          </Descriptions>

          {(job.imageUrl || job.textValue) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
                <Divider orientation="left">Dữ liệu đầu vào</Divider>
                {job.imageUrl && (
                    <>
                        <p className="text-sm text-gray-500 mb-3 font-medium">Ảnh đã upload:</p>
                        <Image
                            src={job.imageUrl}
                            alt="Uploaded"
                            className="w-full h-auto rounded-lg border-2 border-indigo-100 shadow-md max-w-md" 
                            preview={{ mask: "Xem ảnh lớn" }}
                            fallback="https://via.placeholder.com/600x400?text=Image+Not+Found"
                        />
                    </>
                )}
            </div>
          )}
        </Card>

        {/* --- BẢN ĐỒ CAMERA (LUÔN HIỆN TẤT CẢ) --- */}
        <Card 
            title={
                <span className="flex items-center gap-2 text-lg font-semibold">
                    <EnvironmentOutlined /> Bản đồ Kết quả
                    {job.frames && job.frames.length > 0 && (
                        <Tag color="volcano" className="ml-2 font-medium">{job.frames.length} frames tìm thấy</Tag>
                    )}
                </span>
            } 
            className="mb-8 shadow-xl"
        >
          {!mapLoaded ? (
            <div className="flex justify-center items-center h-96"><Spin tip="Đang tải Google Maps..." /></div>
          ) : (
            <>
              <div ref={mapRef} className="w-full h-[600px] rounded-lg border border-gray-300" style={{ minHeight: '600px' }} />
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-col gap-2 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <InfoCircleOutlined /> <strong>Chú thích:</strong>
                  </div>
                  <div className="flex items-center gap-6 ml-6">
                     <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> 
                        <span>Camera có phát hiện (Click để xem)</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> 
                        <span>Camera không có phát hiện</span>
                     </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* --- MODAL HIỂN THỊ FRAMES --- */}
        <Modal
          title={
            <div className="flex items-center justify-between pr-8 py-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold flex items-center text-gray-800">
                  <VideoCameraOutlined className="mr-3 text-indigo-600" />
                  {currentCameraDetail ? currentCameraDetail.name : `Camera ${selectedCameraId}`}
                </span>
                <span className="text-xs text-gray-500 ml-9 font-normal">ID: {selectedCameraId}</span>
              </div>
              <Tag color="blue" className="text-lg px-4 py-1 rounded">
                {selectedFrames.length} kết quả
              </Tag>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={1400} 
          centered
          bodyStyle={{ padding: '24px', backgroundColor: '#f8fafc' }}
        >
          {selectedFrames.length === 0 ? (
            <Empty description="Không có frames nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar"> 
              {selectedFrames.map((frame, index) => (
                <div 
                  key={frame.id}
                  className="group bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative w-full h-auto bg-gray-100">
                    <Image
                      alt={`Frame ${index + 1}`}
                      src={frame.imageUrl}
                      className="w-full h-auto object-contain min-h-[200px]" 
                      fallback="https://via.placeholder.com/600x400?text=Image+Not+Found"
                      preview={{ 
                          mask: (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black/50">
                                <ZoomInOutlined style={{ fontSize: 64, color: 'white' }} />
                                <span className="text-3xl font-bold text-white uppercase tracking-widest drop-shadow-md">
                                    Phóng to
                                </span>
                            </div>
                          ),
                          src: frame.imageUrl 
                      }} 
                    />
                    
                    <div className="absolute top-4 right-4">
                        <div className="bg-black/70 text-white px-3 py-1 rounded-full backdrop-blur-md text-sm font-medium flex items-center gap-2">
                            <CalendarOutlined /> {formatDate(frame.frameTime)}
                        </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Frame ID</span>
                        <Tag color="cyan" className="text-base px-3 py-1">#{index + 1}</Tag>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="font-mono text-lg text-gray-800 break-all font-semibold">
                            {frame.id}
                        </span>
                    </div>
                    
                    <Button 
                        type="primary" 
                        ghost 
                        block 
                        size="large"
                        className="mt-6 h-12 text-lg font-medium flex items-center justify-center gap-2"
                    >
                        <InfoCircleOutlined /> Xem chi tiết đầy đủ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};