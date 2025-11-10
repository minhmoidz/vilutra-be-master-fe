import { API_CONFIG } from '../config/api.config';
import type { Job, PaginatedResponse, VideoMetadata } from '../types';


class ApiService {
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
        const msg = `Network/CORS error when fetching ${url}: ${error.message}`;
        console.error('API call error (TypeError):', msg, error);
        throw new Error(msg);
      }
      throw error;
    }
  }

  private normalizeJob(raw: any): Job {
    const toDateIso = (v: any) => {
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

  async getAllJobs(page = 0, size = 10): Promise<PaginatedResponse> {
    const response = await this.apiCall(`?page=${page}&size=${size}`);
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

  async getJobDetail(jobId: string): Promise<Job> {
    const response = await this.apiCall(`/${jobId}`);
    const data = response.data || response;
    return this.normalizeJob(data);
  }

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

  async searchByImage(imageFile: File, timestamp?: string, durationSeconds?: number): Promise<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const requestPayload: any = {
      is_continue_search: false
    };

    if (timestamp) requestPayload.timestamp = new Date(timestamp).toISOString();
    if (durationSeconds) requestPayload.duration_seconds = durationSeconds;

    formData.append('request', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }));

    const response = await fetch(`${API_CONFIG.BASE_URL}/images`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async uploadVideo(videoFile: File, metadata: VideoMetadata): Promise<any> {
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('metadata', JSON.stringify(metadata));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      const response = await fetch(API_CONFIG.STORAGE_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const rawText = await response.text();
      if (!rawText || rawText.trim().length === 0) {
        return { success: true, message: 'Upload successful' };
      }

      return JSON.parse(rawText);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Request bị timeout (quá 5 phút)');
      }
      throw error;
    }
  }
}

export const apiService = new ApiService();
