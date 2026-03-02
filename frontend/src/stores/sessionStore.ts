import { create } from 'zustand';
import { sessionApi, SessionDetail, SessionListItem, PaginatedSessions, CreateSessionData, SetFeedback } from '../services/sessionApi';

interface SessionStore {
  // State
  sessions: SessionListItem[];
  activeSession: SessionDetail | null;
  totalSessions: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Timer state
  elapsed: number;
  phaseElapsed: number;
  timerInterval: ReturnType<typeof setInterval> | null;

  // Session CRUD
  createSession: (data: CreateSessionData) => Promise<string>;
  loadSession: (id: string) => Promise<void>;
  loadUserSessions: (page?: number, state?: string) => Promise<void>;

  // Session lifecycle
  startSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: (notes?: string) => Promise<void>;
  emergencyStop: (reason: string) => Promise<void>;

  // Phase management
  progressPhase: (phase: string) => Promise<void>;

  // Set management
  startSet: () => Promise<void>;
  completeSet: (setId: string, feedback?: SetFeedback) => Promise<void>;

  // Timer
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;

  // Utility
  clearError: () => void;
  clearActiveSession: () => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessions: [],
  activeSession: null,
  totalSessions: 0,
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
  elapsed: 0,
  phaseElapsed: 0,
  timerInterval: null,

  createSession: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.create(data);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        return response.data.id;
      }
      throw new Error(response.message || 'Failed to create session');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to create session';
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  loadSession: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.getById(id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        return;
      }
      throw new Error(response.message || 'Failed to load session');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to load session';
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  loadUserSessions: async (page = 1, state) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.getUserSessions(page, 20, state);
      if (response.success && response.data) {
        const data = response.data;
        set({
          sessions: data.sessions,
          totalSessions: data.total,
          currentPage: data.page,
          totalPages: data.totalPages,
          isLoading: false,
        });
        return;
      }
      throw new Error(response.message || 'Failed to load sessions');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to load sessions';
      set({ isLoading: false, error: msg });
    }
  },

  startSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.start(session.id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().startTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to start session';
      set({ isLoading: false, error: msg });
    }
  },

  pauseSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.pause(session.id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().stopTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to pause session';
      set({ isLoading: false, error: msg });
    }
  },

  resumeSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.resume(session.id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().startTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to resume session';
      set({ isLoading: false, error: msg });
    }
  },

  completeSession: async (notes) => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.complete(session.id, notes);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().stopTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to complete session';
      set({ isLoading: false, error: msg });
    }
  },

  emergencyStop: async (reason) => {
    const session = get().activeSession;
    if (!session) return;
    try {
      const response = await sessionApi.emergencyStop(session.id, reason);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().stopTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Emergency stop failed';
      set({ error: msg });
    }
  },

  progressPhase: async (phase) => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.updatePhase(session.id, phase);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false, phaseElapsed: 0 });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update phase';
      set({ isLoading: false, error: msg });
    }
  },

  startSet: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.startSet(session.id);
      if (response.success) {
        await get().loadSession(session.id);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to start set';
      set({ isLoading: false, error: msg });
    }
  },

  completeSet: async (setId, feedback) => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.completeSet(session.id, setId, feedback);
      if (response.success) {
        await get().loadSession(session.id);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to complete set';
      set({ isLoading: false, error: msg });
    }
  },

  startTimer: () => {
    const existing = get().timerInterval;
    if (existing) clearInterval(existing);
    const interval = setInterval(() => {
      set((state) => ({
        elapsed: state.elapsed + 1,
        phaseElapsed: state.phaseElapsed + 1,
      }));
    }, 1000);
    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);
    set({ timerInterval: null });
  },

  resetTimer: () => {
    get().stopTimer();
    set({ elapsed: 0, phaseElapsed: 0 });
  },

  clearError: () => set({ error: null }),
  clearActiveSession: () => {
    get().stopTimer();
    set({ activeSession: null, elapsed: 0, phaseElapsed: 0 });
  },
}));
