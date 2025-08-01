import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';
import { 
  validate, 
  validationSchemas, 
  sanitize,
  authenticate,
  requireActiveAccount,
  requireSessionOwnership
} from '../middleware';
import { 
  generalRateLimit,
  sessionCreationRateLimit,
  emergencyRateLimit
} from '../middleware';

const router = Router();

/**
 * @route   POST /api/sessions
 * @desc    Create a new EMDR session
 * @access  Private
 */
router.post('/',
  sessionCreationRateLimit,
  authenticate,
  requireActiveAccount,
  sanitize,
  validate(validationSchemas.createSession),
  SessionController.create
);

/**
 * @route   GET /api/sessions
 * @desc    Get user's sessions with pagination
 * @access  Private
 */
router.get('/',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ query: validationSchemas.sessionQuery }),
  SessionController.getUserSessions
);

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session by ID
 * @access  Private
 */
router.get('/:id',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ params: validationSchemas.uuidParam }),
  requireSessionOwnership,
  SessionController.getById
);

/**
 * @route   POST /api/sessions/:id/start
 * @desc    Start a session
 * @access  Private
 */
router.post('/:id/start',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ params: validationSchemas.uuidParam }),
  requireSessionOwnership,
  SessionController.start
);

/**
 * @route   POST /api/sessions/:id/pause
 * @desc    Pause a session
 * @access  Private
 */
router.post('/:id/pause',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ params: validationSchemas.uuidParam }),
  requireSessionOwnership,
  SessionController.pause
);

/**
 * @route   POST /api/sessions/:id/resume
 * @desc    Resume a session
 * @access  Private
 */
router.post('/:id/resume',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ params: validationSchemas.uuidParam }),
  requireSessionOwnership,
  SessionController.resume
);

/**
 * @route   POST /api/sessions/:id/complete
 * @desc    Complete a session
 * @access  Private
 */
router.post('/:id/complete',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ 
    params: validationSchemas.uuidParam,
    body: validationSchemas.completeSession
  }),
  requireSessionOwnership,
  SessionController.complete
);

/**
 * @route   POST /api/sessions/:id/emergency-stop
 * @desc    Emergency stop a session
 * @access  Private
 */
router.post('/:id/emergency-stop',
  emergencyRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ 
    params: validationSchemas.uuidParam,
    body: validationSchemas.emergencyStop
  }),
  requireSessionOwnership,
  SessionController.emergencyStop
);

/**
 * @route   POST /api/sessions/:id/sets
 * @desc    Start a new EMDR set within a session
 * @access  Private
 */
router.post('/:id/sets',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ 
    params: validationSchemas.uuidParam,
    body: validationSchemas.startSet
  }),
  requireSessionOwnership,
  SessionController.startSet
);

/**
 * @route   PUT /api/sessions/:id/sets/:setId
 * @desc    Complete an EMDR set within a session
 * @access  Private
 */
router.put('/:id/sets/:setId',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ 
    params: validationSchemas.setParams,
    body: validationSchemas.completeSet
  }),
  requireSessionOwnership,
  SessionController.completeSet
);

/**
 * @route   PUT /api/sessions/:id/phase
 * @desc    Update session phase
 * @access  Private
 */
router.put('/:id/phase',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ 
    params: validationSchemas.uuidParam,
    body: validationSchemas.updatePhase
  }),
  requireSessionOwnership,
  SessionController.updatePhase
);

export default router;