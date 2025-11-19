// src/types/violence.ts

export interface ViolenceCamera {
  camera_id: string;
  url: string;
  id: number;
  is_active: boolean;       // Trạng thái camera (bật/tắt)
  is_detection?: boolean;   // Trạng thái lúc đăng ký
  last_run?: string;        // Thời gian chạy lần cuối
}

export interface RegisterViolenceCameraReq {
  camera_id: string;
  url: string;
  is_detection: boolean;
}

export interface UpdateViolenceCameraReq {
  camera_id: string;
  url: string;
  is_active: boolean;
}

// --- [MỚI] TYPES CHO SỰ CỐ BẠO LỰC ---
export interface ViolenceIncident {
  id: number;
  camera_id: string;
  timestamp: string;
  video_path: string;
  is_reviewed: boolean;
}