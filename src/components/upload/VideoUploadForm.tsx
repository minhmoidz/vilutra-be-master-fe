import React from 'react';
import { Form, Input, Button, Upload, Divider, Card, Spin, Select, Space } from 'antd';
import { UploadOutlined, VideoCameraOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormInstance, UploadProps } from 'antd';
import type { Camera } from '../../types';

const { Option } = Select;

// Props mà Form này cần
interface VideoUploadFormProps {
    form: FormInstance;
    loading: boolean;
    onFinish: (values: any) => void;
    uploadProps: UploadProps;
    cameraList: Camera[];
    cameraListLoading: boolean;
    onAddNewCameraClick: () => void;
    initialValues: {
        cameraId?: string;
        videoId?: string;
        timestampStart: string;
        mediaName: string;
    };
    initialCameraId?: string; 
    initialCameraName?: string; // Nhận tên camera để hiển thị
}

export const VideoUploadForm: React.FC<VideoUploadFormProps> = ({
    form,
    loading,
    onFinish,
    uploadProps,
    cameraList,
    cameraListLoading,
    onAddNewCameraClick,
    initialValues,
    initialCameraId,
    initialCameraName, 
}) => {

    const handleCameraChange = (selectedCameraId: string) => {
        
        const newVideoId = `${selectedCameraId}_${new Date().getTime()}`;
        
        form.setFieldsValue({
            videoId: newVideoId,
            cameraId: selectedCameraId
        });
    };

    const isCameraIdDisabled = !!initialCameraId;

    // Tạo chuỗi hiển thị thân thiện (Tên (ID)) cho trường bị khóa
    const displayCameraInfo = isCameraIdDisabled 
        ? `${initialCameraName || '— Không có tên —'} (ID: ${initialCameraId})` 
        : "";

    return (
        <Card className="shadow-lg">
            <Spin spinning={loading} tip="Đang upload, vui lòng không rời khỏi trang...">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="space-y-4"
                    initialValues={initialValues}
                >
                    {/* 1. File Upload */}
                    <Form.Item label="Chọn video" required>
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>Chọn file video</Button>
                        </Upload>
                    </Form.Item>

                    <Divider orientation="left">Thông tin Video</Divider>

                    {/* 2. Video ID */}
                    <Form.Item
                        label="Video ID"
                        name="videoId"
                        rules={[{ required: true, message: 'Vui lòng nhập Video ID!' }]}
                        tooltip="Sẽ tự động điền khi bạn chọn Camera ID"
                    >
                        <Input placeholder="ID duy nhất của video (tự động điền)" />
                    </Form.Item>

                    {/* 3. Camera ID (Hiển thị tên khi bị khóa) */}
                    <Form.Item
                        label="Camera ID"
                        name="cameraId"
                        rules={[{ required: true, message: 'Vui lòng chọn Camera ID!' }]}
                    >
                        {isCameraIdDisabled ? (
                            // Hiển thị Input chỉ đọc khi đã chọn camera từ bảng
                            <Input
                                value={displayCameraInfo}
                                disabled
                                // Giá trị thực sự của cameraId vẫn nằm trong FormItem và được gửi đi
                            />
                        ) : (
                            // Hiển thị Select với nút + khi chưa khóa
                            <Space.Compact style={{ width: '100%' }}>
                                <Select
                                    placeholder={cameraListLoading ? "Đang tải camera..." : "Chọn Camera (sẽ tự fill Video ID)"}
                                    loading={cameraListLoading}
                                    showSearch
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    onChange={handleCameraChange}
                                >
                                    {cameraList.map((cam) => (
                                        <Option key={cam.camera_id} value={cam.camera_id}>
                                            {cam.name} (ID: {cam.camera_id})
                                        </Option>
                                    ))}
                                </Select>
                                <Button 
                                    icon={<PlusOutlined />} 
                                    onClick={onAddNewCameraClick} 
                                    title="Thêm camera mới" 
                                />
                            </Space.Compact>
                        )}
                    </Form.Item>

                    {/* 4. Timestamp Start */}
                    <Form.Item
                        label="Timestamp Start (ISO 8601)"
                        name="timestampStart"
                        tooltip="Mặc định là thời điểm bạn mở trang này (ISO 8601). Bạn có thể chỉnh lại nếu cần."
                        rules={[
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    const isValid = !isNaN(Date.parse(value));
                                    return isValid
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('Không đúng định dạng ISO 8601'));
                                },
                            },
                        ]}
                    >
                        <Input placeholder="VD: 2025-11-10T15:30:00Z (để trống sẽ dùng thời điểm mở trang)" />
                    </Form.Item>

                    {/* 5. Media Name */}
                    <Form.Item
                        label="Media Name"
                        name="mediaName"
                        tooltip='Nếu để trống, hệ thống sẽ dùng "0".'
                    >
                        <Input placeholder='Tên hiển thị (optional, mặc định "0")' />
                    </Form.Item>

                    {/* 6. Nút Submit */}
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={loading}
                        icon={<VideoCameraOutlined />}
                    >
                        Bắt đầu Upload
                    </Button>
                </Form>
            </Spin>
        </Card>
    );
};