// 1. Types cho Job
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

export interface Frame {
  id: string;
  imageUrl: string;
  frameTime: string;
}

export interface PaginatedResponse {
  content: Job[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// 2. Types cho Upload
export interface VideoMetadata {
  video_id: string;
  camera_id: string;
  timestamp_start?: string;
  media_name?: string;
}

// 3. Types cho Search
export interface SearchTextRequest {
  text: string;
  timestamp?: string;
  duration_seconds?: number;
  is_continue_search: boolean;
}

export interface SearchImageRequest {
  is_continue_search: boolean;
  timestamp?: string;
  duration_seconds?: number;
}

// 4. Types cho Camera (ĐÃ CẬP NHẬT VÀ BỔ SUNG)

/**
 * Kiểu dữ liệu đầy đủ của Camera (từ API GET /api/v1/cameras/{camera_id})
 */
export interface Camera {
  id: string;
  camera_id: string;
  name: string;
  source_type: "stream" | "video" | string; // Mở rộng để chấp nhận string
  stream_url?: string;
  video_path?: string;
  location?: string;
  description?: string;
  is_active: boolean;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Kiểu dữ liệu để TẠO MỚI Camera (cho API POST)
 */
export interface NewCameraData {
  camera_id: string; // Bắt buộc khi tạo
  name: string;
  source_type: "stream" | "video";
  stream_url?: string;
  video_path?: string;
  location?: string;
  description?: string;
  is_active: boolean;
  config?: Record<string, any>;
}

/**
 * Kiểu dữ liệu để CẬP NHẬT Camera (cho API PUT)
 * (Không cho phép đổi camera_id)
 */
export type UpdateCameraData = Omit<NewCameraData, 'camera_id'>;


/**
 * Kiểu dữ liệu cho Stream (từ API GET /streams)
 */
export interface Stream {
  id: string;
  job_id: string;
  camera_id: string;
  source_type: string;
  stream_url?: string;
  video_path?: string;
  status: string;
  config?: Record<string, any>;
  frames_processed: number;
  persons_detected: number;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}