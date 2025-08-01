import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { AuthPage } from './AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    // Attempt to load user from stored token
    if (!isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated, loadUser]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth page or custom fallback
  if (!isAuthenticated) {
    return fallback || <AuthPage />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};