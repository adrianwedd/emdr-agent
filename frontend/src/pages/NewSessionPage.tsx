import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { TargetMemoryForm } from '../components/SessionManagement';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';
import { Alert } from '../components/Common/Alert';

export const NewSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, isLoading, error, clearError } = useSessionStore();

  const handleSubmit = async (data: {
    description: string; negativeCognition: string; positiveCognition: string;
    emotion: string; bodyLocation?: string; initialSUD: number; initialVOC: number;
  }) => {
    try {
      const sessionId = await createSession({
        targetMemory: {
          description: data.description, negativeCognition: data.negativeCognition,
          positiveCognition: data.positiveCognition, emotion: data.emotion, bodyLocation: data.bodyLocation,
        },
        initialSUD: data.initialSUD, initialVOC: data.initialVOC,
      });
      navigate(`/sessions/${sessionId}`);
    } catch { /* Error captured in store */ }
  };

  return (
    <div className="min-h-screen bg-therapy-bg">
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New EMDR Session</h1>
          <p className="text-therapy-muted mt-1">Identify the target memory and record your initial measurements.</p>
        </div>
        {error && <Alert variant="error" className="mb-6" onDismiss={clearError}>{error}</Alert>}
        <Card><TargetMemoryForm onSubmit={handleSubmit} isLoading={isLoading} /></Card>
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> This is a research tool, not a replacement for professional therapy.
            If you experience significant distress, please use the emergency stop button or contact a mental health professional.
          </p>
        </div>
      </main>
    </div>
  );
};
