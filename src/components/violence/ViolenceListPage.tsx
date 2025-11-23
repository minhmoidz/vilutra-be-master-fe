import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Card, Table, Tag, Space, Button, Input, message, 
  Tooltip, InputNumber, Modal, Alert, Image, Popconfirm, DatePicker, List 
} from 'antd';
import { 
  SearchOutlined, CheckCircleOutlined, SyncOutlined, 
  EyeOutlined, DeleteOutlined, 
  ExclamationCircleOutlined, CheckCircleFilled 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

// Import Service
import { violenceApiService, VIOLENCE_BASE_URL } from '../../services/violenceApi.service';
import { apiService } from '../../services/api.service';
import type { ViolenceIncident, PersonClip } from '../../types/violence';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// --- 1. THÊM INTERFACE PROPS GIỐNG SEARCH PAGE ---
interface ViolencePageProps {
  onSuccess: (jobId: string) => void; // Callback để chuyển sang trang Detail
}

export const ViolenceListPage: React.FC<ViolencePageProps> = ({ onSuccess }) => {
  // KHÔNG DÙNG REACT-ROUTER-DOM

  // --- STATE ---
  const [data, setData] = useState<ViolenceIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCameraId, setSearchCameraId] = useState('');
  const [searchLimit, setSearchLimit] = useState<number>(100);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<ViolenceIncident | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedClipPath, setSelectedClipPath] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [isDeleteRangeModalOpen, setIsDeleteRangeModalOpen] = useState(false);
  const [deleteRangeCamId, setDeleteRangeCamId] = useState('');
  const [deleteRangeDates, setDeleteRangeDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getFullUrl = (relativePath: string) => {
    if (!relativePath) return '';
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return `${VIOLENCE_BASE_URL}/${cleanPath}`;
  };

  const fetchIncidents = useCallback(async (camId?: string, limitVal: number = 100) => {
    setLoading(true);
    try {
      const incidents = await violenceApiService.getIncidents(camId || undefined, limitVal);
      setData(incidents || []);
    } catch (error: any) {
      message.error('Lỗi tải danh sách: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents('', 100);
  }, [fetchIncidents]);

  const handleSearch = () => fetchIncidents(searchCameraId, searchLimit);

  const handleViewDetail = async (record: ViolenceIncident) => {
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setSelectedClipPath(null);
    try {
      const detail = await violenceApiService.getIncidentDetail(record.id);
      setSelectedIncident(detail);
    } catch (error: any) {
      message.error('Lỗi chi tiết: ' + error.message);
      setSelectedIncident(record);
    } finally {
      setDetailLoading(false);
    }
  };

  // --- [QUAN TRỌNG] LOGIC TÌM KIẾM ĐÃ ĐƯỢC CẬP NHẬT ---
  const handleSearchSelectedClip = async () => {
    if (!selectedClipPath) {
      message.warning('Vui lòng tích chọn một đối tượng ảnh bên dưới!');
      return;
    }

    setIsSearching(true);
    const key = 'search_msg';
    message.loading({ content: 'Đang xử lý ảnh và tạo Job...', key });

    try {
      const originalUrl = getFullUrl(selectedClipPath);
      // Xử lý Proxy để tránh lỗi CORS (Giữ nguyên logic của bạn)
      const fetchUrl = originalUrl.includes('10.3.9.18:9001')
        ? originalUrl.replace('http://10.3.9.18:9001', '/proxy-image')
        : originalUrl;

      // 1. Tải ảnh về Blob
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error('Không thể tải ảnh (Lỗi Proxy/CORS)');
      const blob = await res.blob();
      const file = new File([blob], "search_clip.jpg", { type: blob.type });

      // 2. Gọi API Search (Giống SearchPageAntd)
      const response = await apiService.searchByImage(
        file,
        new Date().toISOString(),
        60
      );

      // 3. Lấy Job ID (Sử dụng logic robust giống SearchPageAntd)
      const jobId = response?.jobId || response?.id || response?.data?.jobId || response?.data?.id || response?.job_id;

      if (jobId) {
        message.success({ content: 'Tạo Job thành công! Đang chuyển trang...', key });
        setIsDetailModalOpen(false); // Đóng modal chi tiết

        // --- GỌI CALLBACK onSuccess THAY VÌ RELOAD TRANG ---
        if (onSuccess) {
            onSuccess(jobId);
        } else {
            // Fallback nếu không truyền props (để tránh lỗi)
            window.location.href = `/?jobId=${jobId}`;
        }
        
      } else {
        console.error('API Response:', response);
        message.warning({ content: 'Không nhận được Job ID từ server.', key });
      }

    } catch (error: any) {
      console.error(error);
      message.error({ content: 'Lỗi: ' + error.message, key });
    } finally {
      setIsSearching(false);
    }
  };

  const handleReview = async (id: number) => {
    try {
      await violenceApiService.reviewIncident(id);
      message.success(`Đã xác nhận #${id}`);
      setData(prev => prev.map(item => item.id === id ? { ...item, is_reviewed: true } : item));
      if (selectedIncident?.id === id) setSelectedIncident({ ...selectedIncident, is_reviewed: true });
    } catch (e: any) { message.error(e.message); }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await violenceApiService.deleteIncident(id);
      message.success('Đã xóa');
      setData(prev => prev.filter(item => item.id !== id));
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (e: any) { message.error(e.message); }
  };

  const handleDeleteRangeSubmit = async () => {
    if (!deleteRangeCamId || !deleteRangeDates) {
        message.warning('Thiếu thông tin xóa');
        return;
    }
    const [start, end] = deleteRangeDates;
    setDeleteLoading(true);
    try {
        await violenceApiService.deleteIncidentsByTimeRange(deleteRangeCamId, start.toISOString(), end.toISOString());
        message.success('Đã xóa theo range');
        setIsDeleteRangeModalOpen(false);
        handleSearch();
    } catch(e:any) { message.error(e.message); }
    finally { setDeleteLoading(false); }
  };

  const columns: ColumnsType<ViolenceIncident> = [
    { title: 'ID', dataIndex: 'id', width: 80, align: 'center', render: id => <b>#{id}</b> },
    { title: 'Camera', dataIndex: 'camera_id', width: 120, render: t => <Tag color="blue">{t}</Tag> },
    { title: 'Thời gian', dataIndex: 'timestamp', width: 180, render: t => t ? dayjs(t).format('DD/MM/YYYY HH:mm:ss') : '-' },
    { 
      title: 'Ảnh Frame', dataIndex: 'image_path', width: 140, 
      render: p => p ? <Image src={getFullUrl(p)} width={100} height={60} style={{objectFit:'cover', borderRadius:4}}/> : '-' 
    },
    { 
      title: 'Trạng thái', dataIndex: 'is_reviewed', width: 120, align: 'center',
      render: r => <Tag color={r?'green':'volcano'}>{r?'Đã xử lý':'Mới'}</Tag>
    },
    {
      title: 'Hành động', key: 'action', align: 'right', width: 150,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={() => handleViewDetail(r)} />
          {!r.is_reviewed && <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleReview(r.id)} />}
          <Popconfirm title="Xóa?" onConfirm={() => handleDeleteItem(r.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{danger:true}}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0, color: '#cf1322' }}><ExclamationCircleOutlined /> Sự cố Bạo lực</Title>
        <Space>
           <Button danger icon={<DeleteOutlined />} onClick={() => setIsDeleteRangeModalOpen(true)}>Xóa Range</Button>
           <Button icon={<SyncOutlined />} loading={loading} onClick={handleSearch}>Làm mới</Button>
        </Space>
      </div>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Space>
           <Input placeholder="Camera ID..." value={searchCameraId} onChange={e=>setSearchCameraId(e.target.value)} style={{width:200}} onPressEnter={handleSearch}/>
           <InputNumber min={1} max={1000} value={searchLimit} onChange={v=>setSearchLimit(v||100)}/>
           <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>Tìm kiếm</Button>
        </Space>
      </Card>
      <Card bordered={false}>
         <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{x:1000}} />
      </Card>

      <Modal
        title={`Chi tiết sự cố #${selectedIncident?.id} - Cam: ${selectedIncident?.camera_id}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={900}
        centered
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
          <Button 
            key="search" type="primary" icon={<SearchOutlined />} 
            disabled={!selectedClipPath} loading={isSearching} 
            onClick={handleSearchSelectedClip}
            style={{ background: selectedClipPath ? '#1890ff' : undefined }}
          >
            {selectedClipPath ? 'Tìm kiếm đối tượng đã chọn' : 'Vui lòng chọn 1 ảnh đối tượng'}
          </Button>
        ]}
      >
        {detailLoading ? <div style={{textAlign:'center', padding:30}}>Loading...</div> : selectedIncident && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card title="1. Ảnh toàn cảnh" size="small" type="inner">
               <div style={{display:'flex', gap:16}}>
                 <Image src={getFullUrl(selectedIncident.image_path)} height={200} style={{borderRadius:4}} />
                 <div><Text type="secondary">Path:</Text><br/><Paragraph copyable code>{selectedIncident.image_path}</Paragraph></div>
               </div>
            </Card>
            <Card title={<span>2. Ảnh chi tiết ({selectedIncident.person_clips?.length || 0}) <span style={{fontWeight:'normal', fontSize:13, color:'#888', marginLeft: 8}}>(Tích vào ảnh bên dưới để tìm kiếm)</span></span>} size="small" type="inner">
              {!selectedIncident.person_clips?.length ? (
                <Alert message="Không có ảnh đối tượng." type="warning" />
              ) : (
                <List
                  grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 4 }}
                  dataSource={selectedIncident.person_clips}
                  renderItem={(clip: PersonClip) => {
                    const isSelected = selectedClipPath === clip.clip_path;
                    return (
                      <List.Item>
                        <div 
                           onClick={() => setSelectedClipPath(clip.clip_path)}
                           style={{ 
                             position: 'relative', cursor: 'pointer',
                             border: isSelected ? '3px solid #1890ff' : '1px solid #d9d9d9',
                             borderRadius: 8, padding: 4,
                             background: isSelected ? '#e6f7ff' : '#fff',
                             transition: 'all 0.2s'
                           }}
                        >
                           {isSelected && (
                             <div style={{ position: 'absolute', top: -10, right: -10, zIndex: 10, background: '#fff', borderRadius: '50%' }}>
                                <CheckCircleFilled style={{ fontSize: 24, color: '#1890ff' }} />
                             </div>
                           )}
                           <div style={{ textAlign: 'center', height: 120, display:'flex', alignItems:'center', justifyContent:'center', background:'#fafafa', borderRadius: 4 }}>
                              <Image src={getFullUrl(clip.clip_path)} height="100%" style={{ objectFit: 'contain', maxHeight: 110 }} preview={false} />
                           </div>
                           <div style={{ marginTop: 8, textAlign: 'center' }}>
                              <Tag color={isSelected ? "blue" : "default"}>ID: {clip.id}</Tag>
                           </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </div>
        )}
      </Modal>
      <Modal open={isDeleteRangeModalOpen} title="Xóa theo Range" onCancel={()=>setIsDeleteRangeModalOpen(false)} onOk={handleDeleteRangeSubmit} okButtonProps={{danger:true}} okText="Xóa">
          <Space direction="vertical" style={{width:'100%'}}>
             <Input placeholder="Cam ID" value={deleteRangeCamId} onChange={e=>setDeleteRangeCamId(e.target.value)}/>
             <RangePicker showTime style={{width:'100%'}} onChange={dates=>setDeleteRangeDates(dates as any)}/>
          </Space>
      </Modal>
    </div>
  );
};