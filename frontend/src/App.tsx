import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AuthPage } from './components/auth';
import { DashboardPage } from './pages/DashboardPage';
import { NewSessionPage } from './pages/NewSessionPage';
import { SessionPage } from './pages/SessionPage';
import { SessionSummaryPage } from './pages/SessionSummaryPage';
import './App.css';

const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Agentic EMDR Therapy
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        AI-powered EMDR therapy with intelligent therapeutic agents
      </p>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto text-left space-y-3">
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Multi-agent therapeutic system</span></div>
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Adaptive EMDR protocols</span></div>
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Real-time safety monitoring</span></div>
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Multi-modal bilateral stimulation</span></div>
      </div>
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> This is a research and educational tool.
          Always consult with qualified mental health professionals.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<ProtectedRoute fallback={<AuthPage />}><DashboardPage /></ProtectedRoute>} />
        <Route path="/sessions/new" element={<ProtectedRoute fallback={<AuthPage />}><NewSessionPage /></ProtectedRoute>} />
        <Route path="/sessions/:id" element={<ProtectedRoute fallback={<AuthPage />}><SessionPage /></ProtectedRoute>} />
        <Route path="/sessions/:id/summary" element={<ProtectedRoute fallback={<AuthPage />}><SessionSummaryPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
