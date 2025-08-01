import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthPageProps {
  onAuthSuccess?: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  onAuthSuccess, 
  defaultMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const { loadUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Try to load user from stored token on component mount
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // If user becomes authenticated, call success callback
    if (isAuthenticated) {
      onAuthSuccess?.();
    }
  }, [isAuthenticated, onAuthSuccess]);

  const handleAuthSuccess = () => {
    onAuthSuccess?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            EMDR Therapy Assistant
          </h1>
          <p className="text-gray-600">
            AI-Powered Therapeutic Support System
          </p>
        </div>

        {/* Auth Forms */}
        <div className="mt-8">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setMode('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Educational Research Application</p>
          <p>Not for Clinical Use</p>
        </div>
      </div>
    </div>
  );
};