import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Clock, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SessionDetail } from '../../services/sessionApi';

interface SessionSummaryProps {
  session: SessionDetail;
  elapsed: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ session, elapsed }) => {
  const sudReduction = (session.initialSUD ?? 0) - (session.finalSUD ?? session.currentSUD ?? 0);
  const vocImprovement = (session.finalVOC ?? session.currentVOC ?? 0) - (session.initialVOC ?? 0);
  const isEmergencyStopped = session.state === 'emergency_stopped';
  const totalSets = session.sets?.length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className={`rounded-xl p-4 flex items-center gap-3 ${isEmergencyStopped ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        {isEmergencyStopped ? <AlertTriangle className="w-6 h-6 text-red-600" /> : <CheckCircle2 className="w-6 h-6 text-green-600" />}
        <div>
          <h3 className={`font-semibold ${isEmergencyStopped ? 'text-red-900' : 'text-green-900'}`}>
            {isEmergencyStopped ? 'Session Stopped' : 'Session Complete'}
          </h3>
          <p className={`text-sm ${isEmergencyStopped ? 'text-red-700' : 'text-green-700'}`}>
            {isEmergencyStopped ? 'This session was ended early. Please take a moment to ground yourself.' : 'Great work. Take a moment to notice how you feel.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <TrendingDown className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{sudReduction > 0 ? `-${sudReduction}` : sudReduction}</div>
          <div className="text-xs text-therapy-muted">SUD Change</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{vocImprovement > 0 ? `+${vocImprovement}` : vocImprovement}</div>
          <div className="text-xs text-therapy-muted">VOC Change</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Clock className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{formatDuration(session.totalDuration ?? elapsed)}</div>
          <div className="text-xs text-therapy-muted">Duration</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Layers className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{totalSets}</div>
          <div className="text-xs text-therapy-muted">Sets Completed</div>
        </div>
      </div>
    </motion.div>
  );
};
