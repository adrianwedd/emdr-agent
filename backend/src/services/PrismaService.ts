import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class PrismaService {
  private static instance: PrismaService;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'colorless',
    });
  }

  /**
   * Get singleton instance of PrismaService
   */
  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info('Successfully connected to database');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to database:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Disconnected from database');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Perform health check by executing a simple query
   */
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(
    fn: (prisma: any) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(fn);
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Handle Prisma errors and convert to user-friendly messages
   */
  public handlePrismaError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new Error(`Unique constraint violation: ${error.meta?.target}`);
        case 'P2014':
          return new Error('The change you are trying to make would violate a relation constraint');
        case 'P2003':
          return new Error('Foreign key constraint violation');
        case 'P2025':
          return new Error('Record not found');
        case 'P2016':
          return new Error('Query interpretation error');
        default:
          logger.error('Prisma known error:', { code: error.code, message: error.message });
          return new Error(`Database error: ${error.message}`);
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      logger.error('Prisma unknown error:', error.message);
      return new Error('An unknown database error occurred');
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      logger.error('Prisma rust panic:', error.message);
      return new Error('Database engine error');
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      logger.error('Prisma initialization error:', error.message);
      return new Error('Database initialization failed');
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error('Prisma validation error:', error.message);
      return new Error('Invalid database query parameters');
    }

    // Generic error fallback
    logger.error('Unexpected database error:', error);
    return new Error('An unexpected database error occurred');
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down database connection...');
    await this.disconnect();
  }
}

// Export singleton instance
export const prismaService = PrismaService.getInstance();