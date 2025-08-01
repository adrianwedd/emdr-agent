import { Request, Response } from 'express';
import { sessionService } from '../services';
import { logger } from '../utils/logger';

export class SessionController {
  /**
   * Create a new EMDR session
   */
  public static async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const sessionData = {
        userId: req.user.id,
        ...req.body
      };

      const session = await sessionService.createSession(sessionData);

      return res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully'
      });
    } catch (error) {
      logger.error('Create session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to create session'
      });
    }
  }

  /**
   * Get session by ID
   */
  public static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await sessionService.getSession(id);

      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
          message: 'The requested session does not exist'
        });
      }

      return res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Get session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve session'
      });
    }
  }

  /**
   * Get user's sessions with pagination
   */
  public static async getUserSessions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { page = 1, limit = 20, state } = req.query;
      const filters = state ? { state: state as string } : undefined;

      const sessions = await sessionService.getUserSessions(
        req.user.id,
        Number(page),
        Number(limit),
        filters
      );

      return res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      logger.error('Get user sessions failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve sessions'
      });
    }
  }

  /**
   * Start a session
   */
  public static async start(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await sessionService.startSession(id);

      return res.json({
        success: true,
        data: session,
        message: 'Session started successfully'
      });
    } catch (error) {
      logger.error('Start session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to start session'
      });
    }
  }

  /**
   * Pause a session
   */
  public static async pause(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await sessionService.pauseSession(id);

      return res.json({
        success: true,
        data: session,
        message: 'Session paused successfully'
      });
    } catch (error) {
      logger.error('Pause session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to pause session'
      });
    }
  }

  /**
   * Resume a session
   */
  public static async resume(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await sessionService.resumeSession(id);

      return res.json({
        success: true,
        data: session,
        message: 'Session resumed successfully'
      });
    } catch (error) {
      logger.error('Resume session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to resume session'
      });
    }
  }

  /**
   * Complete a session
   */
  public static async complete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const session = await sessionService.completeSession(id, notes);

      return res.json({
        success: true,
        data: session,
        message: 'Session completed successfully'
      });
    } catch (error) {
      logger.error('Complete session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to complete session'
      });
    }
  }

  /**
   * Emergency stop a session
   */
  public static async emergencyStop(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          error: 'Reason required',
          message: 'Emergency stop reason is required'
        });
      }

      const session = await sessionService.emergencyStop(id, reason);

      return res.json({
        success: true,
        data: session,
        message: 'Session emergency stopped'
      });
    } catch (error) {
      logger.error('Emergency stop session failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to emergency stop session'
      });
    }
  }

  /**
   * Start a new EMDR set within a session
   */
  public static async startSet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const setData = req.body;

      const set = await sessionService.startSet(id, setData);

      return res.json({
        success: true,
        data: set,
        message: 'EMDR set started successfully'
      });
    } catch (error) {
      logger.error('Start EMDR set failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to start EMDR set'
      });
    }
  }

  /**
   * Complete an EMDR set within a session
   */
  public static async completeSet(req: Request, res: Response) {
    try {
      const { id, setId } = req.params;
      const setData = req.body;

      const set = await sessionService.completeSet(id, setId, setData);

      return res.json({
        success: true,
        data: set,
        message: 'EMDR set completed successfully'
      });
    } catch (error) {
      logger.error('Complete EMDR set failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to complete EMDR set'
      });
    }
  }

  /**
   * Update session phase
   */
  public static async updatePhase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { phase, phaseData } = req.body;

      const session = await sessionService.updateSessionPhase(id, phase, phaseData);

      return res.json({
        success: true,
        data: session,
        message: 'Session phase updated successfully'
      });
    } catch (error) {
      logger.error('Update session phase failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update session phase'
      });
    }
  }
}