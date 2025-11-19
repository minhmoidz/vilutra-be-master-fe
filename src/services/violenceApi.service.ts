import type { RegisterViolenceCameraReq, UpdateViolenceCameraReq, ViolenceCamera, ViolenceIncident } from "../types/violence";

// Định nghĩa hằng số Base URL để dễ quản lý
export const VIOLENCE_BASE_URL = 'http://10.3.9.18:9001';

class ViolenceApiService {
  // Cấu hình cứng IP Server theo yêu cầu test
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

  /**
   * Lấy danh sách Camera bạo lực
   * GET /api/v1/camera_list (Đã cập nhật đúng theo server)
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

  // --- API SỰ CỐ (INCIDENTS) ---

  /**
   * Lấy danh sách sự cố
   */
  async getIncidents(cameraId?: string, limit: number = 100): Promise<ViolenceIncident[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cameraId) {
      params.append('camera_id', cameraId);
    }

    return await this.apiCall(`/incidents/list?${params.toString()}`);
  }

  /**
   * Đánh dấu sự cố đã xem (Review)
   */
  async reviewIncident(incidentId: number): Promise<ViolenceIncident> {
    return await this.apiCall(`/incidents/${incidentId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({}) 
    });
  }
}

export const violenceApiService = new ViolenceApiService();