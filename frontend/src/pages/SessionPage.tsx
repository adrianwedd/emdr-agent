import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { PhaseIndicator, SessionControls, SessionTimer, SUDScale, VOCScale, TargetMemoryCard } from '../components/SessionManagement';
import { Button } from '../components/Common/Button';
import { Alert } from '../components/Common/Alert';
import { Card } from '../components/Common/Card';

const PHASE_ORDER = [
  'preparation', 'assessment', 'desensitization', 'installation',
  'body_scan', 'closure', 'reevaluation', 'resource_installation',
];

export const SessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeSession, isLoading, error, elapsed, phaseElapsed,
    loadSession, startSession, pauseSession, resumeSession,
    completeSession, emergencyStop, progressPhase, clearError, clearActiveSession,
  } = useSessionStore();

  useEffect(() => {
    if (id) loadSession(id);
    return () => clearActiveSession();
  }, [id, loadSession, clearActiveSession]);

  useEffect(() => {
    if (activeSession?.state === 'completed' || activeSession?.state === 'emergency_stopped') {
      navigate(`/sessions/${activeSession.id}/summary`, { replace: true });
    }
  }, [activeSession?.state, activeSession?.id, navigate]);

  if (!activeSession && isLoading) {
    return <div className="min-h-screen bg-therapy-bg flex items-center justify-center"><div className="text-therapy-muted">Loading session...</div></div>;
  }
  if (!activeSession) {
    return <div className="min-h-screen bg-therapy-bg flex items-center justify-center"><div className="text-center"><p className="text-gray-600 mb-4">Session not found</p><Button variant="primary" onClick={() => navigate('/')}>Back to Dashboard</Button></div></div>;
  }

  const currentPhaseIndex = PHASE_ORDER.indexOf(activeSession.phase?.toLowerCase() || 'preparation');
  const nextPhase = currentPhaseIndex < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentPhaseIndex + 1] : null;
  const isActive = activeSession.state === 'in_progress';

  const handleNextPhase = () => { if (nextPhase) progressPhase(nextPhase); };

  return (
    <div className="min-h-screen bg-therapy-bg">
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
            <SessionTimer elapsed={elapsed} phaseElapsed={phaseElapsed} currentPhase={activeSession.phase} />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && <Alert variant="error" onDismiss={clearError}>{error}</Alert>}
        <Card><PhaseIndicator currentPhase={activeSession.phase || 'preparation'} /></Card>
        <div className="bg-white rounded-xl border border-therapy-border p-4">
          <SessionControls state={activeSession.state} isLoading={isLoading} onStart={startSession} onPause={pauseSession} onResume={resumeSession} onComplete={completeSession} onEmergencyStop={emergencyStop} onNextPhase={handleNextPhase} canProgressPhase={isActive && nextPhase !== null} />
        </div>
        {activeSession.targetMemory && (
          <TargetMemoryCard description={activeSession.targetMemory.description} negativeCognition={activeSession.targetMemory.negativeCognition} positiveCognition={activeSession.targetMemory.positiveCognition} emotion={activeSession.targetMemory.emotion} bodyLocation={activeSession.targetMemory.bodyLocation} />
        )}
        {isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header={<h3 className="font-semibold text-gray-900">Current Distress</h3>}>
              <SUDScale value={activeSession.currentSUD ?? undefined} onChange={() => {}} disabled label="Current SUD" />
              <div className="mt-3 flex items-center gap-4 text-sm text-therapy-muted">
                <span>Initial: {activeSession.initialSUD ?? '—'}</span>
                <span>Current: {activeSession.currentSUD ?? '—'}</span>
              </div>
            </Card>
            <Card header={<h3 className="font-semibold text-gray-900">Cognition Validity</h3>}>
              <VOCScale value={activeSession.currentVOC ?? undefined} onChange={() => {}} disabled label="Current VOC" />
              <div className="mt-3 flex items-center gap-4 text-sm text-therapy-muted">
                <span>Initial: {activeSession.initialVOC ?? '—'}</span>
                <span>Current: {activeSession.currentVOC ?? '—'}</span>
              </div>
            </Card>
          </div>
        )}
        {activeSession.sets && activeSession.sets.length > 0 && (
          <Card header={<h3 className="font-semibold text-gray-900">Processing Sets</h3>}>
            <div className="text-sm text-therapy-muted">{activeSession.sets.length} set{activeSession.sets.length !== 1 ? 's' : ''} completed</div>
          </Card>
        )}
      </main>
    </div>
  );
};
