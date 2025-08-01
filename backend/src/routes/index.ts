import { Router } from 'express';
import authRoutes from './auth';
import { generalRateLimit, logRateLimitHits } from '../middleware';

const router = Router();

// Apply general rate limiting and logging to all API routes
router.use(generalRateLimit);
router.use(logRateLimitHits);

// Mount auth routes
router.use('/auth', authRoutes);

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Agentic EMDR API v0.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: '/api/auth/*',
      users: '/api/users/* (coming soon)',
      sessions: '/api/sessions/* (coming soon)',
      safety: '/api/safety/* (coming soon)',
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