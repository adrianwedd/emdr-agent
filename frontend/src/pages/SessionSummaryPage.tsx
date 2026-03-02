import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { SessionSummary } from '../components/SessionManagement';
import { Button } from '../components/Common/Button';

export const SessionSummaryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeSession, isLoading, elapsed, loadSession } = useSessionStore();

  useEffect(() => { if (id) loadSession(id); }, [id, loadSession]);

  if (!activeSession && isLoading) {
    return <div className="min-h-screen bg-therapy-bg flex items-center justify-center"><div className="text-therapy-muted">Loading session...</div></div>;
  }
  if (!activeSession) {
    return <div className="min-h-screen bg-therapy-bg flex items-center justify-center"><div className="text-center"><p className="text-gray-600 mb-4">Session not found</p><Button variant="primary" onClick={() => navigate('/')}>Back to Dashboard</Button></div></div>;
  }

  return (
    <div className="min-h-screen bg-therapy-bg">
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Session Summary</h1>
        <SessionSummary session={activeSession} elapsed={elapsed} />
        <div className="mt-8 flex justify-center">
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />Return to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};
