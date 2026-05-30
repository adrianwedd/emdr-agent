import { api, ApiResponse } from './api';
import { EMDRPhase, BilateralStimulationSettings } from '../../../shared/types/EMDR';

// Types matching backend API responses
export interface SessionListItem {
  id: string;
  phase: string;
  state: string;
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  initialSUD?: number;
  currentSUD?: number;
  finalSUD?: number;
  initialVOC?: number;
  currentVOC?: number;
  finalVOC?: number;
  createdAt: string;
  updatedAt: string;
  targetMemory?: {
    id: string;
    description: string;
    negativeCognition: string;
    positiveCognition: string;
    emotion: string;
    bodyLocation?: string;
  };
}

export interface SessionDetail extends SessionListItem {
  sets: Array<{
    id: string;
    number: number;
    startTime: string;
    endTime?: string;
    duration?: number;
    sudBefore?: number;
    sudAfter?: number;
  }>;
  safetyChecks: Array<{
    id: string;
    timestamp: string;
    type: string;
    action: string;
  }>;
}

export interface PaginatedSessions {
  sessions: SessionListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateSessionData {
  targetMemory: {
    description: string;
    negativeCognition: string;
    positiveCognition: string;
    emotion: string;
    bodyLocation?: string;
  };
  initialSUD: number;
  initialVOC: number;
}

export interface SetFeedback {
  sudLevel?: number;
  vocLevel?: number;
  notes?: string;
}

export const sessionApi = {
  create: (data: CreateSessionData): Promise<ApiResponse<SessionDetail>> =>
    api.post('/sessions', data),

  getById: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.get(`/sessions/${id}`),

  getUserSessions: (page = 1, limit = 20, state?: string): Promise<ApiResponse<PaginatedSessions>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (state) params.set('state', state);
    return api.get(`/sessions?${params}`);
  },

  start: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/start`),

  pause: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/pause`),

  resume: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/resume`),

  complete: (id: string, notes?: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/complete`, { notes }),

  emergencyStop: (id: string, reason: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/emergency-stop`, { reason }),

  updatePhase: (id: string, phase: string, phaseData?: Record<string, unknown>): Promise<ApiResponse<SessionDetail>> =>
    api.put(`/sessions/${id}/phase`, { phase, phaseData }),

  startSet: (id: string, stimulationSettings?: Partial<BilateralStimulationSettings>): Promise<ApiResponse> =>
    api.post(`/sessions/${id}/sets`, { stimulationSettings }),

  completeSet: (id: string, setId: string, feedback?: SetFeedback): Promise<ApiResponse> =>
    api.put(`/sessions/${id}/sets/${setId}`, feedback ? { userFeedback: feedback } : undefined),
};
