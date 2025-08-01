import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config();

// Import services
import { prismaService, createLLMService } from './services';
import { logger, logStream } from './utils/logger';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: logStream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing services...');
    
    // Connect to database
    await prismaService.connect();
    
    // Initialize LLM service
    if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
      createLLMService();
      logger.info('LLM service initialized');
    } else {
      logger.warn('No LLM API keys found - AI features will be disabled');
    }
    
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await prismaService.healthCheck();
    
    const health = {
      status: dbHealth.healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {
        database: {
          status: dbHealth.healthy ? 'up' : 'down',
          latency: dbHealth.latency,
          error: dbHealth.error
        }
      }
    };

    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'Agentic EMDR API',
    version: '0.1.0',
    documentation: '/api/docs'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join_session', (sessionId: string) => {
    socket.join(`session_${sessionId}`);
    logger.info(`Client ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('leave_session', (sessionId: string) => {
    socket.leave(`session_${sessionId}`);
    logger.info(`Client ${socket.id} left session ${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prismaService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await prismaService.shutdown();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize services first
    await initializeServices();
    
    // Then start the server
    server.listen(PORT, () => {
      logger.info(`🧠 Agentic EMDR API server running on port ${PORT}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📡 WebSocket server ready for connections`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;
