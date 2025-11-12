// File: src/services/api.service.ts

// 1. IMPORT CẤU HÌNH VÀ TYPES
import { API_CONFIG } from '../config/api.config';
import {  } from '../types';

// 2. ĐỊNH NGHĨA CLASS DỊCH VỤ
class ApiService {
  /**
   * Hàm gọi API chung, dùng cho các request/response JSON
   */
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };
    if (config.headers && options.headers) {
      config.headers = { ...config.headers, ...options.headers };
    }

    try {
      console.info('apiCall ->', { url, config });
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        const msg = `Lỗi Mạng/CORS khi gọi ${url}: ${error.message}`;
        console.error('API call error (TypeError):', msg, error);
        throw new Error(msg);
      }
      throw error;
    }
  }

  /**
   * "Dọn dẹp" dữ liệu Job trả về từ API (snake_case -> camelCase và xử lý date)
   */
  private normalizeJob(raw: any): Job {
    if (!raw) return {} as Job; // Trả về object rỗng nếu raw là null/undefined

    const toDateIso = (v: any): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number') return new Date(Math.floor(v * 1000)).toISOString();
      const n = Number(v);
      if (!isNaN(n)) return new Date(Math.floor(n * 1000)).toISOString();
      const d = new Date(v);
      return isNaN(d.getTime()) ? '' : d.toISOString();
    };

    return {
      jobId: raw.job_id || raw.jobId || raw.id || '',
      type: raw.type || '',
      status: raw.status || '',
      imageUrl: raw.image_url || raw.imageUrl,
      textValue: raw.text_value || raw.textValue,
      createdAt: toDateIso(raw.created_at || raw.createdAt),
      updatedAt: toDateIso(raw.updated_at || raw.updatedAt),
      errorMessage: raw.error_message || raw.errorMessage,
      frames: Array.isArray(raw.frames) ? raw.frames.map((f: any) => ({
        id: f.id || f.frame_id || '',
        imageUrl: f.image_url || f.imageUrl || '',
        frameTime: toDateIso(f.frame_time || f.frameTime)
      })) : undefined
    };
  }

  /**
   * Lấy danh sách Job (phân trang)
   */
  async getAllJobs(page = 0, size = 10): Promise<PaginatedResponse> {
    const response = await this.apiCall(`?page=${page}&size=${size}`);
    const data = response.data || response;
    const contentRaw = data.content || [];
    
    const content = contentRaw.map((item: any) => {
      const normalized = this.normalizeJob(item);
      normalized.frames = undefined; // Danh sách không cần 'frames'
      return normalized;
    });

    return {
      content,
      totalElements: data.total_elements || data.totalElements || 0,
      totalPages: data.total_pages || data.totalPages || 1,
      number: data.number || 0,
      size: data.size || size
    };
  }

  /**
   * Lấy chi tiết một Job
   */
  async getJobDetail(jobId: string): Promise<Job> {
    const response = await this.apiCall(`/${jobId}`);
    const data = response.data || response;
    return this.normalizeJob(data);
  }

  /**
   * Tìm kiếm bằng Text (gửi JSON)
   */
  async searchByText(text: string, timestamp?: string, durationSeconds?: number): Promise<any> {
    const body: any = {
      text: text,
      is_continue_search: false
    };

    if (timestamp) {
      body.timestamp = new Date(timestamp).toISOString();
    }
    if (durationSeconds) {
      body.duration_seconds = durationSeconds;
    }

    return await this.apiCall('/text', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Tìm kiếm bằng Image (gửi FormData, không dùng apiCall)
   */
  async searchByImage(imageFile: File, timestamp?: string, durationSeconds?: number): Promise<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const requestPayload: any = {
      is_continue_search: false
    };

    if (timestamp) requestPayload.timestamp = new Date(timestamp).toISOString();
    if (durationSeconds) requestPayload.duration_seconds = durationSeconds;

    formData.append('request', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }));

    const response = await fetch(`${API_CONFIG.BASE_URL}/images`, { // Gửi đến BASE_URL
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Upload Video (gửi FormData, không dùng apiCall)
   * Đây là phiên bản "xịn" kết hợp từ code JS cũ của bạn.
   */
  async uploadVideo(videoFile: File, metadata: VideoMetadata): Promise<any> {
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('metadata', JSON.stringify(metadata));

    let response: Response;
    try {
      const controller = new AbortController();
      // Lấy timeout từ config
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      response = await fetch(API_CONFIG.STORAGE_URL, { // Gửi đến STORAGE_URL
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

    } catch (fetchErr: any) {
      if (fetchErr?.name === 'AbortError') {
        throw new Error(`Request bị timeout (quá ${API_CONFIG.TIMEOUT / 60000} phút).`);
      }
      throw new Error(`Lỗi mạng: ${fetchErr.message}`);
    }

    // Xử lý lỗi HTTP (vd: 400, 500)
    if (!response.ok) {
      let errorText = await response.text(); // Đọc lỗi 1 lần
      try {
        // Thử parse xem có phải lỗi JSON không
        const parsedErr = JSON.parse(errorText);
        throw new Error(parsedErr.message || parsedErr.error || JSON.stringify(parsedErr));
      } catch (parseErr) {
        // Không phải JSON, trả về text lỗi
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }

    // Xử lý response thành công (200 OK)
    // Phải đọc response body 1 lần duy nhất
    const rawText = await response.text();

    if (!rawText || rawText.trim().length === 0) {
      // Response 200 OK nhưng rỗng -> Vẫn là thành công
      return { success: true, message: 'Upload successful (empty response)' };
    }

    // Thử parse text vừa đọc
    try {
      const jsonResponse = JSON.parse(rawText);
      // Đây là kết quả bạn muốn! (vd: { job_id: '...' })
      return jsonResponse;
    } catch (e) {
      // Server trả về 200 OK nhưng body không phải JSON
      console.warn('Upload thành công nhưng response không phải JSON:', rawText);
      return { 
        success: true, 
        message: `Upload successful (response: ${rawText})` 
      };
    }
  }
}
export const apiService = new ApiService();
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