import { API_CONFIG } from '../config/api.config';
import type { 
  Job, 
  PaginatedResponse, 
  VideoMetadata,
  Camera,
  NewCameraData,
  UpdateCameraData,
  Stream,
  SearchTextRequest,
  SearchImageRequest 
} from '../types';

// 2. ĐỊNH NGHĨA CLASS DỊCH VỤ
class ApiService {
  /**
   * Hàm gọi API chung, dùng cho các request/response JSON
   * [CẬP NHẬT] Thêm baseUrlOverride để gọi các API domain khác nhau
   */
  private async apiCall(endpoint: string, options: RequestInit = {}, baseUrlOverride?: string): Promise<any> {
    // Ưu tiên baseUrlOverride (cho API Camera/Stream), nếu không thì dùng BASE_URL (cho API Job)
    const baseUrl = baseUrlOverride || API_CONFIG.BASE_URL;
    const url = `${baseUrl}${endpoint}`;
    
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
      // console.info('apiCall ->', { url, config }); // Uncomment nếu muốn debug
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        return { success: true };
      }
      return JSON.parse(text);

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
   * "Dọn dẹp" dữ liệu Job trả về từ API
   */
  private normalizeJob(raw: any): Job {
    if (!raw) return {} as Job;
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

  // ==========================================
  // 1. API JOBS & SEARCH (Port 5437 - BASE_URL)
  // ==========================================

  /**
   * Lấy danh sách Job (phân trang)
   */
  async getAllJobs(page = 0, size = 10): Promise<PaginatedResponse> {
    const response = await this.apiCall(`/api/v1/queries?page=${page}&size=${size}`);
    const data = response.data || response;
    const contentRaw = data.content || [];
    
    const content = contentRaw.map((item: any) => {
      const normalized = this.normalizeJob(item);
      normalized.frames = undefined;
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
    const response = await this.apiCall(`/api/v1/queries/${jobId}`);
    const data = response.data || response;
    return this.normalizeJob(data);
  }

  /**
   * Tìm kiếm bằng Text (gửi JSON)
   */
  async searchByText(text: string, timestamp?: string, durationSeconds?: number): Promise<any> {
    const body: SearchTextRequest = {
      text: text,
      is_continue_search: false
    };
    if (timestamp) body.timestamp = new Date(timestamp).toISOString();
    if (durationSeconds) body.duration_seconds = durationSeconds;

    return await this.apiCall('/api/v1/queries/text', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Tìm kiếm bằng Image (gửi FormData)
   */
  async searchByImage(imageFile: File, timestamp?: string, durationSeconds?: number): Promise<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const requestPayload: SearchImageRequest = {
      is_continue_search: false
    };
    if (timestamp) requestPayload.timestamp = new Date(timestamp).toISOString();
    if (durationSeconds) requestPayload.duration_seconds = durationSeconds;

    formData.append('request', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }));

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/queries/images`, { 
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // ==================================================
  // 2. API UPLOAD STORAGE (Port 8181 - STORAGE_URL)
  // ==================================================

  /**
   * Upload Video
   */
  async uploadVideo(videoFile: File, metadata: VideoMetadata): Promise<any> {
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('metadata', JSON.stringify(metadata));

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      response = await fetch(API_CONFIG.STORAGE_URL, { 
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
    
    if (!response.ok) {
      let errorText = await response.text();
      try {
        const parsedErr = JSON.parse(errorText);
        throw new Error(parsedErr.message || parsedErr.error || JSON.stringify(parsedErr));
      } catch (parseErr) {
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }
    const rawText = await response.text();
    if (!rawText || rawText.trim().length === 0) {
      return { success: true, message: 'Upload successful (empty response)' };
    }
    try {
      const jsonResponse = JSON.parse(rawText);
      return jsonResponse;
    } catch (e) {
      console.warn('Upload thành công nhưng response không phải JSON:', rawText);
      return { 
        success: true, 
        message: `Upload successful (response: ${rawText})` 
      };
    }
  }

  // =========================================================
  // 3. API CAMERA & STREAMS (Port 8181 - CAMERA_API_URL)
  // =========================================================

  /**
   * Lấy danh sách Camera (hỗ trợ filter)
   */
  async getCameras(is_active?: boolean): Promise<Camera[]> {
    const endpoint = is_active === undefined 
      ? '/api/v1/cameras' 
      : `/api/v1/cameras?is_active=${is_active}`;
      
    const response = await this.apiCall(endpoint, {}, API_CONFIG.CAMERA_API_URL); 
    return (response.data || response) as Camera[];
  }

  /**
   * Lấy chi tiết MỘT Camera
   */
  async getCameraDetail(cameraId: string): Promise<Camera> {
    return await this.apiCall(`/api/v1/cameras/${cameraId}`, {}, API_CONFIG.CAMERA_API_URL);
  }

  /**
   * Thêm một Camera mới (POST)
   */
  async addCamera(cameraData: Partial<NewCameraData>): Promise<Camera> {
    return await this.apiCall('/api/v1/cameras', {
      method: 'POST',
      body: JSON.stringify(cameraData),
    }, API_CONFIG.CAMERA_API_URL);
  }

  /**
   * Cập nhật MỘT Camera (PUT)
   */
  async updateCamera(cameraId: string, cameraData: Partial<UpdateCameraData>): Promise<Camera> {
    return await this.apiCall(`/api/v1/cameras/${cameraId}`, {
      method: 'PUT',
      body: JSON.stringify(cameraData),
    }, API_CONFIG.CAMERA_API_URL);
  }

  /**
   * Xóa MỘT Camera (DELETE)
   */
  async deleteCamera(cameraId: string): Promise<any> {
    return await this.apiCall(`/api/v1/cameras/${cameraId}`, {
      method: 'DELETE',
      body: JSON.stringify({}), 
    }, API_CONFIG.CAMERA_API_URL);
  }

  /**
   * Lấy danh sách streams của MỘT Camera (Cũ)
   */
  async getCameraStreams(cameraId: string): Promise<Stream[]> {
    const response = await this.apiCall(`/api/v1/cameras/${cameraId}/streams`, {}, API_CONFIG.CAMERA_API_URL);
    return (response.data || response) as Stream[];
  }

  // --- [MỚI] API QUẢN LÝ STREAM CONTROL ---
  
  /**
   * Lấy danh sách tất cả các Stream đang chạy
   * GET /api/v1/streams/list
   */
  async getStreamList(): Promise<any[]> {
    const response = await this.apiCall('/api/v1/streams/list', {}, API_CONFIG.CAMERA_API_URL);
    return response.data || response; 
  }

  /**
   * Bắt đầu một Stream mới
   * POST /api/v1/streams/start
   */
  async startStream(data: { camera_id: string; stream_url: string; config?: any }): Promise<any> {
    return await this.apiCall('/api/v1/streams/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }, API_CONFIG.CAMERA_API_URL);
  }

  /**
   * Dừng một Stream đang chạy
   * POST /api/v1/streams/stop
   */
  async stopStream(jobId: string): Promise<any> {
    return await this.apiCall('/api/v1/streams/stop', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId }),
    }, API_CONFIG.CAMERA_API_URL);
  }

  /**
   * Kiểm tra trạng thái Stream
   * GET /api/v1/streams/status/{job_id}
   */
  async getStreamStatus(jobId: string): Promise<any> {
    return await this.apiCall(`/api/v1/streams/status/${jobId}`, {}, API_CONFIG.CAMERA_API_URL);
  }
}

// 3. EXPORT INSTANCE ĐỂ SỬ DỤNG CHUNG
export const apiService = new ApiService();