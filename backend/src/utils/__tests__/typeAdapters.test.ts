import {
  nullToUndefined,
  adaptPrismaSession,
  adaptPrismaSessions,
  adaptPrismaSet,
} from '../typeAdapters';

describe('nullToUndefined', () => {
  it('converts null values to undefined', () => {
    const input = { a: 'hello', b: null, c: 42, d: null };
    const result = nullToUndefined(input);
    expect(result).toEqual({ a: 'hello', b: undefined, c: 42, d: undefined });
    expect(result.b).toBeUndefined();
    expect(result.d).toBeUndefined();
  });

  it('preserves non-null values unchanged', () => {
    const input = { name: 'test', count: 0, active: false, tags: ['a', 'b'] };
    const result = nullToUndefined(input);
    expect(result).toEqual(input);
  });

  it('preserves empty string and zero', () => {
    const input = { str: '', num: 0, bool: false };
    const result = nullToUndefined(input);
    expect(result.str).toBe('');
    expect(result.num).toBe(0);
    expect(result.bool).toBe(false);
  });

  it('handles object with all null values', () => {
    const input = { a: null, b: null };
    const result = nullToUndefined(input);
    expect(result.a).toBeUndefined();
    expect(result.b).toBeUndefined();
  });

  it('handles object with no null values', () => {
    const input = { a: 1, b: 'two' };
    const result = nullToUndefined(input);
    expect(result).toEqual({ a: 1, b: 'two' });
  });

  it('does not recurse into nested objects', () => {
    const input = { nested: { inner: null }, top: null };
    const result = nullToUndefined(input);
    expect(result.top).toBeUndefined();
    // nested object is preserved as-is (not recursed into)
    expect(result.nested).toEqual({ inner: null });
  });
});

describe('adaptPrismaSession', () => {
  const basePrismaSession = {
    id: 'session-1',
    userId: 'user-1',
    targetMemoryId: 'tm-1',
    phase: 'PREPARATION',
    state: 'PREPARING',
    startTime: null,
    endTime: null,
    totalDuration: null,
    initialSUD: 7,
    currentSUD: null,
    finalSUD: null,
    initialVOC: 2,
    currentVOC: null,
    finalVOC: null,
    preparationNotes: null,
    currentSetNumber: 0,
    phaseData: null,
    sessionData: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  it('converts top-level null fields to undefined', () => {
    const result = adaptPrismaSession(basePrismaSession);
    expect(result.startTime).toBeUndefined();
    expect(result.endTime).toBeUndefined();
    expect(result.currentSUD).toBeUndefined();
    expect(result.finalSUD).toBeUndefined();
    expect(result.preparationNotes).toBeUndefined();
    // Non-null fields preserved
    expect(result.id).toBe('session-1');
    expect(result.initialSUD).toBe(7);
  });

  it('adapts nested targetMemory when present', () => {
    const session = {
      ...basePrismaSession,
      targetMemory: {
        id: 'tm-1',
        userId: 'user-1',
        description: 'A memory',
        image: null,
        negativeCognition: 'I am weak',
        positiveCognition: 'I am strong',
        emotion: 'fear',
        bodyLocation: null,
        initialSUD: 7,
        initialVOC: 2,
        isActive: true,
        isResolved: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    };
    const result = adaptPrismaSession(session);
    expect(result.targetMemory.image).toBeUndefined();
    expect(result.targetMemory.bodyLocation).toBeUndefined();
    expect(result.targetMemory.description).toBe('A memory');
  });

  it('adapts nested user when present', () => {
    const session = {
      ...basePrismaSession,
      user: {
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword: null,
        firstName: 'Jane',
        lastName: null,
        isActive: true,
        emailVerified: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    };
    const result = adaptPrismaSession(session);
    expect(result.user.hashedPassword).toBeUndefined();
    expect(result.user.lastName).toBeUndefined();
    expect(result.user.firstName).toBe('Jane');
  });

  it('strips hashedPassword from adapted user', () => {
    const session = {
      ...basePrismaSession,
      user: {
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword: '$2b$10$somehash',
        firstName: 'Jane',
        lastName: null,
        isActive: true,
        emailVerified: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    };
    const result = adaptPrismaSession(session);
    expect(result.user.hashedPassword).toBeUndefined();
    expect(result.user).not.toHaveProperty('hashedPassword');
    expect(result.user.firstName).toBe('Jane');
  });

  it('adapts nested sets array when present', () => {
    const session = {
      ...basePrismaSession,
      sets: [
        { id: 'set-1', sessionId: 'session-1', setNumber: 1, startTime: new Date('2025-01-01'), endTime: null, duration: null, stimulationSettings: {}, userFeedback: null, agentObservations: null, createdAt: new Date('2025-01-01') },
        { id: 'set-2', sessionId: 'session-1', setNumber: 2, startTime: new Date('2025-01-01'), endTime: new Date('2025-01-01'), duration: 30, stimulationSettings: {}, userFeedback: { rating: 'good' }, agentObservations: null, createdAt: new Date('2025-01-01') },
      ],
    };
    const result = adaptPrismaSession(session);
    expect(result.sets).toHaveLength(2);
    expect(result.sets[0].endTime).toBeUndefined();
    expect(result.sets[0].duration).toBeUndefined();
    expect(result.sets[0].userFeedback).toBeUndefined();
    expect(result.sets[1].endTime).toEqual(new Date('2025-01-01'));
    expect(result.sets[1].duration).toBe(30);
  });

  it('adapts nested safetyChecks array when present', () => {
    const session = {
      ...basePrismaSession,
      safetyChecks: [
        { id: 'sc-1', sessionId: 'session-1', timestamp: new Date('2025-01-01'), riskLevel: 'LOW', recommendedAction: 'CONTINUE', intervention: null, notes: null },
        { id: 'sc-2', sessionId: 'session-1', timestamp: new Date('2025-01-01'), riskLevel: 'HIGH', recommendedAction: 'PAUSE', intervention: { type: 'pause' }, notes: 'elevated distress' },
      ],
    };
    const result = adaptPrismaSession(session);
    expect(result.safetyChecks).toHaveLength(2);
    expect(result.safetyChecks[0].intervention).toBeUndefined();
    expect(result.safetyChecks[0].notes).toBeUndefined();
    expect(result.safetyChecks[1].intervention).toEqual({ type: 'pause' });
    expect(result.safetyChecks[1].notes).toBe('elevated distress');
  });

  it('adapts nested user with safetyProfile when present', () => {
    const session = {
      ...basePrismaSession,
      user: {
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword: null,
        firstName: null,
        lastName: null,
        isActive: true,
        emailVerified: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        safetyProfile: {
          id: 'sp-1',
          userId: 'user-1',
          riskLevel: 'LOW',
          contraindications: [],
          emergencyContacts: null,
          professionalSupport: null,
          crisisProtocols: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      },
    };
    const result = adaptPrismaSession(session);
    expect(result.user.safetyProfile.emergencyContacts).toBeUndefined();
    expect(result.user.safetyProfile.professionalSupport).toBeUndefined();
    expect(result.user.safetyProfile.riskLevel).toBe('LOW');
  });

  it('handles session without nested relations', () => {
    const result = adaptPrismaSession(basePrismaSession);
    expect(result.targetMemory).toBeUndefined();
    expect(result.user).toBeUndefined();
  });
});

describe('adaptPrismaSessions', () => {
  it('maps adaptPrismaSession over an array', () => {
    const sessions = [
      {
        id: 'session-1',
        userId: 'user-1',
        targetMemoryId: 'tm-1',
        phase: 'PREPARATION',
        state: 'PREPARING',
        startTime: null,
        endTime: null,
        totalDuration: null,
        initialSUD: 7,
        currentSUD: null,
        finalSUD: null,
        initialVOC: 2,
        currentVOC: null,
        finalVOC: null,
        preparationNotes: 'notes',
        currentSetNumber: 0,
        phaseData: null,
        sessionData: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      {
        id: 'session-2',
        userId: 'user-1',
        targetMemoryId: 'tm-2',
        phase: 'DESENSITIZATION',
        state: 'IN_PROGRESS',
        startTime: new Date('2025-01-02'),
        endTime: null,
        totalDuration: null,
        initialSUD: 5,
        currentSUD: 3,
        finalSUD: null,
        initialVOC: 4,
        currentVOC: 5,
        finalVOC: null,
        preparationNotes: null,
        currentSetNumber: 2,
        phaseData: null,
        sessionData: null,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
      },
    ];

    const result = adaptPrismaSessions(sessions);
    expect(result).toHaveLength(2);
    expect(result[0].startTime).toBeUndefined();
    expect(result[0].preparationNotes).toBe('notes');
    expect(result[1].startTime).toEqual(new Date('2025-01-02'));
    expect(result[1].preparationNotes).toBeUndefined();
    expect(result[1].currentSUD).toBe(3);
  });

  it('returns empty array for empty input', () => {
    expect(adaptPrismaSessions([])).toEqual([]);
  });
});

describe('adaptPrismaSet', () => {
  it('converts null fields to undefined on a set record', () => {
    const prismaSet = {
      id: 'set-1',
      sessionId: 'session-1',
      setNumber: 1,
      startTime: new Date('2025-01-01'),
      endTime: null,
      duration: null,
      stimulationSettings: { type: 'VISUAL', speed: 1.0 },
      userFeedback: null,
      agentObservations: null,
      createdAt: new Date('2025-01-01'),
    };

    const result = adaptPrismaSet(prismaSet);
    expect(result.endTime).toBeUndefined();
    expect(result.duration).toBeUndefined();
    expect(result.userFeedback).toBeUndefined();
    expect(result.agentObservations).toBeUndefined();
    // Non-null preserved
    expect(result.id).toBe('set-1');
    expect(result.setNumber).toBe(1);
    expect(result.stimulationSettings).toEqual({ type: 'VISUAL', speed: 1.0 });
  });

  it('preserves set with no null fields', () => {
    const prismaSet = {
      id: 'set-2',
      sessionId: 'session-1',
      setNumber: 2,
      startTime: new Date('2025-01-01'),
      endTime: new Date('2025-01-01'),
      duration: 30,
      stimulationSettings: { type: 'AUDITORY' },
      userFeedback: { rating: 'good' },
      agentObservations: { note: 'calm' },
      createdAt: new Date('2025-01-01'),
    };

    const result = adaptPrismaSet(prismaSet);
    expect(result.endTime).toEqual(new Date('2025-01-01'));
    expect(result.duration).toBe(30);
    expect(result.userFeedback).toEqual({ rating: 'good' });
  });
});
