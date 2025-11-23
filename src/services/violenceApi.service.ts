import type { 
  RegisterViolenceCameraReq, 
  UpdateViolenceCameraReq, 
  ViolenceCamera, 
  ViolenceIncident 
} from "../types/violence";

// Định nghĩa hằng số Base URL
export const VIOLENCE_BASE_URL = 'http://10.3.9.18:9001';

class ViolenceApiService {
  // Cấu hình cứng IP Server
  private getBaseUrl() {
    return `${VIOLENCE_BASE_URL}/api/v1`;
  }

  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Violence API Error (${url}):`, error);
      throw error;
    }
  }

  // --- API CAMERA ---

  /**
   * Lấy danh sách Camera bạo lực
   * GET /api/v1/camera_list
   */
  async getList(): Promise<ViolenceCamera[]> {
    return await this.apiCall('/camera_list');
  }

  /**
   * Lấy chi tiết Camera
   */
  async getDetail(cameraId: string): Promise<ViolenceCamera> {
    return await this.apiCall(`/camera/${cameraId}`);
  }

  /**
   * Đăng ký Camera mới
   */
  async register(data: RegisterViolenceCameraReq): Promise<ViolenceCamera> {
    return await this.apiCall('/camera/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Cập nhật Camera
   */
  async update(cameraId: string, data: UpdateViolenceCameraReq): Promise<ViolenceCamera> {
    return await this.apiCall(`/camera/${cameraId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Xóa Camera
   */
  async delete(cameraId: string): Promise<any> {
    return await this.apiCall(`/camera/${cameraId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Start Detection
   */
  async startDetection(cameraId: string): Promise<ViolenceCamera> {
    return await this.apiCall(`/camera/${cameraId}/start`, {
      method: 'POST',
      body: JSON.stringify({}), 
    });
  }

  /**
   * Stop Detection
   */
  async stopDetection(cameraId: string): Promise<ViolenceCamera> {
    return await this.apiCall(`/camera/${cameraId}/stop`, {
      method: 'POST',
      body: JSON.stringify({}), 
    });
  }

  // --- API SỰ CỐ (INCIDENTS / FRAMES) ---

  /**
   * Lấy danh sách sự cố (Incident Frames)
   * GET /api/v1/incidents_list
   */
  async getIncidents(cameraId?: string, limit: number = 100): Promise<ViolenceIncident[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cameraId) {
      params.append('camera_id', cameraId);
    }

    // Đã đổi endpoint từ /incidents/list sang /incidents_list
    return await this.apiCall(`/incidents_list?${params.toString()}`);
  }

  /**
   * [MỚI] Lấy chi tiết một frame sự cố (bao gồm clips)
   * GET /api/v1/incidents/{frame_id}
   */
  async getIncidentDetail(frameId: number): Promise<ViolenceIncident> {
    return await this.apiCall(`/incidents/${frameId}`);
  }

  /**
   * Đánh dấu sự cố đã xem (Review)
   * PATCH /api/v1/incidents/{frame_id}/review
   */
  async reviewIncident(frameId: number): Promise<ViolenceIncident> {
    return await this.apiCall(`/incidents/${frameId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({}) 
    });
  }

  /**
   * [MỚI] Xóa một bản ghi sự cố (frame)
   * DELETE /api/v1/incidents/{frame_id}
   */
  async deleteIncident(frameId: number): Promise<any> {
    return await this.apiCall(`/incidents/${frameId}`, {
      method: 'DELETE',
    });
  }

  /**
   * [MỚI] Xóa sự cố theo khoảng thời gian
   * DELETE /api/v1/incidents/delete_by_time_range/{camera_id}
   * start_time & end_time: ISO 8601 format
   */
  async deleteIncidentsByTimeRange(cameraId: string, startTime: string, endTime: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('start_time', startTime);
    params.append('end_time', endTime);

    return await this.apiCall(`/incidents/delete_by_time_range/${cameraId}?${params.toString()}`, {
      method: 'DELETE',
    });
  }
}

export const violenceApiService = new ViolenceApiService();