import { prismaService } from './PrismaService';
import { logger } from '../utils/logger';
import { User, SafetyProfile, RiskLevel } from '@prisma/client';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  safetyProfile?: SafetyProfile;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface SafetyProfileData {
  riskLevel: RiskLevel;
  contraindications: string[];
  emergencyContacts?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }[];
  professionalSupport?: {
    therapistName?: string;
    therapistPhone?: string;
    therapistEmail?: string;
    currentTreatment?: string;
    medications?: string[];
  };
  crisisProtocols?: {
    preferredGroundingTechniques?: string[];
    triggerWarnings?: string[];
    safetyPlan?: string;
  };
}

export interface UserStats {
  totalSessions: number;
  completedSessions: number;
  averageSessionDuration: number;
  totalProcessingTime: number;
  lastSessionDate?: Date;
  progressMetrics: {
    avgInitialSUD: number;
    avgFinalSUD: number;
    improvementRate: number;
  };
}

export class UserService {
  private static instance: UserService;
  private prisma = prismaService.getClient();

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get user profile by ID
   */
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          safetyProfile: true
        }
      });

      if (!user) {
        return null;
      }

      // Remove sensitive data
      const { hashedPassword: _, ...userProfile } = user;
      return userProfile as UserProfile;
    } catch (error) {
      logger.error(`Failed to get user profile ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(userId: string, data: UpdateUserData): Promise<UserProfile> {
    try {
      logger.debug(`Updating user profile: ${userId}`);

      // Validate email if provided
      if (data.email && !this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      // Check if email is already taken (if changing email)
      if (data.email) {
        const existingUser = await this.prisma.user.findFirst({
          where: {
            email: data.email.toLowerCase(),
            id: { not: userId }
          }
        });

        if (existingUser) {
          throw new Error('Email is already in use');
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          email: data.email?.toLowerCase(),
          updatedAt: new Date()
        },
        include: {
          safetyProfile: true
        }
      });

      const { hashedPassword: _, ...userProfile } = updatedUser;

      logger.info(`User profile updated: ${userId}`);
      return userProfile as UserProfile;
    } catch (error) {
      logger.error(`Failed to update user profile ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Update user safety profile
   */
  public async updateSafetyProfile(userId: string, data: SafetyProfileData): Promise<SafetyProfile> {
    try {
      logger.debug(`Updating safety profile for user: ${userId}`);

      // Validate risk level
      if (!Object.values(RiskLevel).includes(data.riskLevel)) {
        throw new Error('Invalid risk level');
      }

      const safetyProfile = await this.prisma.safetyProfile.upsert({
        where: { userId },
        update: {
          riskLevel: data.riskLevel,
          contraindications: data.contraindications,
          emergencyContacts: data.emergencyContacts || null,
          professionalSupport: data.professionalSupport || null,
          crisisProtocols: data.crisisProtocols || null,
          updatedAt: new Date()
        },
        create: {
          userId,
          riskLevel: data.riskLevel,
          contraindications: data.contraindications,
          emergencyContacts: data.emergencyContacts || null,
          professionalSupport: data.professionalSupport || null,
          crisisProtocols: data.crisisProtocols || null
        }
      });

      logger.info(`Safety profile updated for user: ${userId} (Risk: ${data.riskLevel})`);
      return safetyProfile;
    } catch (error) {
      logger.error(`Failed to update safety profile for user ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(userId: string): Promise<UserStats> {
    try {
      const [
        totalSessions,
        completedSessions,
        sessionMetrics,
        lastSession
      ] = await Promise.all([
        // Total sessions
        this.prisma.eMDRSession.count({
          where: { userId }
        }),

        // Completed sessions
        this.prisma.eMDRSession.count({
          where: {
            userId,
            state: 'COMPLETED'
          }
        }),

        // Session metrics
        this.prisma.eMDRSession.aggregate({
          where: {
            userId,
            state: 'COMPLETED',
            startTime: { not: null },
            endTime: { not: null },
            initialSUD: { not: null },
            finalSUD: { not: null }
          },
          _avg: {
            totalDuration: true,
            initialSUD: true,
            finalSUD: true
          },
          _sum: {
            totalDuration: true
          }
        }),

        // Last session
        this.prisma.eMDRSession.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        })
      ]);

      // Calculate improvement rate
      const avgInitialSUD = sessionMetrics._avg.initialSUD || 0;
      const avgFinalSUD = sessionMetrics._avg.finalSUD || 0;
      const improvementRate = avgInitialSUD > 0 
        ? ((avgInitialSUD - avgFinalSUD) / avgInitialSUD) * 100 
        : 0;

      const stats: UserStats = {
        totalSessions,
        completedSessions,
        averageSessionDuration: Math.round(sessionMetrics._avg.totalDuration || 0),
        totalProcessingTime: sessionMetrics._sum.totalDuration || 0,
        lastSessionDate: lastSession?.createdAt,
        progressMetrics: {
          avgInitialSUD: Math.round((avgInitialSUD || 0) * 10) / 10,
          avgFinalSUD: Math.round((avgFinalSUD || 0) * 10) / 10,
          improvementRate: Math.round(improvementRate * 10) / 10
        }
      };

      return stats;
    } catch (error) {
      logger.error(`Failed to get user stats for ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Get user's target memories
   */
  public async getUserTargetMemories(userId: string) {
    try {
      const memories = await this.prisma.targetMemory.findMany({
        where: { userId },
        include: {
          sessions: {
            select: {
              id: true,
              state: true,
              createdAt: true,
              finalSUD: true
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return memories;
    } catch (error) {
      logger.error(`Failed to get target memories for user ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Create new target memory
   */
  public async createTargetMemory(userId: string, memoryData: {
    description: string;
    image?: string;
    negativeCognition: string;
    positiveCognition: string;
    emotion: string;
    bodyLocation?: string;
    initialSUD: number;
    initialVOC: number;
  }) {
    try {
      logger.debug(`Creating target memory for user: ${userId}`);

      // Validate SUD and VOC ranges
      if (memoryData.initialSUD < 0 || memoryData.initialSUD > 10) {
        throw new Error('Initial SUD must be between 0 and 10');
      }
      if (memoryData.initialVOC < 1 || memoryData.initialVOC > 7) {
        throw new Error('Initial VOC must be between 1 and 7');
      }

      const memory = await this.prisma.targetMemory.create({
        data: {
          userId,
          ...memoryData,
          isActive: true,
          isResolved: false
        }
      });

      logger.info(`Target memory created for user ${userId}: ${memory.id}`);
      return memory;
    } catch (error) {
      logger.error(`Failed to create target memory for user ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Update target memory
   */
  public async updateTargetMemory(memoryId: string, userId: string, updates: {
    description?: string;
    negativeCognition?: string;
    positiveCognition?: string;
    emotion?: string;
    bodyLocation?: string;
    isResolved?: boolean;
  }) {
    try {
      const memory = await this.prisma.targetMemory.update({
        where: {
          id: memoryId,
          userId // Ensure user owns this memory
        },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      logger.info(`Target memory updated: ${memoryId}`);
      return memory;
    } catch (error) {
      logger.error(`Failed to update target memory ${memoryId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Deactivate user account
   */
  public async deactivateAccount(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });

      logger.info(`User account deactivated: ${userId}`);
    } catch (error) {
      logger.error(`Failed to deactivate user account ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Delete user account and all associated data
   */
  public async deleteAccount(userId: string): Promise<void> {
    try {
      logger.warn(`Deleting user account and all data: ${userId}`);

      await this.prisma.$transaction(async (tx) => {
        // Delete in correct order due to foreign key constraints
        await tx.agentMessage.deleteMany({ where: { userId } });
        await tx.safetyCheck.deleteMany({ 
          where: { 
            session: { userId } 
          } 
        });
        await tx.eMDRSet.deleteMany({ 
          where: { 
            session: { userId } 
          } 
        });
        await tx.eMDRSession.deleteMany({ where: { userId } });
        await tx.progressReport.deleteMany({ where: { userId } });
        await tx.targetMemory.deleteMany({ where: { userId } });
        await tx.safetyProfile.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      });

      logger.warn(`User account and all data deleted: ${userId}`);
    } catch (error) {
      logger.error(`Failed to delete user account ${userId}:`, error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const userService = UserService.getInstance();