import { create } from 'zustand';
import {
  safetyApi,
  SafetyAssessment,
  SafetyCheck,
  GroundingTechnique,
  CrisisResource,
  SafetyMeasurements,
} from '../services/safetyApi';

interface SafetyStore {
  // State
  assessment: SafetyAssessment | null;
  history: SafetyCheck[];
  groundingTechniques: GroundingTechnique[];
  crisisResources: CrisisResource[];
  isAssessing: boolean;
  activeGrounding: string | null;
  error: string | null;

  // Actions
  fetchAssessment: (sessionId: string) => Promise<void>;
  performCheck: (sessionId: string, reason?: string) => Promise<void>;
  updateMeasurements: (sessionId: string, measurements: SafetyMeasurements) => Promise<void>;
  fetchHistory: (sessionId: string) => Promise<void>;
  fetchGroundingTechniques: (category?: string) => Promise<void>;
  fetchCrisisResources: () => Promise<void>;
  startGrounding: (techniqueId: string) => void;
  completeGrounding: (techniqueId: string, effectiveness: number, feedback?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useSafetyStore = create<SafetyStore>()((set, get) => ({
  assessment: null,
  history: [],
  groundingTechniques: [],
  crisisResources: [],
  isAssessing: false,
  activeGrounding: null,
  error: null,

  fetchAssessment: async (sessionId) => {
    try {
      const response = await safetyApi.getAssessment(sessionId);
      if (response.success && response.data) {
        set({ assessment: response.data });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch safety assessment';
      set({ error: msg });
    }
  },

  performCheck: async (sessionId, reason) => {
    set({ isAssessing: true, error: null });
    try {
      const response = await safetyApi.performCheck(sessionId, reason);
      if (response.success && response.data) {
        set({ assessment: response.data, isAssessing: false });
        // Refresh history after new check
        get().fetchHistory(sessionId);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Safety check failed. If you are in distress, call 988 or text HOME to 741741.';
      set({ isAssessing: false, error: msg });
    }
  },

  updateMeasurements: async (sessionId, measurements) => {
    try {
      await safetyApi.updateMeasurements(sessionId, measurements);
      // Re-assess after measurement update
      get().fetchAssessment(sessionId);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update measurements';
      set({ error: msg });
    }
  },

  fetchHistory: async (sessionId) => {
    try {
      const response = await safetyApi.getHistory(sessionId);
      if (response.success && response.data) {
        set({ history: response.data });
      }
    } catch {
      // Silent — history is supplementary
    }
  },

  fetchGroundingTechniques: async (category) => {
    try {
      const response = await safetyApi.getGroundingTechniques(category);
      if (response.success && response.data) {
        set({ groundingTechniques: response.data });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to load grounding techniques' });
    }
  },

  fetchCrisisResources: async () => {
    try {
      const response = await safetyApi.getCrisisResources();
      if (response.success && response.data) {
        set({ crisisResources: response.data });
      }
    } catch {
      // Fallback handled in component with hardcoded resources
    }
  },

  startGrounding: (techniqueId) => set({ activeGrounding: techniqueId }),

  completeGrounding: async (techniqueId, effectiveness, feedback) => {
    set({ activeGrounding: null });
    try {
      await safetyApi.reportEffectiveness(techniqueId, effectiveness, feedback);
    } catch {
      // Silent — effectiveness tracking is supplementary
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({
    assessment: null, history: [], groundingTechniques: [], crisisResources: [],
    isAssessing: false, activeGrounding: null, error: null,
  }),
}));
