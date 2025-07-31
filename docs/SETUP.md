# Setup Guide - Agentic EMDR Therapy App

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or Docker)
- Redis 6+ (or Docker)
- Git

## Quick Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd agentic-emdr-app
   npm run install:all
   ```

2. **Environment Configuration**
   ```bash
   cp config/development.env .env
   # Edit .env with your database and API keys
   ```

3. **Database Setup**
   ```bash
   # Using local PostgreSQL
   createdb emdr_db
   npm run db:migrate
   
   # Or using Docker
   docker-compose up -d postgres redis
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## API Keys Setup

You'll need API keys for AI services:

- **OpenAI**: Get from https://platform.openai.com/api-keys
- **Anthropic**: Get from https://console.anthropic.com/

Add these to your `.env` file:
```
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
```

## Docker Development

For a fully containerized setup:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access application
open http://localhost:3000
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists and user has permissions

### AI Service Issues
- Verify API keys are valid
- Check rate limits and quotas
- Monitor API service status

### Port Conflicts
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Change ports in configuration if needed.

## Next Steps

After setup:
1. Review [Architecture Documentation](ARCHITECTURE.md)
2. Understand [Agent Design](AGENT_DESIGN.md)
3. Study [Safety Guidelines](SAFETY_GUIDELINES.md)
4. Explore [API Reference](API_REFERENCE.md)
