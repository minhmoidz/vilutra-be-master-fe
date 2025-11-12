// File: src/components/common/ModalAntd.tsx

import React from 'react';
import { Modal as AntdModal } from 'antd'; // Đổi tên import để tránh xung đột với export


interface ModalAntdProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    loading?: boolean; // Nếu bạn muốn hiển thị loading bên trong modal
    width?: number | string; // Điều chỉnh kích thước
}

/**
 * Component Modal sử dụng Ant Design, thay thế cho Modal Tailwind CSS cơ bản.
 * Nó hỗ trợ căn giữa, nút đóng, và các thuộc tính tiêu chuẩn của Antd Modal.
 */
export const ModalAntd: React.FC<ModalAntdProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    loading = false,
    width = 520,
}) => {
    
    // Dùng AntdModal với các props tương đương
    return (
        <AntdModal
            // 1. Căn chỉnh và hiển thị
            open={isOpen} // Ant Design dùng 'open' thay vì 'visible' (hoặc 'isOpen')
            onCancel={onClose} // Sự kiện đóng Modal khi click nền hoặc nút 'X'
            centered // ✨ Quan trọng: Căn Modal ra giữa màn hình
            width={width} // Thiết lập chiều rộng (mặc định 520px)

            // 2. Nội dung Header/Footer
            title={<span className="text-xl font-semibold">{title}</span>} // Tiêu đề
            footer={null} // Ẩn Footer mặc định (thường chứa nút OK/Cancel)
            
            // 3. Hiệu ứng
            maskClosable={!loading} // Cho phép đóng khi click nền, trừ khi đang loading
            confirmLoading={loading} // Hiển thị trạng thái loading nếu cần
        >
            {/* Nội dung chính của Modal */}
            <div className="pt-4"> 
                {children}
            </div>
        </AntdModal>
    );
};