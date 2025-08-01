import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import sessionRoutes from './sessions';
import safetyRoutes from './safety';
import { generalRateLimit, logRateLimitHits } from '../middleware';

const router = Router();

// Apply general rate limiting and logging to all API routes
router.use(generalRateLimit);
router.use(logRateLimitHits);

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sessions', sessionRoutes);
router.use('/safety', safetyRoutes);

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Agentic EMDR API v0.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: '/api/auth/*',
      users: '/api/users/*',
      sessions: '/api/sessions/*',
      safety: '/api/safety/*',
      agents: '/api/agents/* (coming soon)'
    },
    documentation: '/api/docs (coming soon)',
    status: {
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Health check specific to API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '0.1.0'
  });
});

export default router;