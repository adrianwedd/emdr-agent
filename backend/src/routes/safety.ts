import { Router } from 'express';
import { SafetyController } from '../controllers/SafetyController';
import { 
  validate, 
  validationSchemas, 
  sanitize,
  authenticate,
  requireActiveAccount
} from '../middleware';
import { 
  generalRateLimit,
  safetyCheckRateLimit,
  emergencyRateLimit
} from '../middleware';

const router = Router();

/**
 * @route   POST /api/safety/check
 * @desc    Perform manual safety check
 * @access  Private
 */
router.post('/check',
  safetyCheckRateLimit,
  authenticate,
  requireActiveAccount,
  sanitize,
  validate(validationSchemas.safetyCheck),
  SafetyController.performCheck
);

/**
 * @route   GET /api/safety/assessment/:sessionId
 * @desc    Get current safety assessment for a session
 * @access  Private
 */
router.get('/assessment/:sessionId',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ params: validationSchemas.sessionIdParam }),
  SafetyController.getAssessment
);

/**
 * @route   PUT /api/safety/measurements/:sessionId
 * @desc    Update safety measurements for a session
 * @access  Private
 */
router.put('/measurements/:sessionId',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  sanitize,
  validate({ 
    params: validationSchemas.sessionIdParam,
    body: validationSchemas.safetyMeasurements
  }),
  SafetyController.updateMeasurements
);

/**
 * @route   GET /api/safety/history/:sessionId
 * @desc    Get safety history for a session
 * @access  Private
 */
router.get('/history/:sessionId',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ params: validationSchemas.sessionIdParam }),
  SafetyController.getHistory
);

/**
 * @route   POST /api/safety/emergency
 * @desc    Trigger emergency protocol
 * @access  Private
 */
router.post('/emergency',
  emergencyRateLimit,
  authenticate,
  requireActiveAccount,
  sanitize,
  validate(validationSchemas.emergencyTrigger),
  SafetyController.triggerEmergency
);

/**
 * @route   GET /api/safety/grounding-techniques
 * @desc    Get grounding techniques for a user
 * @access  Private
 */
router.get('/grounding-techniques',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ query: validationSchemas.groundingQuery }),
  SafetyController.getGroundingTechniques
);

/**
 * @route   POST /api/safety/grounding-effectiveness
 * @desc    Report grounding technique effectiveness
 * @access  Private
 */
router.post('/grounding-effectiveness',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  sanitize,
  validate(validationSchemas.groundingEffectiveness),
  SafetyController.reportEffectiveness
);

/**
 * @route   GET /api/safety/crisis-resources
 * @desc    Get crisis resources
 * @access  Private
 */
router.get('/crisis-resources',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  validate({ query: validationSchemas.crisisResourcesQuery }),
  SafetyController.getCrisisResources
);

export default router;