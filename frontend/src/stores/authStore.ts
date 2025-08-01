import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, RegisterData, LoginData } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(data);
          
          if (response.success && response.data) {
            const { user, tokens } = response.data;
            
            // Store tokens in localStorage
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            
            set({ 
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null 
            });
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null 
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.register(data);
          
          if (response.success && response.data) {
            const { user, tokens } = response.data;
            
            // Store tokens in localStorage
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            
            set({ 
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null 
            });
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null 
          });
          throw error;
        }
      },

      logout: () => {
        // Clear tokens from localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Call logout API endpoint (fire and forget)
        authApi.logout().catch(() => {
          // Ignore errors for logout endpoint
        });
        
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null 
        });
      },

      clearError: () => {
        set({ error: null });
      },

      loadUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          return;
        }

        set({ isLoading: true });
        
        try {
          const response = await authApi.getProfile();
          
          if (response.success && response.data) {
            set({ 
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
              error: null 
            });
          } else {
            // Invalid token, clear it
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            set({ 
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null 
            });
          }
        } catch (error: any) {
          // Token invalid or expired
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ 
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null 
          });
        }
      },

      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'emdr-auth',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);