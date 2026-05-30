import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { useSafetyStore } from '../stores/safetyStore';
import { PhaseIndicator, PHASE_ORDER, SessionControls, SessionTimer, SUDScale, VOCScale, TargetMemoryCard } from '../components/SessionManagement';
import { SafetyStatusBar, SafetyPanel, GroundingExercise } from '../components/Safety';
import { Button } from '../components/Common/Button';
import { Alert } from '../components/Common/Alert';
import { Card } from '../components/Common/Card';

export const SessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeSession = useSessionStore(s => s.activeSession);
  const isLoading = useSessionStore(s => s.isLoading);
  const error = useSessionStore(s => s.error);
  const elapsed = useSessionStore(s => s.elapsed);
  const phaseElapsed = useSessionStore(s => s.phaseElapsed);
  const loadSession = useSessionStore(s => s.loadSession);
  const startSession = useSessionStore(s => s.startSession);
  const pauseSession = useSessionStore(s => s.pauseSession);
  const resumeSession = useSessionStore(s => s.resumeSession);
  const completeSession = useSessionStore(s => s.completeSession);
  const emergencyStop = useSessionStore(s => s.emergencyStop);
  const progressPhase = useSessionStore(s => s.progressPhase);
  const clearError = useSessionStore(s => s.clearError);
  const clearActiveSession = useSessionStore(s => s.clearActiveSession);
  const activeGrounding = useSafetyStore(s => s.activeGrounding);
  const groundingTechniques = useSafetyStore(s => s.groundingTechniques);
  const startGrounding = useSafetyStore(s => s.startGrounding);
  const completeGrounding = useSafetyStore(s => s.completeGrounding);
  const resetSafety = useSafetyStore(s => s.reset);
  const [showSafetyPanel, setShowSafetyPanel] = useState(false);
  const navigatingToSummary = useRef(false);

  useEffect(() => {
    if (id) loadSession(id);
    return () => {
      if (!navigatingToSummary.current) {
        clearActiveSession();
        resetSafety();
      }
    };
  }, [id, loadSession, clearActiveSession]);

  useEffect(() => {
    if (activeSession?.state === 'completed') {
      navigatingToSummary.current = true;
      navigate(`/sessions/${activeSession.id}/summary`, { replace: true });
    }
  }, [activeSession?.state, activeSession?.id, navigate]);

  useEffect(() => {
    const state = activeSession?.state;
    if (state !== 'in_progress' && state !== 'paused') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeSession?.state]);

  if (!activeSession && isLoading) {
    return <div className="min-h-screen bg-therapy-bg flex items-center justify-center"><div className="text-therapy-muted">Loading session...</div></div>;
  }
  if (!activeSession) {
    return <div className="min-h-screen bg-therapy-bg flex items-center justify-center"><div className="text-center"><p className="text-gray-600 mb-4">Session not found</p><Button variant="primary" onClick={() => navigate('/')}>Back to Dashboard</Button></div></div>;
  }

  const currentPhaseIndex = (PHASE_ORDER as readonly string[]).indexOf(activeSession.phase?.toLowerCase() || 'preparation');
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
      {activeSession && activeSession.state !== 'completed' && (
        <SafetyStatusBar
          sessionId={activeSession.id}
          onTogglePanel={() => setShowSafetyPanel(prev => !prev)}
          isPanelOpen={showSafetyPanel}
        />
      )}
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
      {activeSession && (
        <SafetyPanel
          sessionId={activeSession.id}
          isOpen={showSafetyPanel}
          onClose={() => setShowSafetyPanel(false)}
          onStartGrounding={startGrounding}
        />
      )}
      <GroundingExercise
        technique={groundingTechniques.find(t => t.id === activeGrounding) ?? null}
        onComplete={(eff) => { if (activeGrounding) completeGrounding(activeGrounding, eff); }}
        onCancel={() => { if (activeGrounding) completeGrounding(activeGrounding, 5); }}
      />
    </div>
  );
};
