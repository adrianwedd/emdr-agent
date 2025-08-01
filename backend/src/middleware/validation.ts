import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validation middleware factory
 */
export const validate = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid request body',
            details: bodyResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              received: issue.received
            }))
          });
        }
        req.body = bodyResult.data;
      }

      // Validate query parameters
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid query parameters',
            details: queryResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              received: issue.received
            }))
          });
        }
        req.query = queryResult.data;
      }

      // Validate route parameters
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid route parameters',
            details: paramsResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              received: issue.received
            }))
          });
        }
        req.params = paramsResult.data;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Validation failed due to server error'
      });
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // UUID parameter validation
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  // Pagination query validation
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1)
      .refine(val => val >= 1, 'Page must be >= 1'),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20)
      .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0)
      .refine(val => val >= 0, 'Offset must be >= 0')
  }),

  // SUD level validation (0-10)
  sudLevel: z.number()
    .min(0, 'SUD level must be between 0 and 10')
    .max(10, 'SUD level must be between 0 and 10'),

  // VOC level validation (1-7)
  vocLevel: z.number()
    .min(1, 'VOC level must be between 1 and 7')
    .max(7, 'VOC level must be between 1 and 7'),

  // Email validation
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password must contain both letters and numbers'),

  // Name validation
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  // Optional name validation
  optionalName: z.string()
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),

  // Session ID validation
  sessionId: z.object({
    sessionId: z.string().uuid('Invalid session ID format')
  }),

  // Memory description validation
  memoryDescription: z.string()
    .min(10, 'Memory description must be at least 10 characters')
    .max(1000, 'Memory description must be less than 1000 characters')
    .trim(),

  // Cognition validation
  cognition: z.string()
    .min(5, 'Cognition must be at least 5 characters')
    .max(200, 'Cognition must be less than 200 characters')
    .trim(),

  // Emotion validation
  emotion: z.string()
    .min(3, 'Emotion must be at least 3 characters')
    .max(100, 'Emotion must be less than 100 characters')
    .trim(),

  // Body location validation
  bodyLocation: z.string()
    .max(100, 'Body location must be less than 100 characters')
    .trim()
    .optional(),

  // Notes validation
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .trim()
    .optional(),

  // Risk level validation
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    errorMap: () => ({ message: 'Risk level must be LOW, MEDIUM, HIGH, or CRITICAL' })
  }),

  // Bilateral stimulation type validation
  stimulationType: z.enum(['VISUAL', 'AUDITORY', 'TACTILE'], {
    errorMap: () => ({ message: 'Stimulation type must be VISUAL, AUDITORY, or TACTILE' })
  }),

  // Emergency contact validation
  emergencyContact: z.object({
    name: commonSchemas.name,
    relationship: z.string().min(1, 'Relationship is required').max(50, 'Relationship must be less than 50 characters'),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,20}$/, 'Invalid phone number format'),
    email: commonSchemas.email.optional()
  })
};

// Validation schemas for specific endpoints
export const validationSchemas = {
  // Authentication schemas
  register: {
    body: z.object({
      email: commonSchemas.email,
      password: commonSchemas.password,
      firstName: commonSchemas.optionalName,
      lastName: commonSchemas.optionalName
    })
  },

  login: {
    body: z.object({
      email: commonSchemas.email,
      password: z.string().min(1, 'Password is required')
    })
  },

  refreshToken: {
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required')
    })
  },

  changePassword: {
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: commonSchemas.password
    })
  },

  // User schemas
  updateProfile: {
    body: z.object({
      firstName: commonSchemas.optionalName,
      lastName: commonSchemas.optionalName,
      email: commonSchemas.email.optional()
    }).refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided'
    })
  },

  updateSafetyProfile: {
    body: z.object({
      riskLevel: commonSchemas.riskLevel,
      contraindications: z.array(z.string().max(200)).max(20),
      emergencyContacts: z.array(commonSchemas.emergencyContact).max(5).optional(),
      professionalSupport: z.object({
        therapistName: commonSchemas.optionalName,
        therapistPhone: z.string().regex(/^\+?[\d\s\-\(\)]{10,20}$/).optional(),
        therapistEmail: commonSchemas.email.optional(),
        currentTreatment: z.string().max(500).optional(),
        medications: z.array(z.string().max(100)).max(20).optional()
      }).optional(),
      crisisProtocols: z.object({
        preferredGroundingTechniques: z.array(z.string().max(100)).max(10).optional(),
        triggerWarnings: z.array(z.string().max(200)).max(20).optional(),
        safetyPlan: z.string().max(2000).optional()
      }).optional()
    })
  },

  // Target memory schemas
  createTargetMemory: {
    body: z.object({
      description: commonSchemas.memoryDescription,
      image: z.string().max(500).optional(),
      negativeCognition: commonSchemas.cognition,
      positiveCognition: commonSchemas.cognition,
      emotion: commonSchemas.emotion,
      bodyLocation: commonSchemas.bodyLocation,
      initialSUD: commonSchemas.sudLevel,
      initialVOC: commonSchemas.vocLevel
    })
  },

  updateTargetMemory: {
    body: z.object({
      description: commonSchemas.memoryDescription.optional(),
      negativeCognition: commonSchemas.cognition.optional(),
      positiveCognition: commonSchemas.cognition.optional(),
      emotion: commonSchemas.emotion.optional(),
      bodyLocation: commonSchemas.bodyLocation,
      isResolved: z.boolean().optional()
    }).refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided'
    })
  },

  // Session schemas
  createSession: {
    body: z.object({
      targetMemoryId: z.string().uuid('Invalid target memory ID'),
      initialSUD: commonSchemas.sudLevel,
      initialVOC: commonSchemas.vocLevel,
      preparationNotes: commonSchemas.notes
    })
  },

  startSet: {
    body: z.object({
      stimulationSettings: z.object({
        type: commonSchemas.stimulationType,
        speed: z.number().min(0.1).max(3.0),
        intensity: z.number().min(0.1).max(1.0),
        duration: z.number().min(10).max(300) // 10 seconds to 5 minutes
      })
    })
  },

  endSet: {
    body: z.object({
      userFeedback: z.object({
        sud: commonSchemas.sudLevel,
        voc: commonSchemas.vocLevel.optional(),
        notes: commonSchemas.notes,
        overwhelm: z.boolean().optional(),
        dissociation: z.boolean().optional()
      }),
      agentObservations: z.object({
        engagement: z.number().min(0).max(1),
        coherence: z.number().min(0).max(1),
        distress: z.number().min(0).max(1),
        notes: z.string().max(1000)
      }).optional()
    })
  },

  progressPhase: {
    body: z.object({
      phaseNotes: commonSchemas.notes
    })
  },

  recordMeasurement: {
    body: z.object({
      sud: commonSchemas.sudLevel.optional(),
      voc: commonSchemas.vocLevel.optional(),
      notes: commonSchemas.notes
    }).refine(data => data.sud !== undefined || data.voc !== undefined, {
      message: 'Either SUD or VOC measurement must be provided'
    })
  },

  // Agent message schema
  sendMessage: {
    body: z.object({
      content: z.string().min(1, 'Message content is required').max(2000),
      type: z.enum(['QUESTION', 'RESPONSE', 'CONCERN'], {
        errorMap: () => ({ message: 'Invalid message type' })
      }).optional()
    })
  },

  // Safety schemas
  manualSafetyCheck: {
    body: z.object({
      reason: z.string().min(5, 'Reason must be at least 5 characters').max(500)
    })
  }
};

/**
 * Sanitize input data by removing potentially harmful content
 */
export const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    // Remove potentially harmful HTML/script content
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Sanitization middleware
 */
export const sanitize = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }
    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Data processing failed'
    });
  }
};