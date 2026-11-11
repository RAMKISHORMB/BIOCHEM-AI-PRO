
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || '/api/v1'
).replace(/\/$/, '');

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('biochem_auth_token');

    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string>),
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('biochem_auth_token');
      localStorage.removeItem('biochem_auth_user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      throw new Error('Session expired or unauthorized');
    }

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage =
          errorData.detail ||
          errorData.message ||
          errorMessage;
      } catch {
        // Use fallback error message.
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');

    if (
      contentType &&
      (
        contentType.includes('application/pdf') ||
        contentType.includes('text/csv') ||
        contentType.includes('application/octet-stream') ||
        contentType.includes('spreadsheetml')
      )
    ) {
      return (await response.blob()) as unknown as T;
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined,
    });
  }

  upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async download(
    endpoint: string,
    filename: string
  ): Promise<void> {
    const blob = await this.request<Blob>(endpoint, {
      method: 'GET',
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }
}

export const api = new ApiClient();
