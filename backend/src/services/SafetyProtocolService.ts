import { prismaService } from './PrismaService';
import { LLMService } from './LLMService';
import { logger } from '../utils/logger';
import { 
  SafetyCheckType, 
  SafetyAction, 
  RiskLevel,
  EMDRSession,
  SafetyCheck,
  DistressLevel
} from '../../../shared/types/EMDR';

export interface SafetyAssessment {
  sessionId: string;
  userId: string;
  riskLevel: RiskLevel;
  sudLevel: number;
  indicators: SafetyIndicator[];
  recommendedAction: SafetyAction;
  intervention?: SafetyIntervention;
  timestamp: Date;
}

export interface SafetyIndicator {
  type: 'distress' | 'dissociation' | 'overwhelm' | 'content' | 'physiological';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value?: number;
  threshold?: number;
}

export interface SafetyIntervention {
  type: 'grounding' | 'pause' | 'emergency_stop' | 'professional_referral';
  instructions: string[];
  resources?: CrisisResource[];
  followUpRequired: boolean;
  estimatedDuration?: number; // in minutes
}

export interface CrisisResource {
  name: string;
  type: 'hotline' | 'text' | 'professional' | 'emergency';
  contact: string;
  description: string;
  availability: string;
}

export interface GroundingTechnique {
  id: string;
  name: string;
  type: 'sensory' | 'breathing' | 'movement' | 'cognitive' | 'visualization';
  instructions: string[];
  duration: number; // in minutes
  effectiveness: number; // 0-1 based on user feedback
}

export class SafetyProtocolService {
  private static instance: SafetyProtocolService;
  private prisma = prismaService.getClient();
  private llmService?: LLMService;
  private groundingTechniques: GroundingTechnique[] = [];
  private crisisResources: CrisisResource[] = [];

  private constructor() {
    this.initializeGroundingTechniques();
    this.initializeCrisisResources();

    // Try to get LLM service for content analysis
    try {
      this.llmService = LLMService.getInstance();
    } catch (error) {
      logger.warn('LLM service not available for safety content analysis');
    }
  }

  public static getInstance(): SafetyProtocolService {
    if (!SafetyProtocolService.instance) {
      SafetyProtocolService.instance = new SafetyProtocolService();
    }
    return SafetyProtocolService.instance;
  }

  /**
   * Assess current safety state for a session
   */
  public async assessCurrentState(sessionId: string): Promise<SafetyAssessment> {
    try {
      logger.debug(`Assessing safety state for session ${sessionId}`);

      // Get current session data
      const session = await this.prisma.eMDRSession.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            include: {
              safetyProfile: true
            }
          },
          sets: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          safetyChecks: {
            orderBy: { timestamp: 'desc' },
            take: 5
          }
        }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Analyze current indicators
      const indicators = await this.analyzeSession(session);
      
      // Determine risk level
      const riskLevel = this.calculateRiskLevel(indicators, session);
      
      // Recommend action
      const recommendedAction = this.determineAction(riskLevel, indicators);
      
      // Create intervention if needed
      const intervention = this.createIntervention(recommendedAction, indicators);

      const assessment: SafetyAssessment = {
        sessionId,
        userId: session.userId,
        riskLevel,
        sudLevel: session.currentSUD || session.initialSUD,
        indicators,
        recommendedAction,
        intervention,
        timestamp: new Date()
      };

      // Record safety check in database
      await this.recordSafetyCheck(assessment);

      logger.info(`Safety assessment completed for session ${sessionId}`, {
        riskLevel,
        sudLevel: assessment.sudLevel,
        indicatorCount: indicators.length,
        action: recommendedAction
      });

      return assessment;
    } catch (error) {
      logger.error(`Safety assessment failed for session ${sessionId}:`, error);
      // Return conservative safe assessment on error
      return this.createEmergencyAssessment(sessionId);
    }
  }

  /**
   * Analyze session for safety indicators
   */
  private async analyzeSession(session: any): Promise<SafetyIndicator[]> {
    const indicators: SafetyIndicator[] = [];

    // Check SUD levels
    const currentSUD = session.currentSUD || session.initialSUD;
    if (currentSUD >= 8) {
      indicators.push({
        type: 'distress',
        severity: currentSUD >= 9 ? 'critical' : 'high',
        description: `High distress level: SUD ${currentSUD}/10`,
        value: currentSUD,
        threshold: 8
      });
    }

    // Check for rapid SUD increase
    if (session.sets && session.sets.length > 0) {
      const recentSet = session.sets[0];
      const sudChange = currentSUD - session.initialSUD;
      if (sudChange >= 3) {
        indicators.push({
          type: 'distress',
          severity: sudChange >= 5 ? 'critical' : 'high',
          description: `Rapid distress increase: +${sudChange} points`,
          value: sudChange,
          threshold: 3
        });
      }
    }

    // Check session duration
    if (session.startTime) {
      const durationMinutes = (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60);
      if (durationMinutes > 120) { // 2 hours
        indicators.push({
          type: 'overwhelm',
          severity: durationMinutes > 180 ? 'high' : 'medium',
          description: `Extended session duration: ${Math.round(durationMinutes)} minutes`,
          value: durationMinutes,
          threshold: 120
        });
      }
    }

    // Check user safety profile
    if (session.user.safetyProfile) {
      const profile = session.user.safetyProfile;
      if (profile.riskLevel === 'HIGH' || profile.riskLevel === 'CRITICAL') {
        indicators.push({
          type: 'overwhelm',
          severity: profile.riskLevel === 'CRITICAL' ? 'critical' : 'high',
          description: `High-risk user profile: ${profile.riskLevel}`,
        });
      }
    }

    // Check recent safety check patterns
    if (session.safetyChecks && session.safetyChecks.length > 0) {
      const recentChecks = session.safetyChecks.slice(0, 3);
      const emergencyActions = recentChecks.filter(check => 
        check.action === 'EMERGENCY_STOP' || check.action === 'PROFESSIONAL_REFERRAL'
      );
      
      if (emergencyActions.length > 0) {
        indicators.push({
          type: 'overwhelm',
          severity: 'critical',
          description: `Recent emergency interventions: ${emergencyActions.length}`,
        });
      }
    }

    return indicators;
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(indicators: SafetyIndicator[], session: any): RiskLevel {
    // Check for critical indicators
    const criticalIndicators = indicators.filter(i => i.severity === 'critical');
    if (criticalIndicators.length > 0) {
      return RiskLevel.CRITICAL;
    }

    // Check for high severity indicators
    const highIndicators = indicators.filter(i => i.severity === 'high');
    if (highIndicators.length >= 2) {
      return RiskLevel.HIGH;
    }
    if (highIndicators.length === 1) {
      return RiskLevel.MEDIUM;
    }

    // Check for medium indicators
    const mediumIndicators = indicators.filter(i => i.severity === 'medium');
    if (mediumIndicators.length >= 2) {
      return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
  }

  /**
   * Determine recommended safety action
   */
  private determineAction(riskLevel: RiskLevel, indicators: SafetyIndicator[]): SafetyAction {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return SafetyAction.EMERGENCY_STOP;
      
      case RiskLevel.HIGH:
        // Check if grounding might be sufficient
        const distressIndicators = indicators.filter(i => i.type === 'distress');
        if (distressIndicators.length === 1 && distressIndicators[0].value && distressIndicators[0].value < 9) {
          return SafetyAction.GROUNDING;
        }
        return SafetyAction.PAUSE;
      
      case RiskLevel.MEDIUM:
        return SafetyAction.GROUNDING;
      
      default:
        return SafetyAction.CONTINUE;
    }
  }

  /**
   * Create appropriate intervention
   */
  private createIntervention(action: SafetyAction, indicators: SafetyIndicator[]): SafetyIntervention | undefined {
    switch (action) {
      case SafetyAction.GROUNDING:
        return {
          type: 'grounding',
          instructions: this.getGroundingInstructions(indicators),
          followUpRequired: true,
          estimatedDuration: 5
        };

      case SafetyAction.PAUSE:
        return {
          type: 'pause',
          instructions: [
            'Let\'s pause the session for a moment.',
            'Take some deep breaths with me.',
            'Notice your feet on the floor and your body in the chair.',
            'We can continue when you feel ready, or end the session if you prefer.'
          ],
          followUpRequired: true,
          estimatedDuration: 10
        };

      case SafetyAction.EMERGENCY_STOP:
        return {
          type: 'emergency_stop',
          instructions: [
            'We\'re stopping the session immediately for your safety.',
            'You are safe right now in this moment.',
            'Let\'s focus on grounding techniques.',
            'Professional support is available if needed.'
          ],
          resources: this.crisisResources,
          followUpRequired: true
        };

      case SafetyAction.PROFESSIONAL_REFERRAL:
        return {
          type: 'professional_referral',
          instructions: [
            'I recommend connecting with a licensed mental health professional.',
            'This level of distress may benefit from professional support.',
            'You don\'t have to handle this alone.'
          ],
          resources: this.crisisResources.filter(r => r.type === 'professional'),
          followUpRequired: true
        };

      default:
        return undefined;
    }
  }

  /**
   * Get appropriate grounding instructions
   */
  private getGroundingInstructions(indicators: SafetyIndicator[]): string[] {
    // Default 5-4-3-2-1 technique
    const instructions = [
      'Let\'s try a grounding technique together.',
      'Look around and name 5 things you can see.',
      'Now notice 4 things you can touch.',
      'Listen for 3 things you can hear.',
      'Identify 2 things you can smell.',
      'Notice 1 thing you can taste.',
      'Take three deep breaths with me.'
    ];

    // Add specific instructions based on indicators
    const hasDistress = indicators.some(i => i.type === 'distress');
    if (hasDistress) {
      instructions.push('Remember: these feelings are temporary and will pass.');
    }

    return instructions;
  }

  /**
   * Record safety check in database
   */
  private async recordSafetyCheck(assessment: SafetyAssessment): Promise<void> {
    try {
      await this.prisma.safetyCheck.create({
        data: {
          sessionId: assessment.sessionId,
          checkType: SafetyCheckType.AUTOMATIC,
          measurements: {
            riskLevel: assessment.riskLevel,
            sudLevel: assessment.sudLevel,
            indicators: assessment.indicators,
            timestamp: assessment.timestamp
          },
          action: assessment.recommendedAction,
          intervention: assessment.intervention || null,
          timestamp: assessment.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to record safety check:', error);
      // Don't throw - safety assessment is more important than recording
    }
  }

  /**
   * Create emergency assessment when normal assessment fails
   */
  private createEmergencyAssessment(sessionId: string): SafetyAssessment {
    return {
      sessionId,
      userId: '', // Will be filled by caller if needed
      riskLevel: RiskLevel.HIGH,
      sudLevel: 8,
      indicators: [{
        type: 'overwhelm',
        severity: 'high',
        description: 'Safety assessment system error - conservative response activated'
      }],
      recommendedAction: SafetyAction.PAUSE,
      intervention: {
        type: 'pause',
        instructions: [
          'We\'re pausing for safety due to a system error.',
          'Please take some deep breaths.',
          'If you need immediate help, contact emergency services.'
        ],
        resources: this.crisisResources,
        followUpRequired: true
      },
      timestamp: new Date()
    };
  }

  /**
   * Initialize grounding techniques library
   */
  private initializeGroundingTechniques(): void {
    this.groundingTechniques = [
      {
        id: '5-4-3-2-1',
        name: '5-4-3-2-1 Sensory Grounding',
        type: 'sensory',
        instructions: [
          'Name 5 things you can see',
          'Name 4 things you can touch',
          'Name 3 things you can hear',
          'Name 2 things you can smell',
          'Name 1 thing you can taste'
        ],
        duration: 5,
        effectiveness: 0.85
      },
      {
        id: 'box-breathing',
        name: 'Box Breathing',
        type: 'breathing',
        instructions: [
          'Breathe in for 4 counts',
          'Hold for 4 counts',
          'Breathe out for 4 counts',
          'Hold for 4 counts',
          'Repeat 4 times'
        ],
        duration: 3,
        effectiveness: 0.8
      },
      {
        id: 'safe-place',
        name: 'Safe Place Visualization',
        type: 'visualization',
        instructions: [
          'Close your eyes if comfortable',
          'Imagine a place where you feel completely safe',
          'Notice the details - what you see, hear, feel',
          'Allow yourself to fully experience being there',
          'Know you can return to this place anytime'
        ],
        duration: 7,
        effectiveness: 0.75
      }
    ];
  }

  /**
   * Initialize crisis resources
   */
  private initializeCrisisResources(): void {
    this.crisisResources = [
      {
        name: 'National Suicide Prevention Lifeline',
        type: 'hotline',
        contact: '988',
        description: '24/7 crisis support and suicide prevention',
        availability: '24/7'
      },
      {
        name: 'Crisis Text Line',
        type: 'text',
        contact: 'Text HOME to 741741',
        description: '24/7 crisis support via text',
        availability: '24/7'
      },
      {
        name: 'Emergency Services',
        type: 'emergency',
        contact: '911',
        description: 'Immediate emergency assistance',
        availability: '24/7'
      },
      {
        name: 'EMDR Professional Directory',
        type: 'professional',
        contact: 'https://www.emdria.org/find-a-therapist/',
        description: 'Find licensed EMDR therapists',
        availability: 'Business hours'
      }
    ];
  }

  /**
   * Get available grounding techniques
   */
  public getGroundingTechniques(): GroundingTechnique[] {
    return [...this.groundingTechniques];
  }

  /**
   * Get crisis resources
   */
  public getCrisisResources(): CrisisResource[] {
    return [...this.crisisResources];
  }

  /**
   * Trigger manual safety check
   */
  public async triggerManualCheck(sessionId: string, reason: string): Promise<SafetyAssessment> {
    logger.info(`Manual safety check triggered for session ${sessionId}: ${reason}`);
    
    const assessment = await this.assessCurrentState(sessionId);
    
    // Update check type to manual
    await this.prisma.safetyCheck.updateMany({
      where: {
        sessionId,
        timestamp: assessment.timestamp
      },
      data: {
        checkType: SafetyCheckType.MANUAL,
        trigger: reason
      }
    });

    return assessment;
  }

  /**
   * Update safety measurements for a session
   */
  public async updateSafetyMeasurements(sessionId: string, measurements: any): Promise<any> {
    try {
      logger.debug(`Updating safety measurements for session: ${sessionId}`);

      // Create safety check record
      const safetyCheck = await this.prisma.safetyCheck.create({
        data: {
          sessionId,
          checkType: SafetyCheckType.AUTOMATIC,
          trigger: 'Measurement update',
          measurements,
          action: SafetyAction.CONTINUE,
          timestamp: new Date()
        }
      });

      logger.info(`Safety measurements updated for session: ${sessionId}`);
      return {
        sessionId,
        measurements,
        safetyCheckId: safetyCheck.id,
        updated: true,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Failed to update safety measurements for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get safety history for a session
   */
  public async getSafetyHistory(sessionId: string): Promise<SafetyCheck[]> {
    try {
      logger.debug(`Getting safety history for session: ${sessionId}`);

      const history = await this.prisma.safetyCheck.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' }
      });

      logger.debug(`Retrieved ${history.length} safety checks for session: ${sessionId}`);
      return history;
    } catch (error) {
      logger.error(`Failed to get safety history for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger emergency protocol
   */
  public async triggerEmergencyProtocol(sessionId: string, details: {
    reason: string;
    severity: string;
    triggeredBy: string;
  }): Promise<any> {
    try {
      logger.warn(`Emergency protocol triggered for session: ${sessionId} - ${details.reason}`);

      // Create emergency safety check
      const emergencyCheck = await this.prisma.safetyCheck.create({
        data: {
          sessionId,
          checkType: SafetyCheckType.EMERGENCY,
          trigger: details.reason,
          measurements: {
            severity: details.severity,
            triggeredBy: details.triggeredBy,
            timestamp: new Date().toISOString()
          },
          action: SafetyAction.EMERGENCY_STOP
        }
      });

      // Emergency stop the session
      await this.prisma.eMDRSession.update({
        where: { id: sessionId },
        data: {
          state: 'EMERGENCY_STOPPED',
          endTime: new Date(),
          sessionData: {
            emergencyStop: true,
            emergencyReason: details.reason,
            emergencyTime: new Date().toISOString()
          }
        }
      });

      logger.error(`Emergency protocol activated for session: ${sessionId}`);
      return {
        sessionId,
        emergencyCheckId: emergencyCheck.id,
        reason: details.reason,
        severity: details.severity,
        triggeredBy: details.triggeredBy,
        timestamp: new Date(),
        crisisResources: this.crisisResources
      };
    } catch (error) {
      logger.error(`Failed to trigger emergency protocol for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get grounding techniques for a user
   */
  public async getGroundingTechniques(options: {
    userId: string;
    category?: string;
    difficulty?: string;
  }): Promise<GroundingTechnique[]> {
    try {
      logger.debug(`Getting grounding techniques for user: ${options.userId}`);

      let techniques = [...this.groundingTechniques];

      // Filter by category if specified
      if (options.category) {
        techniques = techniques.filter(t => t.type === options.category);
      }

      // Sort by effectiveness
      techniques.sort((a, b) => (b.effectiveness || 0) - (a.effectiveness || 0));

      logger.debug(`Retrieved ${techniques.length} grounding techniques for user: ${options.userId}`);
      return techniques;
    } catch (error) {
      logger.error(`Failed to get grounding techniques for user ${options.userId}:`, error);
      throw error;
    }
  }

  /**
   * Report grounding technique effectiveness
   */
  public async reportGroundingEffectiveness(report: {
    userId: string;
    techniqueId: string;
    effectiveness: number;
    feedback?: string;
  }): Promise<void> {
    try {
      logger.debug(`Recording grounding technique effectiveness for user: ${report.userId}`);

      // For now, just log the effectiveness report
      // In a full implementation, this would update technique effectiveness scores
      // and personalize recommendations based on user feedback
      
      logger.info(`Grounding technique effectiveness reported:`, {
        userId: report.userId,
        techniqueId: report.techniqueId,
        effectiveness: report.effectiveness,
        feedback: report.feedback,
        timestamp: new Date()
      });

      // TODO: Implement effectiveness tracking in database
      // This would involve creating a new table for user technique preferences
      // and updating technique effectiveness scores based on user feedback
      
    } catch (error) {
      logger.error(`Failed to report grounding effectiveness for user ${report.userId}:`, error);
      throw error;
    }
  }

  /**
   * Get crisis resources
   */
  public async getCrisisResources(options: {
    userId: string;
    location?: string;
    type?: string;
  }): Promise<CrisisResource[]> {
    try {
      logger.debug(`Getting crisis resources for user: ${options.userId}`);

      let resources = [...this.crisisResources];

      // Filter by type if specified
      if (options.type) {
        resources = resources.filter(r => r.type === options.type);
      }

      // In a full implementation, this would:
      // 1. Get user's location preferences from their profile
      // 2. Filter resources by geographic availability
      // 3. Prioritize resources based on user's safety profile
      // 4. Include personalized emergency contacts from user's safety profile

      logger.debug(`Retrieved ${resources.length} crisis resources for user: ${options.userId}`);
      return resources;
    } catch (error) {
      logger.error(`Failed to get crisis resources for user ${options.userId}:`, error);
      throw error;
    }
  }
}

export const safetyProtocolService = SafetyProtocolService.getInstance();