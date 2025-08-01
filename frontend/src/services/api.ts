import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  safetyProfile?: {
    id: string;
    riskLevel: string;
    contraindications: string[];
    emergencyContacts: any;
    professionalSupport: any;
    crisisProtocols: any;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken } = response.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authApi = {
  register: async (data: RegisterData): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ tokens: AuthTokens }>> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },
};

// General API functions
export const api = {
  get: async <T = any>(url: string): Promise<ApiResponse<T>> => {
    const response = await apiClient.get(url);
    return response.data;
  },

  post: async <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
    const response = await apiClient.post(url, data);
    return response.data;
  },

  put: async <T = any>(url: string, data?: any): Promise<ApiResponse<T>> => {
    const response = await apiClient.put(url, data);
    return response.data;
  },

  delete: async <T = any>(url: string): Promise<ApiResponse<T>> => {
    const response = await apiClient.delete(url);
    return response.data;
  },
};

export default apiClient;