// File: src/components/jobs/JobDetailAntd.tsx (PHIÊN BẢN NÂNG CẤP UI)

import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card, Descriptions, Tag, Spin, Alert, Empty, message, Image, Tooltip, Divider,Button } from 'antd'; // Thêm Image, Tooltip, Divider
import { LoadingOutlined, FileSearchOutlined, VideoCameraOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { apiService } from '../../services/api.service';
import { formatDate } from '../../utils/dateFormat';
import { API_CONFIG } from '../../config/api.config';
import type { Job } from '../../types';

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
}

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
    loadJobDetail();
    
    return () => {
        setIsPolling(false);
    }
  }, [jobId]);

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Đang tải chi tiết Job..." />
      </div>
    );
  }

  // --- JSX Rendering ---
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

        {/* Frames Section */}
        <Card 
            title={
                <span className="flex items-center gap-2 text-lg font-semibold">
                    <VideoCameraOutlined /> Kết quả Phân tích (Frames)
                    {job.frames && job.frames.length > 0 && (
                        <Tag color="volcano" className="ml-2 font-medium">{job.frames.length} frames tìm thấy</Tag>
                    )}
                </span>
            } 
            className="shadow-xl"
        >
          {!job.frames || job.frames.length === 0 ? (
            <Empty
              description={
                job.status === 'PROCESSING' ? (
                  <span className="text-indigo-600 animate-pulse">Đang xử lý, vui lòng chờ...</span>
                ) : (
                  'Chưa có frames nào được tìm thấy.'
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {job.frames.map((frame, index) => (
                <Card
                  key={frame.id}
                  hoverable
                  cover={
                    <div className="relative">
                      <Image
                        alt={`Frame ${index + 1}`}
                        src={frame.imageUrl}
                        className="w-full h-52 object-cover"
                        fallback="https://via.placeholder.com/200x150?text=Image+Not+Found"
                        preview={{ mask: "Zoom" }}
                      />
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-medium">
                        #{index + 1}
                      </div>
                    </div>
                  }
                  className="rounded-lg overflow-hidden"
                >
                  <Card.Meta
                    title={`Frame ID: ${frame.id.substring(0, 8)}...`}
                    description={
                        <p className='text-xs text-gray-500'>
                            <CalendarOutlined className='mr-1' /> {formatDate(frame.frameTime)}
                        </p>
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};