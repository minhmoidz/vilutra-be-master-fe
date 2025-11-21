import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card, Descriptions, Tag, Spin, Alert, Empty, message, Image, Tooltip, Divider, Button, Modal } from 'antd';
import { LoadingOutlined, VideoCameraOutlined, CalendarOutlined, InfoCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
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

// Định nghĩa tọa độ camera (latitude, longitude)
const CAMERA_POSITIONS = [
  { id: 1, lat: 21.0285, lng: 105.8542, label: 'CAM 1', address: 'Vị trí Camera 1' },
  { id: 2, lat: 21.0295, lng: 105.8552, label: 'CAM 2', address: 'Vị trí Camera 2' },
  { id: 3, lat: 21.0275, lng: 105.8532, label: 'CAM 3', address: 'Vị trí Camera 3' },
  { id: 4, lat: 21.0265, lng: 105.8562, label: 'CAM 4', address: 'Vị trí Camera 4' },
  { id: 5, lat: 21.0255, lng: 105.8522, label: 'CAM 5', address: 'Vị trí Camera 5' },
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

  // Load Google Maps Script
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

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !job) return;

    const google = window.google;
    if (!google) return;

    // Khởi tạo map (trung tâm Hà Nội)
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 21.0285, lng: 105.8542 },
      zoom: 15,
      mapTypeId: 'roadmap',
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
    });

    googleMapRef.current = map;

    // Xóa markers cũ
    markersRef.current.forEach((marker: any) => marker.setMap(null));
    markersRef.current = [];

    // Thêm markers cho mỗi camera
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

      // Click event
      if (hasFrames) {
        marker.addListener('click', () => {
          setSelectedCamera(camera.id);
          setModalVisible(true);
        });
      }

      // Info window
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

    // Điều chỉnh zoom để hiện tất cả markers
    const bounds = new google.maps.LatLngBounds();
    CAMERA_POSITIONS.forEach(camera => {
      bounds.extend({ lat: camera.lat, lng: camera.lng });
    });
    map.fitBounds(bounds);

  }, [mapLoaded, job]);

  useEffect(() => {
    loadJobDetail();
    
    return () => {
      setIsPolling(false);
      markersRef.current.forEach((marker: any) => marker.setMap(null));
    }
  }, [jobId]);

  // Lọc frames theo camera được chọn
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
        {/* Header and Back Button */}
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
        
        {/* Polling/Loading Indicator */}
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

        {/* Job Information Card */}
        <Card 
            title={
                <span className="flex items-center gap-2 text-lg font-semibold">
                    <InfoCircleOutlined /> Tổng quan Job
                </span>
            } 
            className="mb-8 shadow-xl border-t-4 border-indigo-500"
        >
          <Descriptions bordered size="middle" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Job ID">
                <Tooltip title={job.jobId}>
                    <span className='font-mono text-sm'>{job.jobId.substring(0, 15)}...</span>
                </Tooltip>
            </Descriptions.Item>
            <Descriptions.Item label="Loại Job">
                <Tag color={job.type === 'SEARCH' ? 'geekblue' : 'purple'} className='font-medium'>
                    {job.type}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={getAntdStatusColor(job.status)} className="font-semibold text-sm">
                {job.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={
              <span className="flex items-center gap-1">
                  <CalendarOutlined /> Ngày tạo
              </span>
          }>
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

          {/* Image Preview / Input Data */}
          {(job.imageUrl || job.textValue) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
                <Divider orientation="left">Dữ liệu đầu vào</Divider>
                {job.imageUrl && (
                    <>
                        <p className="text-sm text-gray-500 mb-2 font-medium">Ảnh đã upload:</p>
                        <Image
                            width={400}
                            src={job.imageUrl}
                            alt="Uploaded"
                            className="rounded-lg border shadow-sm"
                            preview={{ mask: "Xem ảnh lớn" }}
                            fallback="https://via.placeholder.com/400x300?text=Image+Not+Found"
                        />
                    </>
                )}
            </div>
          )}

          {/* Error Message */}
          {job.errorMessage && (
            <Alert
              message="Lỗi xử lý"
              description={job.errorMessage}
              type="error"
              showIcon
              className="mt-6"
            />
          )}
        </Card>

        {/* Google Map with Camera Locations */}
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
            <div className="flex justify-center items-center h-96">
              <Spin tip="Đang tải Google Maps..." />
            </div>
          ) : (
            <>
              <div 
                ref={mapRef} 
                className="w-full h-[600px] rounded-lg"
                style={{ minHeight: '600px' }}
              />
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <InfoCircleOutlined className="mr-2" />
                  <strong>Hướng dẫn:</strong> Click vào marker camera (có animation bounce) để xem frames. 
                  Hover vào marker để xem thông tin chi tiết.
                </p>
              </div>
            </>
          )}
        </Card>

        {/* Modal hiển thị frames của camera được chọn */}
        <Modal
          title={
            <span className="text-lg font-semibold">
              <VideoCameraOutlined className="mr-2" />
              Frames từ {selectedCamera ? `CAM ${selectedCamera}` : ''}
            </span>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={1000}
          centered
        >
          {selectedCameraFrames.length === 0 ? (
            <Empty description="Không có frames nào" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-4">
              {selectedCameraFrames.map((frame, index) => (
                <Card
                  key={frame.id}
                  hoverable
                  cover={
                    <Image
                      alt={`Frame ${index + 1}`}
                      src={frame.imageUrl}
                      className="w-full h-40 object-cover"
                      fallback="https://via.placeholder.com/200x150?text=Image+Not+Found"
                    />
                  }
                  className="rounded-lg"
                >
                  <Card.Meta
                    description={
                      <div className="text-xs">
                        <p className="font-mono text-gray-600">ID: {frame.id.substring(0, 8)}...</p>
                        <p className="text-gray-500 mt-1">
                          <CalendarOutlined className="mr-1" />
                          {formatDate(frame.frameTime)}
                        </p>
                      </div>
                    }
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