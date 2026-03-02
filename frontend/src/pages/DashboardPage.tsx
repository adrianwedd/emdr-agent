import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Clock, Activity, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sessions, totalSessions, isLoading, loadUserSessions } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserSessions();
  }, [loadUserSessions]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const stateLabel = (state: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      preparing: { text: 'Preparing', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { text: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      paused: { text: 'Paused', color: 'bg-gray-100 text-gray-800' },
      completed: { text: 'Completed', color: 'bg-green-100 text-green-800' },
      emergency_stopped: { text: 'Stopped', color: 'bg-red-100 text-red-800' },
    };
    return labels[state] || { text: state, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="min-h-screen bg-therapy-bg">
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EMDR Therapy</h1>
              <p className="text-sm text-therapy-muted">Welcome, {user?.firstName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => navigate('/sessions/new')}>
                <Plus className="w-4 h-4 mr-2" />New Session
              </Button>
              <Button variant="ghost" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-therapy-border p-5 flex items-center gap-4">
            <div className="bg-indigo-100 rounded-lg p-3"><Activity className="w-6 h-6 text-indigo-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
              <div className="text-sm text-therapy-muted">Total Sessions</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-therapy-border p-5 flex items-center gap-4">
            <div className="bg-green-100 rounded-lg p-3"><Shield className="w-6 h-6 text-green-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{user?.safetyProfile?.riskLevel || 'N/A'}</div>
              <div className="text-sm text-therapy-muted">Safety Level</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-therapy-border p-5 flex items-center gap-4">
            <div className="bg-purple-100 rounded-lg p-3"><Clock className="w-6 h-6 text-purple-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{sessions.filter((s) => s.state === 'completed').length}</div>
              <div className="text-sm text-therapy-muted">Completed</div>
            </div>
          </div>
        </div>

        <Card header={<h2 className="text-lg font-semibold text-gray-900">Session History</h2>}>
          {isLoading ? (
            <div className="text-center py-8 text-therapy-muted">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-therapy-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-therapy-muted mb-6">Start your first EMDR therapy session to begin processing.</p>
              <Button variant="primary" onClick={() => navigate('/sessions/new')}>
                <Plus className="w-4 h-4 mr-2" />Start First Session
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => {
                const state = stateLabel(session.state);
                return (
                  <motion.div
                    key={session.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50 -mx-6 px-6 cursor-pointer transition-colors"
                    onClick={() => {
                      const route = session.state === 'completed' || session.state === 'emergency_stopped'
                        ? `/sessions/${session.id}/summary` : `/sessions/${session.id}`;
                      navigate(route);
                    }}
                    whileHover={{ x: 4 }}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {session.targetMemory?.description
                          ? session.targetMemory.description.slice(0, 60) + (session.targetMemory.description.length > 60 ? '...' : '')
                          : 'Session'}
                      </div>
                      <div className="text-sm text-therapy-muted">{formatDate(session.createdAt)} · Phase: {session.phase}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.currentSUD !== undefined && <span className="text-sm text-gray-600">SUD: {session.currentSUD}</span>}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${state.color}`}>{state.text}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
