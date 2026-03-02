import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, AlertOctagon, SkipForward } from 'lucide-react';
import { Button } from '../Common/Button';
import { Modal } from '../Common/Modal';

interface SessionControlsProps {
  state: string;
  isLoading: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: (notes?: string) => void;
  onEmergencyStop: (reason: string) => void;
  onNextPhase?: () => void;
  canProgressPhase?: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  state, isLoading, onStart, onPause, onResume, onComplete, onEmergencyStop, onNextPhase, canProgressPhase = false,
}) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const isActive = state === 'in_progress';
  const isPaused = state === 'paused';
  const isPreparing = state === 'preparing';
  const isFinished = state === 'completed' || state === 'emergency_stopped';

  return (
    <div className="flex items-center gap-3">
      {isPreparing && (
        <Button variant="primary" size="lg" onClick={onStart} loading={isLoading}>
          <Play className="w-4 h-4 mr-2" />
          Start Session
        </Button>
      )}

      {isActive && (
        <>
          <Button variant="secondary" onClick={onPause} loading={isLoading}>
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          {canProgressPhase && onNextPhase && (
            <Button variant="primary" onClick={onNextPhase} loading={isLoading}>
              <SkipForward className="w-4 h-4 mr-2" />
              Next Phase
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowCompleteModal(true)}>
            <Square className="w-4 h-4 mr-2" />
            Complete
          </Button>
        </>
      )}

      {isPaused && (
        <>
          <Button variant="primary" size="lg" onClick={onResume} loading={isLoading}>
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
          <Button variant="secondary" onClick={() => setShowCompleteModal(true)}>
            <Square className="w-4 h-4 mr-2" />
            Complete
          </Button>
        </>
      )}

      {!isFinished && !isPreparing && (
        <motion.div className="ml-auto" whileHover={{ scale: 1.05 }}>
          <Button variant="danger" size="lg" onClick={() => setShowEmergencyModal(true)} className="shadow-lg">
            <AlertOctagon className="w-5 h-5 mr-2" />
            Emergency Stop
          </Button>
        </motion.div>
      )}

      <Modal open={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title="Emergency Stop" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This will immediately end the session. You can optionally provide a reason.</p>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Reason (optional)..."
            rows={3}
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowEmergencyModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { onEmergencyStop(emergencyReason || 'User requested emergency stop'); setShowEmergencyModal(false); setEmergencyReason(''); }}>
              Confirm Emergency Stop
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete Session" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">End this therapy session. Add any notes below.</p>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-therapy-accent focus:border-therapy-accent"
            placeholder="Session notes (optional)..."
            rows={4}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { onComplete(completionNotes || undefined); setShowCompleteModal(false); setCompletionNotes(''); }}>
              Complete Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
