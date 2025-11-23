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

// --- [UPDATED] TYPES CHO SỰ CỐ (INCIDENT FRAMES) ---

export interface PersonClip {
  id: number;
  clip_path: string;
}

export interface ViolenceIncident {
  id: number;               // frame_id
  camera_id: string;
  timestamp: string;
  image_path: string;       // Thay thế video_path bằng image_path theo API mới
  is_reviewed: boolean;
  person_clips?: PersonClip[]; // Mảng clip cắt ra (có thể optional nếu list không trả về)
}