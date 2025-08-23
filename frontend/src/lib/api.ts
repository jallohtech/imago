import { ApiResponse, MediaItem, SearchParams, SearchResponse, SearchFieldsResponse, HealthStatus } from '@/types/api.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<T> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.data as T;
    } catch (error) {
      throw error;
    }
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<SearchResponse>(`/api/search?${searchParams.toString()}`);
  }

  async getMediaItem(id: string): Promise<MediaItem> {
    return this.request<MediaItem>(`/api/media/${id}`);
  }

  async getSearchableFields(): Promise<SearchFieldsResponse> {
    return this.request<SearchFieldsResponse>('/api/search/fields');
  }

  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health');
  }

  async validateImageUrls(urls: string[]): Promise<Record<string, { isValid: boolean; errors?: string[] }>> {
    return this.request('/api/media/validate', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
  }
}

export const apiClient = new ApiClient();