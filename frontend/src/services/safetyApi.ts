import { api, ApiResponse } from './api';

// --- Types matching backend responses ---

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafetyIndicator {
  type: 'distress' | 'dissociation' | 'overwhelm' | 'content' | 'physiological';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value?: number;
  threshold?: number;
}

export interface CrisisResource {
  name: string;
  type: 'hotline' | 'text' | 'professional' | 'emergency';
  contact: string;
  description: string;
  availability: string;
}

export interface SafetyIntervention {
  type: 'grounding' | 'pause' | 'emergency_stop' | 'professional_referral';
  instructions: string[];
  resources?: CrisisResource[];
  followUpRequired: boolean;
  estimatedDuration?: number;
}

export interface SafetyAssessment {
  sessionId: string;
  userId: string;
  riskLevel: RiskLevel;
  sudLevel: number;
  indicators: SafetyIndicator[];
  recommendedAction: string;
  intervention?: SafetyIntervention;
  timestamp: string;
}

export interface SafetyCheck {
  id: string;
  sessionId: string;
  type: string;
  riskLevel: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface GroundingTechnique {
  id: string;
  name: string;
  type: 'sensory' | 'breathing' | 'movement' | 'cognitive' | 'visualization';
  instructions: string[];
  duration: number;
  effectiveness: number;
}

export interface SafetyMeasurements {
  sudLevel?: number;
  vocLevel?: number;
  physiological?: {
    heartRate?: number;
    breathing?: 'NORMAL' | 'SHALLOW' | 'RAPID' | 'IRREGULAR';
  };
  psychological?: {
    dissociation?: boolean;
    overwhelm?: boolean;
    flashbacks?: boolean;
  };
}

export interface EmergencyResult {
  stopped: boolean;
  crisisResources: CrisisResource[];
  message: string;
}

// --- API client ---

export const safetyApi = {
  performCheck: (sessionId: string, reason?: string): Promise<ApiResponse<SafetyAssessment>> =>
    api.post('/safety/check', { sessionId, reason }),

  getAssessment: (sessionId: string): Promise<ApiResponse<SafetyAssessment>> =>
    api.get(`/safety/assessment/${sessionId}`),

  updateMeasurements: (sessionId: string, measurements: SafetyMeasurements): Promise<ApiResponse> =>
    api.put(`/safety/measurements/${sessionId}`, measurements),

  getHistory: async (sessionId: string): Promise<ApiResponse<SafetyCheck[]>> => {
    const response = await api.get<any>(`/safety/history/${sessionId}`);
    if (response.success && response.data) {
      response.data = response.data.map((check: any) => ({
        id: check.id,
        sessionId: check.sessionId,
        type: check.checkType ?? check.type ?? 'UNKNOWN',
        riskLevel: check.measurements?.riskLevel ?? check.riskLevel ?? 'LOW',
        action: check.action ?? check.measurements?.action ?? '',
        details: check.measurements ?? check.details,
        createdAt: check.timestamp ?? check.createdAt,
      }));
    }
    return response;
  },

  triggerEmergency: (sessionId: string, reason: string, severity?: string): Promise<ApiResponse<EmergencyResult>> =>
    api.post('/safety/emergency', { sessionId, reason, severity }),

  getGroundingTechniques: (category?: string, difficulty?: string): Promise<ApiResponse<GroundingTechnique[]>> => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    const query = params.toString();
    return api.get(`/safety/grounding-techniques${query ? `?${query}` : ''}`);
  },

  reportEffectiveness: (techniqueId: string, effectiveness: number, feedback?: string): Promise<ApiResponse> =>
    api.post('/safety/grounding-effectiveness', { techniqueId, effectiveness, feedback }),

  getCrisisResources: (location?: string, type?: string): Promise<ApiResponse<CrisisResource[]>> => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (type) params.set('type', type);
    const query = params.toString();
    return api.get(`/safety/crisis-resources${query ? `?${query}` : ''}`);
  },
};
