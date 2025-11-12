
import { useState, useRef } from 'react';
import { Button, Input, Space, Tag, Tooltip, type InputRef } from 'antd';
import { 
    SearchOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    ClockCircleOutlined, 
    WarningOutlined, 
    SyncOutlined 
} from '@ant-design/icons';
import type {  ColumnType, ColumnsType } from 'antd/es/table';
import type { FilterConfirmProps } from 'antd/es/table/interface';
import { formatDate } from '../utils/dateFormat'; // <-- Check lại đường dẫn
import type { Job } from '../types'; // <-- Check lại đường dẫn
// import { Highlighter } from 'lucide-react';
import Highlighter from 'react-highlight-words';
import React from 'react';

// Định nghĩa kiểu dữ liệu
interface DataType extends Job {
  key: string;
}
type DataIndex = keyof DataType;

// --- Các hàm helper (được đóng gói trong hook) ---
const getAntdStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'PROCESSING': return 'blue';
    case 'FAILED': return 'error';
    case 'QUEUED': return 'default';
    default: return 'default';
  }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'COMPLETED': return <CheckCircleOutlined />;
        case 'PROCESSING': return <SyncOutlined spin />;
        case 'FAILED': return <CloseCircleOutlined />;
        case 'QUEUED': return <ClockCircleOutlined />;
        default: return <WarningOutlined />;
    }
};
// --- Kết thúc helper ---

/**
 * Hook tùy chỉnh để quản lý và trả về định nghĩa cột
 * cho bảng JobList, bao gồm logic tìm kiếm và lọc.
 */
export const useJobListColumns = (): ColumnsType<DataType> => {
  // --- State và Ref cho Tìm kiếm (chỉ tồn tại trong hook này) ---
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);

  // --- Hàm Helper cho Tìm kiếm ---
  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: DataIndex,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };

  // Hàm "thần thánh" tạo ra UI và logic search
  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<DataType> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button type="link" size="small" onClick={() => close()}>
            Close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    // Logic lọc (client-side)
    onFilter: (value, record) =>
      (record[dataIndex] ?? '')
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
    // Hàm render này sẽ highlight chữ
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      ),
  });
  // --- Kết thúc logic Search ---


  // --- Định nghĩa mảng Cột (Đây là giá trị hook trả về) ---
  const columns: ColumnsType<DataType> = [
    {
      title: 'Job ID',
      dataIndex: 'jobId',
      key: 'jobId',
      width: '15%',
      ...getColumnSearchProps('jobId'), // Áp dụng search
      ellipsis: true, // Tự động ...
      // Ghi đè lại hàm render để thêm Tooltip
      // (Chúng ta bọc hàm render của search bên trong Tooltip)
      render: (text: string, record: DataType, index: number) => {
        const searchRender = getColumnSearchProps('jobId').render;
        // Ensure content is always a valid ReactNode
        let content = searchRender ? searchRender(text, record, index) : text;
        // If content is an object with 'children', extract children (for RenderedCell)
        if (
          typeof content === 'object' &&
          content !== null &&
          'children' in content &&
          React.isValidElement(content.children)
        ) {
          content = content.children;
        }
        return <Tooltip title={text}></Tooltip>;
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      filters: [ // Lọc theo Type
        { text: 'SEARCH', value: 'SEARCH' },
        { text: 'UPLOAD', value: 'UPLOAD' }, 
      ],
      onFilter: (value, record) => record.type.startsWith(value as string),
      render: (type: string) => (
          <Tag color={type === 'SEARCH' ? 'geekblue' : 'purple'} className='font-medium'>
              {type}
          </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      filters: [ // Lọc theo Status
        { text: 'COMPLETED', value: 'COMPLETED' },
        { text: 'PROCESSING', value: 'PROCESSING' },
        { text: 'FAILED', value: 'FAILED' },
        { text: 'QUEUED', value: 'QUEUED' },
      ],
      onFilter: (value, record) => record.status.startsWith(value as string),
      render: (status: string) => (
        <Tag 
            color={getAntdStatusColor(status)} 
            icon={getStatusIcon(status)} 
            className="font-semibold text-sm"
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => formatDate(text),
      width: '25%',
      // Thêm sắp xếp
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (record: Job) => (
        <Button 
          type="link" 
          onClick={() => window.location.hash = `#/job/${record.jobId}`}
          className='font-medium'
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return columns; // Hook trả về mảng columns
};