import { offlineDb } from './offlineDb';

const rawBaseUrl = (import.meta as any).env?.VITE_API_URL || '';
const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

class ApiService {
  private token: string | null = localStorage.getItem('agrisupply_token');
  private tenantId: string = localStorage.getItem('agrisupply_tenant') || 'tenant-greenvalley';

  public setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('agrisupply_token', token);
    else localStorage.removeItem('agrisupply_token');
  }

  public setTenantId(tenantId: string) {
    this.tenantId = tenantId;
    localStorage.setItem('agrisupply_tenant', tenantId);
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.tenantId,
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token expired or invalid
        console.warn('[API] 401 Unauthorized');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      }

      return { success: response.ok };
    } catch (err: any) {
      console.error(`[API Network Error] ${endpoint}:`, err);
      return { success: false, error: err.message || 'Network disconnected' };
    }
  }

  public get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  public put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  public delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Trigger sync of queued offline actions
  public async syncOfflineQueue(): Promise<{ success: boolean; syncedCount: number; conflictCount: number }> {
    const queue = offlineDb.getQueue();
    if (queue.length === 0) return { success: true, syncedCount: 0, conflictCount: 0 };

    const items = queue.map(a => ({
      clientSyncId: a.id,
      entityType: a.type,
      operation: a.operation,
      payload: a.payload,
      clientTimestamp: a.timestamp
    }));

    const res = await this.post<any>('/api/sync', { items });
    if (res.success && res.synced !== undefined) {
      offlineDb.clearQueue();
      return { success: true, syncedCount: res.synced, conflictCount: res.conflicts || 0 };
    }
    return { success: false, syncedCount: 0, conflictCount: queue.length };
  }
}

export const api = new ApiService();
