// File: src/components/jobs/JobDetailAntd.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card, Descriptions, Tag, Spin, Alert, Empty, message, Image, Tooltip, Divider, Button, Modal } from 'antd';
import { LoadingOutlined, VideoCameraOutlined, CalendarOutlined, InfoCircleOutlined, EnvironmentOutlined, ZoomInOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { formatDate } from '../../utils/dateFormat';
import { API_CONFIG } from '../../config/api.config';
import type { Job } from '../../types';

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

// Định nghĩa tọa độ camera
const CAMERA_POSITIONS = [
  { id: 1, lat: 21.0285, lng: 105.8542, label: 'CAM 1', address: 'Vị trí Camera 1' },
  { id: 2, lat: 21.0295, lng: 105.8552, label: 'CAM 2', address: 'Vị trí Camera 2' },
  { id: 3, lat: 21.0275, lng: 105.8547, label: 'CAM 3', address: 'Vị trí Camera 3' }, 
  { id: 4, lat: 21.0280, lng: 105.8557, label: 'CAM 4', address: 'Vị trí Camera 4' }, 
  { id: 5, lat: 21.0290, lng: 105.8537, label: 'CAM 5', address: 'Vị trí Camera 5' }, 
];

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
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const loadJobDetail = async () => {
    setLoading(true);
    try {
      const data = await apiService.getJobDetail(jobId);
      setJob(data);

      const shouldContinuePolling = data.status !== 'COMPLETED' && data.status !== 'FAILED';
      setIsPolling(shouldContinuePolling);

      if (shouldContinuePolling) {
        setTimeout(() => {
          loadJobDetail();
        }, API_CONFIG.POLL_INTERVAL);
      }
    } catch (error: any) {
      message.error('Lỗi khi tải job detail: ' + error.message);
      setIsPolling(false);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !job) return;

    const google = window.google;
    if (!google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 21.0285, lng: 105.8542 }, 
      zoom: 18, 
      mapTypeId: 'roadmap',
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
    });

    googleMapRef.current = map;

    markersRef.current.forEach((marker: any) => marker.setMap(null));
    markersRef.current = [];

    CAMERA_POSITIONS.forEach((camera) => {
      const cameraFrames = getFramesByCamera(camera.id);
      const hasFrames = cameraFrames.length > 0;

      const marker = new google.maps.Marker({
        position: { lat: camera.lat, lng: camera.lng },
        map: map,
        title: `${camera.label} - ${hasFrames ? `${cameraFrames.length} frames` : 'Không có frames'}`,
        label: {
          text: camera.id.toString(),
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: hasFrames ? 20 : 15,
          fillColor: hasFrames ? '#ef4444' : '#9ca3af',
          fillOpacity: hasFrames ? 1 : 0.6,
          strokeColor: 'white',
          strokeWeight: 3,
        },
        animation: hasFrames ? google.maps.Animation.BOUNCE : undefined,
      });

      if (hasFrames) {
        marker.addListener('click', () => {
          setSelectedCamera(camera.id);
          setModalVisible(true);
        });
      }

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-weight: bold;">${camera.label}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">${camera.address}</p>
            <p style="margin: 8px 0 0 0; color: ${hasFrames ? '#ef4444' : '#9ca3af'}; font-weight: bold;">
              ${hasFrames ? `📹 ${cameraFrames.length} frames` : '❌ Không có dữ liệu'}
            </p>
          </div>
        `,
      });

      marker.addListener('mouseover', () => {
        infoWindow.open(map, marker);
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });

  }, [mapLoaded, job]);

  useEffect(() => {
    loadJobDetail();
    return () => {
      setIsPolling(false);
      markersRef.current.forEach((marker: any) => marker.setMap(null));
    }
  }, [jobId]);

  const getFramesByCamera = (cameraId: number) => {
    if (!job?.frames) return [];
    return job.frames.filter((_, idx) => (idx % 5) + 1 === cameraId);
  };

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Đang tải chi tiết Job..." />
      </div>
    );
  }

  const selectedCameraFrames = selectedCamera ? getFramesByCamera(selectedCamera) : [];

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
                        {/* CẬP NHẬT: Ảnh Input to tự nhiên (w-full, h-auto) */}
                        <Image
                            src={job.imageUrl}
                            alt="Uploaded"
                            className="w-full h-auto rounded-lg border-2 border-indigo-100 shadow-md" 
                            preview={{ mask: "Xem ảnh lớn" }}
                            fallback="https://via.placeholder.com/600x400?text=Image+Not+Found"
                        />
                    </>
                )}
            </div>
          )}
          {job.errorMessage && (
            <Alert message="Lỗi xử lý" description={job.errorMessage} type="error" showIcon className="mt-6" />
          )}
        </Card>

        <Card 
            title={
                <span className="flex items-center gap-2 text-lg font-semibold">
                    <EnvironmentOutlined /> Bản đồ Camera (Google Maps)
                    {job.frames && job.frames.length > 0 && (
                        <Tag color="volcano" className="ml-2 font-medium">{job.frames.length} frames</Tag>
                    )}
                </span>
            } 
            className="mb-8 shadow-xl"
        >
          {!mapLoaded ? (
            <div className="flex justify-center items-center h-96"><Spin tip="Đang tải Google Maps..." /></div>
          ) : (
            <>
              <div ref={mapRef} className="w-full h-[600px] rounded-lg" style={{ minHeight: '600px' }} />
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <InfoCircleOutlined className="mr-2" />
                  <strong>Hướng dẫn:</strong> Bản đồ hiển thị khu vực chi tiết (zoom 18). Click vào marker camera để xem frames.
                </p>
              </div>
            </>
          )}
        </Card>

        {/* --- MODAL HIỂN THỊ FRAMES --- */}
        <Modal
          title={
            <div className="flex items-center justify-between pr-8 py-3">
              <span className="text-2xl font-bold flex items-center text-gray-800">
                <VideoCameraOutlined className="mr-3 text-indigo-600" />
                Camera {selectedCamera}
              </span>
              <Tag color="blue" className="text-lg px-4 py-1 rounded">
                {selectedCameraFrames.length} kết quả
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
          {selectedCameraFrames.length === 0 ? (
            <Empty description="Không có frames nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            // Grid 2 cột để ảnh có nhiều không gian
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar"> 
              {selectedCameraFrames.map((frame, index) => (
                <div 
                  key={frame.id}
                  className="group bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* CẬP NHẬT QUAN TRỌNG Ở ĐÂY:
                     - Xóa 'h-80'.
                     - Dùng 'w-full h-auto' để ảnh tự do giãn theo chiều cao thực tế.
                     - Đặt background gray để dễ nhìn viền.
                  */}
                  <div className="relative w-full h-auto bg-gray-100">
                    <Image
                      alt={`Frame ${index + 1}`}
                      src={frame.imageUrl}
                      // Class này giúp ảnh to hết cỡ, không bị crop
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
                    
                    {/* Badge thời gian */}
                    <div className="absolute top-4 right-4">
                        <div className="bg-black/70 text-white px-3 py-1 rounded-full backdrop-blur-md text-sm font-medium flex items-center gap-2">
                            <CalendarOutlined /> {formatDate(frame.frameTime)}
                        </div>
                    </div>
                  </div>

                  {/* Thông tin chi tiết */}
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