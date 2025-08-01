import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AuthPage } from './components/auth';
import { WebSocketStatus } from './components/WebSocketStatus';
import { useAuthStore } from './stores/authStore';
import './App.css';

// Dashboard component for authenticated users
const Dashboard = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🧠 EMDR Therapy Assistant
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Dashboard
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Safety Profile Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Safety Profile</h3>
              <p className="text-blue-700 text-sm">
                Risk Level: <span className="font-medium">{user?.safetyProfile?.riskLevel || 'Not assessed'}</span>
              </p>
              <p className="text-blue-600 text-xs mt-2">
                Your safety is our priority
              </p>
            </div>

            {/* Account Status Card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">Account Status</h3>
              <p className="text-green-700 text-sm">
                Status: <span className="font-medium">{user?.isActive ? 'Active' : 'Inactive'}</span>
              </p>
              <p className="text-green-700 text-sm">
                Email: <span className="font-medium">{user?.emailVerified ? 'Verified' : 'Unverified'}</span>
              </p>
            </div>

            {/* Sessions Card */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-2">EMDR Sessions</h3>
              <p className="text-purple-700 text-sm">
                Total Sessions: <span className="font-medium">0</span>
              </p>
              <button className="mt-2 bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors">
                Start Session
              </button>
            </div>

            {/* WebSocket Status Card */}
            <div>
              <WebSocketStatus />
            </div>
          </div>

          {/* Features Coming Soon */}
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-amber-900 mb-2">🚧 Coming Soon</h3>
            <ul className="text-amber-800 text-sm space-y-1">
              <li>• AI-Powered EMDR Sessions</li>
              <li>• Real-time Safety Monitoring</li>
              <li>• Multi-modal Bilateral Stimulation</li>
              <li>• Progress Tracking & Analytics</li>
              <li>• WebSocket-based Agent Communication</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

// Public landing page
const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        🧠 Agentic EMDR Therapy App
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        AI-powered EMDR therapy with intelligent therapeutic agents
      </p>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="text-left space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Multi-agent therapeutic system</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Adaptive EMDR protocols</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time safety monitoring</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Multi-modal bilateral stimulation</span>
          </div>
        </div>
      </div>
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>⚠️ Important:</strong> This is a research and educational tool.
          Always consult with qualified mental health professionals.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute fallback={<AuthPage />}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
