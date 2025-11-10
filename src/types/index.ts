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
  
  export interface VideoMetadata {
    video_id: string;
    camera_id: string;
    timestamp_start?: string;
    media_name?: string;
  }
  
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
  