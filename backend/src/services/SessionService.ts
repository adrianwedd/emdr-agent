import { prismaService } from './PrismaService';
import { safetyProtocolService } from './SafetyProtocolService';
import { logger } from '../utils/logger';
import { 
  EMDRPhase, 
  DistressLevel,
  ValidityOfCognition,
  BilateralStimulationType,
  EMDRSession,
  EMDRSet,
  TargetMemory
} from '../../../shared/types/EMDR';
import { SessionState } from '@prisma/client';

export interface CreateSessionData {
  userId: string;
  targetMemoryId: string;
  initialSUD: number;
  initialVOC: number;
  preparationNotes?: string;
}

export interface SessionConfig {
  bilateralStimulation: {
    type: BilateralStimulationType;
    speed: number;
    intensity: number;
    duration: number; // seconds per set
  };
  safetySettings: {
    autoCheckInterval: number; // minutes
    sudThreshold: number;
    maxSessionDuration: number; // minutes
  };
  protocolSettings: {
    maxSetsPerPhase: number;
    minBreakBetweenSets: number; // seconds
    adaptiveProtocol: boolean;
  };
}

export interface StartSetData {
  stimulationSettings: {
    type: BilateralStimulationType;
    speed: number;
    intensity: number;
    duration: number;
  };
}

export interface EndSetData {
  userFeedback: {
    sud: number;
    voc?: number;
    notes?: string;
    overwhelm?: boolean;
    dissociation?: boolean;
  };
  agentObservations?: {
    engagement: number;
    coherence: number;
    distress: number;
    notes: string;
  };
}

export interface SessionMetrics {
  sessionId: string;
  phase: EMDRPhase;
  currentSet: number;
  duration: number; // in minutes
  sudProgress: Array<{ set: number; sud: number; timestamp: Date }>;
  vocProgress: Array<{ set: number; voc: number; timestamp: Date }>;
  safetyEvents: number;
  lastActivity: Date;
}

export class SessionService {
  private static instance: SessionService;
  private prisma = prismaService.getClient();
  private activeSessions = new Map<string, SessionMetrics>();

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Create new EMDR session
   */
  public async createSession(data: CreateSessionData): Promise<EMDRSession> {
    try {
      logger.debug(`Creating session for user ${data.userId} with memory ${data.targetMemoryId}`);

      // Validate SUD and VOC ranges
      if (data.initialSUD < 0 || data.initialSUD > 10) {
        throw new Error('Initial SUD must be between 0 and 10');
      }
      if (data.initialVOC < 1 || data.initialVOC > 7) {
        throw new Error('Initial VOC must be between 1 and 7');
      }

      // Verify target memory exists and belongs to user
      const targetMemory = await this.prisma.targetMemory.findFirst({
        where: {
          id: data.targetMemoryId,
          userId: data.userId,
          isActive: true
        }
      });

      if (!targetMemory) {
        throw new Error('Target memory not found or not accessible');
      }

      // Check for existing active session
      const existingActiveSession = await this.prisma.eMDRSession.findFirst({
        where: {
          userId: data.userId,
          state: {
            in: ['PREPARING', 'IN_PROGRESS', 'PAUSED']
          }
        }
      });

      if (existingActiveSession) {
        throw new Error('User already has an active session. Please complete or end the current session first.');
      }

      // Create session
      const session = await this.prisma.eMDRSession.create({
        data: {
          userId: data.userId,
          targetMemoryId: data.targetMemoryId,
          phase: EMDRPhase.PREPARATION,
          state: SessionState.PREPARING,
          initialSUD: data.initialSUD,
          currentSUD: data.initialSUD,
          initialVOC: data.initialVOC,
          currentVOC: data.initialVOC,
          preparationNotes: data.preparationNotes,
          currentSetNumber: 0,
          phaseData: {},
          sessionData: {
            config: this.getDefaultSessionConfig(),
            created: new Date().toISOString()
          }
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      // Initialize session metrics
      this.activeSessions.set(session.id, {
        sessionId: session.id,
        phase: session.phase,
        currentSet: 0,
        duration: 0,
        sudProgress: [{ set: 0, sud: data.initialSUD, timestamp: new Date() }],
        vocProgress: [{ set: 0, voc: data.initialVOC, timestamp: new Date() }],
        safetyEvents: 0,
        lastActivity: new Date()
      });

      logger.info(`Session created: ${session.id} for user ${data.userId}`);
      return session as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Start session (move from PREPARING to IN_PROGRESS)
   */
  public async startSession(sessionId: string): Promise<EMDRSession> {
    try {
      logger.debug(`Starting session: ${sessionId}`);

      // Perform safety check before starting
      const safetyAssessment = await safetyProtocolService.assessCurrentState(sessionId);
      
      if (safetyAssessment.recommendedAction !== 'CONTINUE') {
        throw new Error(`Cannot start session due to safety concerns: ${safetyAssessment.intervention?.instructions?.[0] || 'Safety check failed'}`);
      }

      const session = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          state: SessionState.IN_PROGRESS,
          startTime: new Date(),
          sessionData: {
            ...((session as any)?.sessionData || {}),
            started: new Date().toISOString()
          }
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.lastActivity = new Date();
      }

      logger.info(`Session started: ${sessionId}`);
      return session as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to start session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Progress to next phase
   */
  public async progressToNextPhase(sessionId: string, phaseNotes?: string): Promise<EMDRSession> {
    try {
      logger.debug(`Progressing session ${sessionId} to next phase`);

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const currentPhase = session.phase;
      const nextPhase = this.getNextPhase(currentPhase);

      if (!nextPhase) {
        throw new Error(`Cannot progress beyond ${currentPhase}`);
      }

      // Validate phase progression
      if (!this.canProgressToPhase(currentPhase, nextPhase, session)) {
        throw new Error(`Cannot progress from ${currentPhase} to ${nextPhase} - requirements not met`);
      }

      // Update session
      const updatedSession = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          phase: nextPhase,
          phaseData: {
            ...((session as any).phaseData || {}),
            [currentPhase]: {
              completed: new Date().toISOString(),
              notes: phaseNotes,
              sets: session.currentSetNumber
            }
          },
          currentSetNumber: 0 // Reset set counter for new phase
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.phase = nextPhase;
        metrics.currentSet = 0;
        metrics.lastActivity = new Date();
      }

      logger.info(`Session ${sessionId} progressed to phase: ${nextPhase}`);
      return updatedSession as EMDRSession;
    } catch (error) {
      logger.error(`Failed to progress session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Start new bilateral stimulation set
   */
  public async startSet(sessionId: string, setData: StartSetData): Promise<EMDRSet> {
    try {
      logger.debug(`Starting set for session: ${sessionId}`);

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.state !== 'IN_PROGRESS') {
        throw new Error('Session must be in progress to start a set');
      }

      // Safety check before starting set
      const safetyAssessment = await safetyProtocolService.assessCurrentState(sessionId);
      if (safetyAssessment.recommendedAction === 'EMERGENCY_STOP') {
        throw new Error('Cannot start set due to safety concerns');
      }

      // Create new set
      const setNumber = session.currentSetNumber + 1;
      const emdrSet = await this.prisma.eMDRSet.create({
        data: {
          sessionId,
          setNumber,
          startTime: new Date(),
          stimulationSettings: setData.stimulationSettings
        }
      });

      // Update session
      await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          currentSetNumber: setNumber
        }
      });

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.currentSet = setNumber;
        metrics.lastActivity = new Date();
      }

      logger.info(`Set ${setNumber} started for session ${sessionId}`);
      return emdrSet as EMDRSet;
    } catch (error) {
      logger.error(`Failed to start set for session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * End current bilateral stimulation set
   */
  public async endSet(sessionId: string, endData: EndSetData): Promise<EMDRSet> {
    try {
      logger.debug(`Ending current set for session: ${sessionId}`);

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Find current active set
      const currentSet = await this.prisma.eMDRSet.findFirst({
        where: {
          sessionId,
          setNumber: session.currentSetNumber,
          endTime: null
        }
      });

      if (!currentSet) {
        throw new Error('No active set found');
      }

      // Validate SUD/VOC values
      if (endData.userFeedback.sud < 0 || endData.userFeedback.sud > 10) {
        throw new Error('SUD must be between 0 and 10');
      }
      if (endData.userFeedback.voc && (endData.userFeedback.voc < 1 || endData.userFeedback.voc > 7)) {
        throw new Error('VOC must be between 1 and 7');
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentSet.startTime.getTime()) / 1000);

      // Update set
      const updatedSet = await this.prisma.eMDRSet.update({
        where: { id: currentSet.id },
        data: {
          endTime,
          duration,
          userFeedback: endData.userFeedback,
          agentObservations: endData.agentObservations
        }
      });

      // Update session with new measurements
      await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          currentSUD: endData.userFeedback.sud,
          currentVOC: endData.userFeedback.voc || session.currentVOC
        }
      });

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.sudProgress.push({
          set: session.currentSetNumber,
          sud: endData.userFeedback.sud,
          timestamp: endTime
        });
        
        if (endData.userFeedback.voc) {
          metrics.vocProgress.push({
            set: session.currentSetNumber,
            voc: endData.userFeedback.voc,
            timestamp: endTime
          });
        }
        
        metrics.lastActivity = endTime;
      }

      // Check for safety concerns
      if (endData.userFeedback.overwhelm || endData.userFeedback.dissociation) {
        await safetyProtocolService.triggerManualCheck(
          sessionId, 
          `User reported ${endData.userFeedback.overwhelm ? 'overwhelm' : 'dissociation'} after set ${session.currentSetNumber}`
        );
      }

      logger.info(`Set ${session.currentSetNumber} completed for session ${sessionId} (SUD: ${endData.userFeedback.sud})`);
      return updatedSet as EMDRSet;
    } catch (error) {
      logger.error(`Failed to end set for session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Pause session
   */
  public async pauseSession(sessionId: string, reason?: string): Promise<EMDRSession> {
    try {
      logger.debug(`Pausing session: ${sessionId}`);

      const session = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          state: SessionState.PAUSED,
          sessionData: {
            ...((session as any)?.sessionData || {}),
            paused: new Date().toISOString(),
            pauseReason: reason
          }
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      logger.info(`Session paused: ${sessionId}${reason ? ` (${reason})` : ''}`);
      return session as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to pause session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Resume paused session
   */
  public async resumeSession(sessionId: string): Promise<EMDRSession> {
    try {
      logger.debug(`Resuming session: ${sessionId}`);

      // Safety check before resuming
      const safetyAssessment = await safetyProtocolService.assessCurrentState(sessionId);
      if (safetyAssessment.recommendedAction === 'EMERGENCY_STOP') {
        throw new Error('Cannot resume session due to safety concerns');
      }

      // Get current session data first
      const currentSession = await this.prisma.eMDRSession.findUnique({
        where: { id: sessionId },
        select: { sessionData: true }
      });

      const session = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          state: SessionState.IN_PROGRESS,
          sessionData: {
            ...((currentSession?.sessionData as any) || {}),
            resumed: new Date().toISOString()
          }
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.lastActivity = new Date();
      }

      logger.info(`Session resumed: ${sessionId}`);
      return session as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to resume session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Complete session
   */
  public async completeSession(sessionId: string, notes?: string): Promise<EMDRSession> {
    try {
      logger.debug(`Completing session: ${sessionId}`);

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const endTime = new Date();
      const totalDuration = session.startTime 
        ? Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)
        : 0;

      // Update session
      const completedSession = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          state: SessionState.COMPLETED,
          endTime,
          totalDuration,
          finalSUD: session.currentSUD,
          finalVOC: session.currentVOC,
          sessionData: {
            ...((session as any).sessionData || {}),
            completed: endTime.toISOString(),
            completionNotes: notes
          }
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          },
          sets: true,
          agentMessages: true,
          safetyChecks: true
        }
      });

      // Check if target memory should be marked as resolved
      if (session.currentSUD && session.currentSUD <= 2 && session.currentVOC && session.currentVOC >= 6) {
        await this.prisma.targetMemory.update({
          where: { id: session.targetMemoryId },
          data: { isResolved: true }
        });
        logger.info(`Target memory marked as resolved: ${session.targetMemoryId}`);
      }

      // Clean up session metrics
      this.activeSessions.delete(sessionId);

      logger.info(`Session completed: ${sessionId} (Duration: ${Math.round(totalDuration / 60)}min, Final SUD: ${session.currentSUD})`);
      return completedSession as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to complete session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Emergency stop session
   */
  public async emergencyStop(sessionId: string, reason: string): Promise<EMDRSession> {
    try {
      logger.warn(`Emergency stopping session: ${sessionId} - ${reason}`);

      // Get current session data first
      const currentSession = await this.prisma.eMDRSession.findUnique({
        where: { id: sessionId },
        select: { sessionData: true }
      });

      const session = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          state: SessionState.EMERGENCY_STOPPED,
          endTime: new Date(),
          sessionData: {
            ...((currentSession?.sessionData as any) || {}),
            emergencyStop: new Date().toISOString(),
            emergencyReason: reason
          }
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      // Clean up session metrics
      this.activeSessions.delete(sessionId);

      // Trigger safety assessment
      await safetyProtocolService.triggerManualCheck(sessionId, `Emergency stop: ${reason}`);

      logger.warn(`Session emergency stopped: ${sessionId}`);
      return session as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to emergency stop session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Get session by ID
   */
  public async getSession(sessionId: string): Promise<EMDRSession | null> {
    try {
      const session = await this.prisma.eMDRSession.findUnique({
        where: { id: sessionId },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          },
          sets: {
            orderBy: { setNumber: 'asc' }
          },
          safetyChecks: {
            orderBy: { timestamp: 'desc' },
            take: 5
          }
        }
      });

      return session as EMDRSession | null;
    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }


  /**
   * Get session metrics
   */
  public getSessionMetrics(sessionId: string): SessionMetrics | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get next phase in EMDR protocol
   */
  private getNextPhase(currentPhase: EMDRPhase): EMDRPhase | null {
    const phases = [
      EMDRPhase.PREPARATION,
      EMDRPhase.ASSESSMENT,
      EMDRPhase.DESENSITIZATION,
      EMDRPhase.INSTALLATION,
      EMDRPhase.BODY_SCAN,
      EMDRPhase.CLOSURE,
      EMDRPhase.REEVALUATION
    ];

    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  }

  /**
   * Check if can progress to next phase
   */
  private canProgressToPhase(currentPhase: EMDRPhase, nextPhase: EMDRPhase, session: any): boolean {
    switch (nextPhase) {
      case EMDRPhase.DESENSITIZATION:
        // Need assessment data
        return session.currentSUD > 0;
      
      case EMDRPhase.INSTALLATION:
        // Need SUD to be low enough
        return session.currentSUD <= 2;
      
      case EMDRPhase.BODY_SCAN:
        // Need positive cognition to be strong enough
        return session.currentVOC >= 6;
      
      default:
        return true;
    }
  }

  /**
   * Get default session configuration
   */
  private getDefaultSessionConfig(): SessionConfig {
    return {
      bilateralStimulation: {
        type: BilateralStimulationType.VISUAL,
        speed: 1.0,
        intensity: 0.7,
        duration: 30
      },
      safetySettings: {
        autoCheckInterval: 5,
        sudThreshold: 8,
        maxSessionDuration: 120
      },
      protocolSettings: {
        maxSetsPerPhase: 10,
        minBreakBetweenSets: 10,
        adaptiveProtocol: true
      }
    };
  }

  /**
   * Complete an EMDR set within a session
   */
  public async completeSet(sessionId: string, setId: string, setData: {
    userFeedback?: any;
    sudLevel?: number;
    vocLevel?: number;
    agentObservations?: any;
  }): Promise<any> {
    try {
      logger.debug(`Completing EMDR set ${setId} for session: ${sessionId}`);

      // Update the set with completion data
      const completedSet = await this.prisma.eMDRSet.update({
        where: { id: setId },
        data: {
          endTime: new Date(),
          duration: null, // Will be calculated based on start/end time
          userFeedback: setData.userFeedback || null,
          agentObservations: setData.agentObservations || null
        }
      });

      // Update session with new SUD/VOC levels if provided
      if (setData.sudLevel !== undefined || setData.vocLevel !== undefined) {
        await this.prisma.eMDRSession.update({
          where: { id: sessionId },
          data: {
            currentSUD: setData.sudLevel,
            currentVOC: setData.vocLevel,
            updatedAt: new Date()
          }
        });
      }

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.lastActivity = new Date();
        metrics.sets += 1;
      }

      logger.info(`EMDR set completed: ${setId} for session: ${sessionId}`);
      return completedSet as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to complete set ${setId} for session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Update session phase
   */
  public async updateSessionPhase(sessionId: string, phase: string, phaseData?: any): Promise<any> {
    try {
      logger.debug(`Updating session ${sessionId} to phase: ${phase}`);

      // Validate phase
      const validPhases = ['PREPARATION', 'ASSESSMENT', 'DESENSITIZATION', 'INSTALLATION', 'BODY_SCAN', 'CLOSURE', 'REEVALUATION'];
      if (!validPhases.includes(phase)) {
        throw new Error(`Invalid phase: ${phase}`);
      }

      // Update session phase
      const updatedSession = await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          phase: phase as any, // Cast to EMDRPhase enum
          phaseData: phaseData || null,
          updatedAt: new Date()
        },
        include: {
          targetMemory: true,
          user: {
            include: {
              safetyProfile: true
            }
          }
        }
      });

      // Update session metrics
      const metrics = this.activeSessions.get(sessionId);
      if (metrics) {
        metrics.lastActivity = new Date();
        metrics.phase = phase;
      }

      logger.info(`Session phase updated: ${sessionId} -> ${phase}`);
      return updatedSession as any; // TODO: Create proper type adapter
    } catch (error) {
      logger.error(`Failed to update phase for session ${sessionId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Get user sessions with proper pagination
   */
  public async getUserSessions(
    userId: string, 
    page: number = 1, 
    limit: number = 20, 
    filters?: { state?: string }
  ): Promise<{
    sessions: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      logger.debug(`Getting sessions for user ${userId} (page: ${page}, limit: ${limit})`);

      // Build where clause
      const where: any = { userId };
      if (filters?.state) {
        where.state = filters.state;
      }

      // Get total count for pagination
      const total = await this.prisma.eMDRSession.count({ where });

      // Get sessions with pagination
      const sessions = await this.prisma.eMDRSession.findMany({
        where,
        include: {
          targetMemory: true,
          sets: {
            orderBy: { setNumber: 'asc' }
          },
          safetyChecks: {
            orderBy: { timestamp: 'desc' },
            take: 5 // Only include recent safety checks
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const totalPages = Math.ceil(total / limit);

      logger.debug(`Retrieved ${sessions.length} sessions for user ${userId}`);
      return {
        sessions: sessions as any[], // TODO: Create proper type adapter
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      logger.error(`Failed to get sessions for user ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }
}

export const sessionService = SessionService.getInstance();