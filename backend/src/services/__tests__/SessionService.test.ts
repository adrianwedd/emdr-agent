/**
 * SessionService Unit Tests
 *
 * Tests cover session creation, starting, phase progression, set completion,
 * session retrieval, and paginated user session listing. PrismaService,
 * SafetyProtocolService, logger, and typeAdapters are mocked.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockPrismaClient = {
  targetMemory: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  eMDRSession: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  eMDRSet: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../PrismaService', () => ({
  prismaService: {
    getClient: () => mockPrismaClient,
    handlePrismaError: (err: unknown) => err,
  },
}));

jest.mock('../SafetyProtocolService', () => ({
  safetyProtocolService: {
    assessCurrentState: jest.fn(),
    triggerManualCheck: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Type adapters: pass-through mocks
jest.mock('../../utils/typeAdapters', () => ({
  adaptPrismaSession: jest.fn((s: unknown) => s),
  adaptPrismaSessions: jest.fn((arr: unknown[]) => arr),
  adaptPrismaSet: jest.fn((s: unknown) => s),
}));

// Mock @prisma/client SessionState enum
jest.mock('@prisma/client', () => ({
  SessionState: {
    PREPARING: 'PREPARING',
    IN_PROGRESS: 'IN_PROGRESS',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    EMERGENCY_STOPPED: 'EMERGENCY_STOPPED',
  },
}));

// Mock shared EMDR types (values must match the real shared enum)
jest.mock('../../../../shared/types/EMDR', () => ({
  EMDRPhase: {
    PREPARATION: 'preparation',
    ASSESSMENT: 'assessment',
    DESENSITIZATION: 'desensitization',
    INSTALLATION: 'installation',
    BODY_SCAN: 'body_scan',
    CLOSURE: 'closure',
    REEVALUATION: 'reevaluation',
    RESOURCE_INSTALLATION: 'resource_installation',
  },
  BilateralStimulationType: {
    VISUAL: 'VISUAL',
    AUDITORY: 'AUDITORY',
    TACTILE: 'TACTILE',
    COMBINED: 'COMBINED',
  },
  SessionState: {
    PREPARING: 'PREPARING',
    IN_PROGRESS: 'IN_PROGRESS',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    EMERGENCY_STOPPED: 'EMERGENCY_STOPPED',
  },
  DistressLevel: {},
  ValidityOfCognition: {},
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { SessionService } from '../SessionService';
import { safetyProtocolService } from '../SafetyProtocolService';

// Convenience references (must match real shared enum values)
const EMDRPhase = {
  PREPARATION: 'preparation',
  ASSESSMENT: 'assessment',
  DESENSITIZATION: 'desensitization',
  INSTALLATION: 'installation',
  BODY_SCAN: 'body_scan',
  CLOSURE: 'closure',
  REEVALUATION: 'reevaluation',
  RESOURCE_INSTALLATION: 'resource_installation',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetSingleton() {
  (SessionService as any).instance = undefined;
}

function buildMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    userId: 'user-1',
    targetMemoryId: 'memory-1',
    phase: EMDRPhase.PREPARATION,
    state: 'PREPARING',
    initialSUD: 5,
    currentSUD: 5,
    initialVOC: 3,
    currentVOC: 3,
    currentSetNumber: 0,
    startTime: null,
    endTime: null,
    phaseData: {},
    sessionData: {},
    preparationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    targetMemory: { id: 'memory-1' },
    user: { safetyProfile: null },
    sets: [],
    safetyChecks: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();
    service = SessionService.getInstance();
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      const a = SessionService.getInstance();
      const b = SessionService.getInstance();
      expect(a).toBe(b);
    });
  });

  // =========================================================================
  // createSession
  // =========================================================================

  describe('createSession', () => {
    const validData = {
      userId: 'user-1',
      targetMemoryId: 'memory-1',
      initialSUD: 5,
      initialVOC: 3,
      preparationNotes: 'Test notes',
    };

    it('creates a session with PREPARING state and PREPARATION phase', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue(null); // no existing active session
      const mockCreated = buildMockSession();
      mockPrismaClient.eMDRSession.create.mockResolvedValue(mockCreated);

      const result = await service.createSession(validData);

      expect(mockPrismaClient.eMDRSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            targetMemoryId: 'memory-1',
            phase: EMDRPhase.PREPARATION,
            state: 'PREPARING',
            initialSUD: 5,
            currentSUD: 5,
            initialVOC: 3,
            currentVOC: 3,
            currentSetNumber: 0,
          }),
        })
      );
      expect(result).toBe(mockCreated);
    });

    it('passes initial SUD and VOC as current values', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue(null);
      mockPrismaClient.eMDRSession.create.mockResolvedValue(buildMockSession());

      await service.createSession(validData);

      const createCall = mockPrismaClient.eMDRSession.create.mock.calls[0][0];
      expect(createCall.data.currentSUD).toBe(validData.initialSUD);
      expect(createCall.data.currentVOC).toBe(validData.initialVOC);
    });

    it('includes targetMemory and user with safetyProfile in query', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue(null);
      mockPrismaClient.eMDRSession.create.mockResolvedValue(buildMockSession());

      await service.createSession(validData);

      const createCall = mockPrismaClient.eMDRSession.create.mock.calls[0][0];
      expect(createCall.include).toEqual({
        targetMemory: true,
        user: { include: { safetyProfile: true } },
      });
    });

    it('initializes session metrics in activeSessions map', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue(null);
      mockPrismaClient.eMDRSession.create.mockResolvedValue(buildMockSession());

      await service.createSession(validData);

      const metrics = service.getSessionMetrics('session-1');
      expect(metrics).not.toBeNull();
      expect(metrics!.sessionId).toBe('session-1');
      expect(metrics!.phase).toBe(EMDRPhase.PREPARATION);
      expect(metrics!.currentSet).toBe(0);
      expect(metrics!.sudProgress).toEqual(
        expect.arrayContaining([expect.objectContaining({ set: 0, sud: 5 })])
      );
      expect(metrics!.vocProgress).toEqual(
        expect.arrayContaining([expect.objectContaining({ set: 0, voc: 3 })])
      );
    });

    it('throws when initial SUD is out of range (negative)', async () => {
      await expect(
        service.createSession({ ...validData, initialSUD: -1 })
      ).rejects.toThrow('Initial SUD must be between 0 and 10');
    });

    it('throws when initial SUD is out of range (above 10)', async () => {
      await expect(
        service.createSession({ ...validData, initialSUD: 11 })
      ).rejects.toThrow('Initial SUD must be between 0 and 10');
    });

    it('throws when initial VOC is out of range (below 1)', async () => {
      await expect(
        service.createSession({ ...validData, initialVOC: 0 })
      ).rejects.toThrow('Initial VOC must be between 1 and 7');
    });

    it('throws when initial VOC is out of range (above 7)', async () => {
      await expect(
        service.createSession({ ...validData, initialVOC: 8 })
      ).rejects.toThrow('Initial VOC must be between 1 and 7');
    });

    it('throws when target memory is not found', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue(null);

      await expect(
        service.createSession(validData)
      ).rejects.toThrow('Target memory not found or not accessible');
    });

    it('throws when user already has an active session', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue({ id: 'existing-session' });

      await expect(
        service.createSession(validData)
      ).rejects.toThrow('User already has an active session');
    });

    it('includes preparationNotes in session data', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue(null);
      mockPrismaClient.eMDRSession.create.mockResolvedValue(buildMockSession());

      await service.createSession(validData);

      const createCall = mockPrismaClient.eMDRSession.create.mock.calls[0][0];
      expect(createCall.data.preparationNotes).toBe('Test notes');
    });
  });

  // =========================================================================
  // startSession
  // =========================================================================

  describe('startSession', () => {
    it('transitions session from PREPARING to IN_PROGRESS', async () => {
      (safetyProtocolService.assessCurrentState as jest.Mock).mockResolvedValue({
        recommendedAction: 'CONTINUE',
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue({ sessionData: {} });
      const mockUpdated = buildMockSession({ state: 'IN_PROGRESS', startTime: new Date() });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(mockUpdated);

      const result = await service.startSession('session-1');

      expect(mockPrismaClient.eMDRSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            state: 'IN_PROGRESS',
          }),
        })
      );
      expect(result).toBe(mockUpdated);
    });

    it('sets startTime when starting the session', async () => {
      (safetyProtocolService.assessCurrentState as jest.Mock).mockResolvedValue({
        recommendedAction: 'CONTINUE',
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue({ sessionData: {} });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(buildMockSession({ state: 'IN_PROGRESS' }));

      await service.startSession('session-1');

      const updateCall = mockPrismaClient.eMDRSession.update.mock.calls[0][0];
      expect(updateCall.data.startTime).toBeInstanceOf(Date);
    });

    it('runs safety check before starting', async () => {
      (safetyProtocolService.assessCurrentState as jest.Mock).mockResolvedValue({
        recommendedAction: 'CONTINUE',
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue({ sessionData: {} });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(buildMockSession({ state: 'IN_PROGRESS' }));

      await service.startSession('session-1');

      expect(safetyProtocolService.assessCurrentState).toHaveBeenCalledWith('session-1');
      // Safety check is called before the update
      expect(safetyProtocolService.assessCurrentState).toHaveBeenCalledTimes(1);
    });

    it('throws when safety check does not return CONTINUE', async () => {
      (safetyProtocolService.assessCurrentState as jest.Mock).mockResolvedValue({
        recommendedAction: 'EMERGENCY_STOP',
        intervention: { instructions: ['Stop immediately'] },
      });

      await expect(service.startSession('session-1')).rejects.toThrow(
        'Cannot start session due to safety concerns'
      );
      expect(mockPrismaClient.eMDRSession.update).not.toHaveBeenCalled();
    });

    it('throws when safety check returns PAUSE', async () => {
      (safetyProtocolService.assessCurrentState as jest.Mock).mockResolvedValue({
        recommendedAction: 'PAUSE',
        intervention: { instructions: ['Please wait'] },
      });

      await expect(service.startSession('session-1')).rejects.toThrow(
        'Cannot start session due to safety concerns'
      );
    });

    it('merges sessionData with started timestamp', async () => {
      (safetyProtocolService.assessCurrentState as jest.Mock).mockResolvedValue({
        recommendedAction: 'CONTINUE',
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue({
        sessionData: { config: { some: 'data' } },
      });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(buildMockSession({ state: 'IN_PROGRESS' }));

      await service.startSession('session-1');

      const updateCall = mockPrismaClient.eMDRSession.update.mock.calls[0][0];
      expect(updateCall.data.sessionData).toEqual(
        expect.objectContaining({
          config: { some: 'data' },
          started: expect.any(String),
        })
      );
    });
  });

  // =========================================================================
  // progressToNextPhase
  // =========================================================================

  describe('progressToNextPhase', () => {
    it('progresses from PREPARATION to ASSESSMENT', async () => {
      const session = buildMockSession({ phase: EMDRPhase.PREPARATION, currentSUD: 5 });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      const updatedSession = buildMockSession({ phase: EMDRPhase.ASSESSMENT });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(updatedSession);

      const result = await service.progressToNextPhase('session-1');

      expect(mockPrismaClient.eMDRSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            phase: EMDRPhase.ASSESSMENT,
            currentSetNumber: 0,
          }),
        })
      );
      expect(result.phase).toBe(EMDRPhase.ASSESSMENT);
    });

    it('progresses from ASSESSMENT to DESENSITIZATION when SUD > 0', async () => {
      const session = buildMockSession({ phase: EMDRPhase.ASSESSMENT, currentSUD: 5 });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      const updatedSession = buildMockSession({ phase: EMDRPhase.DESENSITIZATION });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(updatedSession);

      const result = await service.progressToNextPhase('session-1');

      expect(result.phase).toBe(EMDRPhase.DESENSITIZATION);
    });

    it('progresses from DESENSITIZATION to INSTALLATION when SUD <= 2', async () => {
      const session = buildMockSession({ phase: EMDRPhase.DESENSITIZATION, currentSUD: 2 });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      const updatedSession = buildMockSession({ phase: EMDRPhase.INSTALLATION });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(updatedSession);

      const result = await service.progressToNextPhase('session-1');

      expect(result.phase).toBe(EMDRPhase.INSTALLATION);
    });

    it('progresses from INSTALLATION to BODY_SCAN when VOC >= 6', async () => {
      const session = buildMockSession({
        phase: EMDRPhase.INSTALLATION,
        currentSUD: 1,
        currentVOC: 6,
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      const updatedSession = buildMockSession({ phase: EMDRPhase.BODY_SCAN });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(updatedSession);

      const result = await service.progressToNextPhase('session-1');

      expect(result.phase).toBe(EMDRPhase.BODY_SCAN);
    });

    it('progresses from BODY_SCAN to CLOSURE', async () => {
      const session = buildMockSession({ phase: EMDRPhase.BODY_SCAN, currentVOC: 7 });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      const updatedSession = buildMockSession({ phase: EMDRPhase.CLOSURE });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(updatedSession);

      const result = await service.progressToNextPhase('session-1');

      expect(result.phase).toBe(EMDRPhase.CLOSURE);
    });

    it('progresses from CLOSURE to REEVALUATION', async () => {
      const session = buildMockSession({ phase: EMDRPhase.CLOSURE });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      const updatedSession = buildMockSession({ phase: EMDRPhase.REEVALUATION });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(updatedSession);

      const result = await service.progressToNextPhase('session-1');

      expect(result.phase).toBe(EMDRPhase.REEVALUATION);
    });

    it('throws when trying to progress beyond REEVALUATION', async () => {
      const session = buildMockSession({ phase: EMDRPhase.REEVALUATION });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);

      await expect(
        service.progressToNextPhase('session-1')
      ).rejects.toThrow('Cannot progress beyond');
    });

    it('throws when session is not found', async () => {
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(null);

      await expect(
        service.progressToNextPhase('nonexistent')
      ).rejects.toThrow('Session not found');
    });

    it('throws when DESENSITIZATION requirements not met (SUD = 0)', async () => {
      const session = buildMockSession({ phase: EMDRPhase.ASSESSMENT, currentSUD: 0 });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);

      await expect(
        service.progressToNextPhase('session-1')
      ).rejects.toThrow('requirements not met');
    });

    it('throws when INSTALLATION requirements not met (SUD > 2)', async () => {
      const session = buildMockSession({ phase: EMDRPhase.DESENSITIZATION, currentSUD: 5 });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);

      await expect(
        service.progressToNextPhase('session-1')
      ).rejects.toThrow('requirements not met');
    });

    it('throws when BODY_SCAN requirements not met (VOC < 6)', async () => {
      const session = buildMockSession({
        phase: EMDRPhase.INSTALLATION,
        currentVOC: 4,
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);

      await expect(
        service.progressToNextPhase('session-1')
      ).rejects.toThrow('requirements not met');
    });

    it('resets set counter to 0 on phase progression', async () => {
      const session = buildMockSession({
        phase: EMDRPhase.PREPARATION,
        currentSetNumber: 5,
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      mockPrismaClient.eMDRSession.update.mockResolvedValue(
        buildMockSession({ phase: EMDRPhase.ASSESSMENT })
      );

      await service.progressToNextPhase('session-1');

      const updateCall = mockPrismaClient.eMDRSession.update.mock.calls[0][0];
      expect(updateCall.data.currentSetNumber).toBe(0);
    });

    it('stores phase notes and completion data in phaseData', async () => {
      const session = buildMockSession({
        phase: EMDRPhase.PREPARATION,
        currentSetNumber: 3,
        phaseData: { existingKey: 'existingValue' },
      });
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(session);
      mockPrismaClient.eMDRSession.update.mockResolvedValue(
        buildMockSession({ phase: EMDRPhase.ASSESSMENT })
      );

      await service.progressToNextPhase('session-1', 'Phase completed well');

      const updateCall = mockPrismaClient.eMDRSession.update.mock.calls[0][0];
      expect(updateCall.data.phaseData).toEqual(
        expect.objectContaining({
          existingKey: 'existingValue',
          [EMDRPhase.PREPARATION]: expect.objectContaining({
            notes: 'Phase completed well',
            sets: 3,
            completed: expect.any(String),
          }),
        })
      );
    });
  });

  // =========================================================================
  // completeSet
  // =========================================================================

  describe('completeSet', () => {
    const setData = {
      userFeedback: { comment: 'feeling better' },
      sudLevel: 3,
      vocLevel: 5,
      agentObservations: { engagement: 0.8 },
    };

    const mockExistingSet = {
      id: 'set-1',
      sessionId: 'session-1',
      startTime: new Date('2025-01-01T10:00:00Z'),
    };

    it('updates the set with completion data', async () => {
      const mockCompletedSet = { id: 'set-1', sessionId: 'session-1', endTime: new Date() };
      mockPrismaClient.eMDRSet.findUnique.mockResolvedValue(mockExistingSet);
      mockPrismaClient.eMDRSet.update.mockResolvedValue(mockCompletedSet);
      mockPrismaClient.eMDRSession.update.mockResolvedValue({});

      const result = await service.completeSet('session-1', 'set-1', setData);

      expect(mockPrismaClient.eMDRSet.findUnique).toHaveBeenCalledWith({ where: { id: 'set-1' } });
      expect(mockPrismaClient.eMDRSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'set-1' },
          data: expect.objectContaining({
            endTime: expect.any(Date),
            duration: expect.any(Number),
            userFeedback: setData.userFeedback,
            agentObservations: setData.agentObservations,
          }),
        })
      );
      expect(result).toBe(mockCompletedSet);
    });

    it('updates session SUD/VOC when provided', async () => {
      mockPrismaClient.eMDRSet.findUnique.mockResolvedValue(mockExistingSet);
      mockPrismaClient.eMDRSet.update.mockResolvedValue({ id: 'set-1' });
      mockPrismaClient.eMDRSession.update.mockResolvedValue({});

      await service.completeSet('session-1', 'set-1', setData);

      expect(mockPrismaClient.eMDRSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            currentSUD: 3,
            currentVOC: 5,
          }),
        })
      );
    });

    it('does not update session SUD/VOC when not provided', async () => {
      mockPrismaClient.eMDRSet.findUnique.mockResolvedValue(mockExistingSet);
      mockPrismaClient.eMDRSet.update.mockResolvedValue({ id: 'set-1' });

      await service.completeSet('session-1', 'set-1', {
        userFeedback: { comment: 'ok' },
      });

      expect(mockPrismaClient.eMDRSession.update).not.toHaveBeenCalled();
    });

    it('handles null feedback gracefully', async () => {
      mockPrismaClient.eMDRSet.findUnique.mockResolvedValue(mockExistingSet);
      mockPrismaClient.eMDRSet.update.mockResolvedValue({ id: 'set-1' });

      await service.completeSet('session-1', 'set-1', {});

      expect(mockPrismaClient.eMDRSet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userFeedback: null,
            agentObservations: null,
          }),
        })
      );
    });

    it('throws when set does not belong to session', async () => {
      mockPrismaClient.eMDRSet.findUnique.mockResolvedValue({
        ...mockExistingSet,
        sessionId: 'other-session',
      });

      await expect(
        service.completeSet('session-1', 'set-1', setData)
      ).rejects.toThrow('does not belong to session');
    });

    it('throws when set not found', async () => {
      mockPrismaClient.eMDRSet.findUnique.mockResolvedValue(null);

      await expect(
        service.completeSet('session-1', 'set-1', setData)
      ).rejects.toThrow('not found');
    });

    it('throws when database operation fails', async () => {
      mockPrismaClient.eMDRSet.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(
        service.completeSet('session-1', 'set-1', setData)
      ).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // getSession
  // =========================================================================

  describe('getSession', () => {
    it('returns session by ID with includes', async () => {
      const mockSession = buildMockSession();
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.getSession('session-1');

      expect(result).toBe(mockSession);
      expect(mockPrismaClient.eMDRSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          targetMemory: true,
          user: { include: { safetyProfile: true } },
          sets: { orderBy: { setNumber: 'asc' } },
          safetyChecks: { orderBy: { timestamp: 'desc' }, take: 5 },
        },
      });
    });

    it('returns null when session is not found', async () => {
      mockPrismaClient.eMDRSession.findUnique.mockResolvedValue(null);

      const result = await service.getSession('nonexistent');

      expect(result).toBeNull();
    });

    it('throws when database operation fails', async () => {
      mockPrismaClient.eMDRSession.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.getSession('session-1')).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // getUserSessions
  // =========================================================================

  describe('getUserSessions', () => {
    it('returns paginated sessions with total count', async () => {
      const mockSessions = [buildMockSession(), buildMockSession({ id: 'session-2' })];
      mockPrismaClient.eMDRSession.count.mockResolvedValue(2);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getUserSessions('user-1', 1, 20);

      expect(result.sessions).toEqual(mockSessions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('applies pagination correctly (skip and take)', async () => {
      mockPrismaClient.eMDRSession.count.mockResolvedValue(50);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue([]);

      await service.getUserSessions('user-1', 3, 10);

      expect(mockPrismaClient.eMDRSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        })
      );
    });

    it('calculates totalPages correctly', async () => {
      mockPrismaClient.eMDRSession.count.mockResolvedValue(25);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue([]);

      const result = await service.getUserSessions('user-1', 1, 10);

      expect(result.pagination.totalPages).toBe(3); // Math.ceil(25/10)
    });

    it('filters by state when provided', async () => {
      mockPrismaClient.eMDRSession.count.mockResolvedValue(5);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue([]);

      await service.getUserSessions('user-1', 1, 20, { state: 'COMPLETED' });

      expect(mockPrismaClient.eMDRSession.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', state: 'COMPLETED' },
      });
      expect(mockPrismaClient.eMDRSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', state: 'COMPLETED' },
        })
      );
    });

    it('uses default page and limit when not specified', async () => {
      mockPrismaClient.eMDRSession.count.mockResolvedValue(0);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue([]);

      const result = await service.getUserSessions('user-1');

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(mockPrismaClient.eMDRSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('orders sessions by createdAt descending', async () => {
      mockPrismaClient.eMDRSession.count.mockResolvedValue(0);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue([]);

      await service.getUserSessions('user-1');

      expect(mockPrismaClient.eMDRSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('includes targetMemory, sets, and safetyChecks', async () => {
      mockPrismaClient.eMDRSession.count.mockResolvedValue(0);
      mockPrismaClient.eMDRSession.findMany.mockResolvedValue([]);

      await service.getUserSessions('user-1');

      expect(mockPrismaClient.eMDRSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            targetMemory: true,
            sets: { orderBy: { setNumber: 'asc' } },
            safetyChecks: { orderBy: { timestamp: 'desc' }, take: 5 },
          }),
        })
      );
    });

    it('throws when database operation fails', async () => {
      mockPrismaClient.eMDRSession.count.mockRejectedValue(new Error('DB error'));

      await expect(service.getUserSessions('user-1')).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // getSessionMetrics
  // =========================================================================

  describe('getSessionMetrics', () => {
    it('returns null for unknown session', () => {
      const metrics = service.getSessionMetrics('unknown-session');
      expect(metrics).toBeNull();
    });

    it('returns metrics after session creation', async () => {
      mockPrismaClient.targetMemory.findFirst.mockResolvedValue({ id: 'memory-1', isActive: true });
      mockPrismaClient.eMDRSession.findFirst.mockResolvedValue(null);
      mockPrismaClient.eMDRSession.create.mockResolvedValue(buildMockSession());

      await service.createSession({
        userId: 'user-1',
        targetMemoryId: 'memory-1',
        initialSUD: 7,
        initialVOC: 2,
      });

      const metrics = service.getSessionMetrics('session-1');
      expect(metrics).not.toBeNull();
      expect(metrics!.duration).toBe(0);
      expect(metrics!.safetyEvents).toBe(0);
    });
  });

  // =========================================================================
  // updateSessionPhase
  // =========================================================================

  describe('updateSessionPhase', () => {
    it('updates session to valid phase', async () => {
      const mockUpdated = buildMockSession({ phase: EMDRPhase.DESENSITIZATION });
      mockPrismaClient.eMDRSession.update.mockResolvedValue(mockUpdated);

      const result = await service.updateSessionPhase('session-1', 'DESENSITIZATION', { note: 'test' });

      expect(mockPrismaClient.eMDRSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({
            phase: 'desensitization',
            phaseData: { note: 'test' },
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('throws for invalid phase', async () => {
      await expect(
        service.updateSessionPhase('session-1', 'INVALID_PHASE')
      ).rejects.toThrow('Invalid phase: INVALID_PHASE');
    });

    it('accepts all valid EMDR phases (uppercase and lowercase)', async () => {
      const uppercasePhases = [
        'PREPARATION', 'ASSESSMENT', 'DESENSITIZATION', 'INSTALLATION',
        'BODY_SCAN', 'CLOSURE', 'REEVALUATION',
      ];

      for (const phase of uppercasePhases) {
        mockPrismaClient.eMDRSession.update.mockResolvedValue(buildMockSession({ phase }));
        await expect(
          service.updateSessionPhase('session-1', phase)
        ).resolves.toBeDefined();
      }

      // Also accepts lowercase (shared enum values)
      for (const phase of Object.values(EMDRPhase)) {
        mockPrismaClient.eMDRSession.update.mockResolvedValue(buildMockSession({ phase }));
        await expect(
          service.updateSessionPhase('session-1', phase)
        ).resolves.toBeDefined();
      }
    });
  });
});
