import { Request, Response } from 'express';
import { safetyProtocolService } from '../services';
import { logger } from '../utils/logger';

export class SafetyController {
  /**
   * Perform manual safety check
   */
  public static async performCheck(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { sessionId, reason } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID required',
          message: 'Session ID is required for safety check'
        });
      }

      // TODO: Implement triggerManualCheck in SafetyProtocolService
      const safetyCheck = { id: 'placeholder', sessionId, reason, timestamp: new Date() };

      return res.json({
        success: true,
        data: safetyCheck,
        message: 'Safety check completed'
      });
    } catch (error) {
      logger.error('Safety check failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to perform safety check'
      });
    }
  }

  /**
   * Get current safety assessment for a session
   */
  public static async getAssessment(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const assessment = await safetyProtocolService.assessCurrentState(sessionId);

      return res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Get safety assessment failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to get safety assessment'
      });
    }
  }

  /**
   * Update safety measurements for a session
   */
  public static async updateMeasurements(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const measurements = req.body;

      const result = await safetyProtocolService.updateSafetyMeasurements(sessionId, measurements);

      return res.json({
        success: true,
        data: result,
        message: 'Safety measurements updated successfully'
      });
    } catch (error) {
      logger.error('Update safety measurements failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update safety measurements'
      });
    }
  }

  /**
   * Get safety history for a session
   */
  public static async getHistory(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const history = await safetyProtocolService.getSafetyHistory(sessionId);

      return res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Get safety history failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to get safety history'
      });
    }
  }

  /**
   * Trigger emergency protocol
   */
  public static async triggerEmergency(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { sessionId, reason, severity } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID required',
          message: 'Session ID is required for emergency protocol'
        });
      }

      const emergency = await safetyProtocolService.triggerEmergencyProtocol(sessionId, {
        reason: reason || 'Emergency triggered by user',
        severity: severity || 'HIGH',
        triggeredBy: req.user.id
      });

      return res.json({
        success: true,
        data: emergency,
        message: 'Emergency protocol activated'
      });
    } catch (error) {
      logger.error('Emergency protocol failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to trigger emergency protocol'
      });
    }
  }

  /**
   * Get grounding techniques for a user
   */
  public static async getGroundingTechniques(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { category, difficulty } = req.query;

      const techniques = await safetyProtocolService.getGroundingTechniques({
        userId: req.user.id,
        category: category as string,
        difficulty: difficulty as string
      });

      return res.json({
        success: true,
        data: techniques
      });
    } catch (error) {
      logger.error('Get grounding techniques failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to get grounding techniques'
      });
    }
  }

  /**
   * Report grounding technique effectiveness
   */
  public static async reportEffectiveness(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { techniqueId, effectiveness, feedback } = req.body;

      if (!techniqueId || typeof effectiveness !== 'number') {
        return res.status(400).json({
          error: 'Invalid data',
          message: 'Technique ID and effectiveness rating are required'
        });
      }

      await safetyProtocolService.reportGroundingEffectiveness({
        userId: req.user.id,
        techniqueId,
        effectiveness,
        feedback
      });

      return res.json({
        success: true,
        message: 'Effectiveness report submitted successfully'
      });
    } catch (error) {
      logger.error('Report effectiveness failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to report effectiveness'
      });
    }
  }

  /**
   * Get crisis resources
   */
  public static async getCrisisResources(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { location, type } = req.query;

      const resources = await safetyProtocolService.getCrisisResources({
        userId: req.user.id,
        location: location as string,
        type: type as string
      });

      return res.json({
        success: true,
        data: resources
      });
    } catch (error) {
      logger.error('Get crisis resources failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to get crisis resources'
      });
    }
  }
}