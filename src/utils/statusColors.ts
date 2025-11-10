export const getStatusColor = (status: string): string => {
  // Chuẩn hóa status sang chữ hoa để đảm bảo khớp
  const normalizedStatus = status ? status.toUpperCase() : 'UNKNOWN';

  const colors: Record<string, string> = {
      // Trạng thái thành công
      COMPLETED: 'bg-green-100 text-green-700 border border-green-400 font-medium rounded-full px-3 py-0.5',
      // Trạng thái đang xử lý
      PROCESSING: 'bg-blue-100 text-blue-700 border border-blue-400 font-medium rounded-full px-3 py-0.5 animate-pulse',
      // Trạng thái chờ
      PENDING: 'bg-yellow-100 text-yellow-700 border border-yellow-400 font-medium rounded-full px-3 py-0.5',
      // Trạng thái thất bại/lỗi
      FAILED: 'bg-red-100 text-red-700 border border-red-400 font-medium rounded-full px-3 py-0.5',
      // Trạng thái không xác định
      UNKNOWN: 'bg-gray-100 text-gray-700 border border-gray-400 font-medium rounded-full px-3 py-0.5',
  };

  return colors[normalizedStatus] || colors['UNKNOWN'];
};