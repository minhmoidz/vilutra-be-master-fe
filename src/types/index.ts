// ==========================================
// 1. Types cho JOB & SEARCH (Port 5437)
// ==========================================

export interface Frame {
  id: string;
  imageUrl: string;
  frameTime: string;
}

export interface Job {
  jobId: string;
  type: string;
  status: string;
  imageUrl?: string;
  textValue?: string;
  createdAt: string;
  updatedAt?: string;
  errorMessage?: string;
  frames?: Frame[];
}

export interface PaginatedResponse {
  content: Job[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface SearchTextRequest {
  text: string;
  timestamp?: string;       // ISO String
  duration_seconds?: number;
  is_continue_search: boolean;
}

export interface SearchImageRequest {
  is_continue_search: boolean;
  timestamp?: string;       // ISO String
  duration_seconds?: number;
}

// ==========================================
// 2. Types cho UPLOAD / STORAGE (Port 8181)
// ==========================================

export interface VideoMetadata {
  video_id: string;
  camera_id: string;
  timestamp_start?: string;
  media_name?: string;
}

// ==========================================
// 3. Types cho CAMERA (Port 8181)
// ==========================================

/**
 * Interface đầy đủ trả về từ API GET
 */
export interface Camera {
  id?: string;            // ID nội bộ database (nếu có)
  camera_id: string;      // ID nghiệp vụ (unique)
  name: string;
  source_type: 'stream' | 'video' | string;
  
  stream_url?: string;    // Dùng nếu source_type = stream
  video_path?: string;    // Dùng nếu source_type = video
  
  location?: string;      // Tên địa điểm (text)
  lat?: number;           // Vĩ độ (Mới thêm)
  lon?: number;           // Kinh độ (Mới thêm)
  
  description?: string;
  is_active: boolean;
  config?: Record<string, any>; // JSON config tùy chỉnh
  
  created_at: string;
  updated_at: string;
}

/**
 * Dữ liệu khi TẠO MỚI Camera (POST)
 */
export interface NewCameraData {
  camera_id: string;
  name: string;
  source_type: 'stream' | 'video';
  
  stream_url?: string;
  video_path?: string;
  
  location?: string;
  lat?: number;           // Vĩ độ (Mới thêm)
  lon?: number;           // Kinh độ (Mới thêm)
  
  description?: string;
  is_active: boolean;
  config?: Record<string, any>;
}

/**
 * Dữ liệu khi CẬP NHẬT Camera (PUT)
 * (Thường không cho sửa camera_id)
 */
export type UpdateCameraData = Omit<NewCameraData, 'camera_id'>;

// ==========================================
// 4. Types cho STREAM (Port 8181)
// ==========================================

/**
 * Thông tin về Stream Job đang chạy
 */
export interface Stream {
  id?: string;
  job_id: string;
  camera_id: string;
  source_type: string;
  
  stream_url?: string;
  video_path?: string;
  
  status: 'RUNNING' | 'STOPPED' | 'FAILED' | string;
  config?: Record<string, any>;
  
  // Thống kê
  frames_processed: number;
  persons_detected: number;
  
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  error_message?: string;
  
  created_at: string;
  updated_at: string;
}