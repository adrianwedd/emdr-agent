# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Agentic EMDR Therapy Application** - a multi-agent AI system designed for research and educational purposes to guide users through EMDR (Eye Movement Desensitization and Reprocessing) therapy sessions. **Critical**: This is NOT a medical device and is NOT a replacement for professional therapy.

## Architecture

### Monorepo Structure
- `frontend/` - React TypeScript application with Vite, Tailwind CSS, and Zustand
- `backend/` - Node.js TypeScript API server with Express, Prisma, Socket.io
- `shared/` - Shared TypeScript types and utilities
- `config/` - Environment templates and configuration files
- `docs/` - Project documentation including safety guidelines

### Multi-Agent System
The core architecture centers around specialized AI agents:
- **EMDR Therapist Agent** (`backend/src/agents/therapy/EMDRTherapistAgent.ts`) - Primary therapeutic guidance
- **Safety Monitor Agent** - Continuous distress/safety monitoring
- **Session Orchestrator Agent** - Manages session flow and bilateral stimulation
- **Progress Analyst Agent** - Tracks user progress over time
- **Crisis Intervention Agent** - Handles emergency situations

### Database Schema (PostgreSQL + Prisma)
Key models in `backend/prisma/schema.prisma`:
- `User` - User accounts and profiles
- `EMDRSession` - Individual therapy sessions with phases, SUD/VOC tracking
- `TargetMemory` - Memories being processed through EMDR
- `AgentMessage` - All agent-user interactions
- `SafetyCheck` - Safety monitoring events
- `ProgressReport` - Progress tracking over time

## Development Commands

### Installation & Setup
```bash
npm run install:all          # Install all dependencies (root, frontend, backend, shared)
cp config/development.env .env   # Copy environment template
npm run db:migrate           # Run database migrations
```

### Development
```bash
npm run dev                  # Start both frontend (3000) and backend (5000) servers
npm run dev:frontend         # Start only frontend development server
npm run dev:backend          # Start only backend development server
```

### Testing & Quality
```bash
npm run test                 # Run all tests (frontend + backend)
npm run test:frontend        # Run frontend tests (Vitest)
npm run test:backend         # Run backend tests (Jest)
npm run lint                 # Run ESLint on all packages
npm run type-check           # Run TypeScript type checking
```

### Database Operations
```bash
npm run db:migrate           # Apply database migrations
npm run db:generate          # Generate Prisma client
npm run db:seed              # Seed database with initial data
npm run db:reset             # Reset database (careful!)
npm run db:studio            # Open Prisma Studio
```

### Production Build
```bash
npm run build               # Build all packages for production
npm run build:frontend      # Build frontend only
npm run build:backend       # Build backend only
```

## Key Technical Details

### Agent System (`shared/types/Agent.ts`)
- All agents implement `BaseAgent` interface
- Agent communication through `AgentMessage` system
- Real-time coordination between agents using `AgentCoordination`
- Comprehensive agent state management and memory systems

### EMDR Protocol Engine
- 8-phase EMDR protocol implementation (Preparation → Reevaluation)
- Real-time SUD (Subjective Units of Distress, 0-10) and VOC (Validity of Cognition, 1-7) tracking
- Multi-modal bilateral stimulation (visual, auditory, tactile)
- Adaptive protocol timing based on user responses

### Safety System
**Critical Safety Features**:
- Automatic safety triggers at SUD ≥ 8 or rapid distress increase
- Real-time dissociation monitoring
- Crisis intervention protocols with emergency contacts
- Professional referral system integration
- All safety logic in `backend/src/services/SafetyProtocolService.ts`

### WebSocket Integration
- Real-time communication via Socket.io
- Session-based connection management (`session_{sessionId}` rooms)
- Agent message broadcasting and user response handling

## Development Guidelines

### Safety First
- **Never bypass or disable safety protocols**
- Always prioritize user safety over functionality
- Review `docs/SAFETY_GUIDELINES.md` before making safety-related changes
- Test safety triggers thoroughly with unit tests

### Agent Development
- Extend `BaseAgent` interface for new agents
- Implement comprehensive decision-making logic in `makeDecision()`
- Use structured prompts for LLM interactions
- Store agent state and memory for context continuity

### Database Changes
- Always create migrations for schema changes: `npx prisma migrate dev --name descriptive_name`
- Update TypeScript types after schema changes: `npm run db:generate`
- Test migrations on development data before applying to production

### Testing Strategy
- Unit tests for agent logic and business rules
- Integration tests for API endpoints and database operations
- End-to-end tests for complete user workflows
- Performance tests for real-time bilateral stimulation
- **Mandatory**: Safety protocol testing for all agent interactions

### Code Quality Standards
- TypeScript strict mode enabled
- ESLint/Prettier configured across all packages
- Comprehensive error handling with Winston logging
- Type safety for all agent communications and database operations

## Environment Setup

Required environment variables in `.env`:
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
JWT_SECRET=your-secret
REDIS_URL=redis://localhost:6379
```

## Important Implementation Notes

### LLM Integration
- Agents use configurable LLM providers (OpenAI, Anthropic)
- System prompts emphasize safety and therapeutic boundaries
- Temperature and token limits configured per agent type
- Response validation for safety and appropriateness

### Real-time Features
- Session state synchronized via Redis caching
- WebSocket events for bilateral stimulation timing
- Live SUD/VOC tracking during processing sets
- Emergency stop capabilities with immediate response

### Data Privacy
- HIPAA compliance considerations throughout
- End-to-end encryption for sensitive therapeutic data
- User-controlled data retention and deletion
- Audit logging for all therapeutic interactions

When working on this codebase, always consider the therapeutic context and prioritize user safety above all other concerns. This system handles sensitive mental health data and must maintain the highest standards of safety and reliability.