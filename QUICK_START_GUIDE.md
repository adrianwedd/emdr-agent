# EMDR Agent Quick Start Guide

## 🚀 For Developers Starting Today

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Redis (or Docker)
- OpenAI and/or Anthropic API keys

### Initial Setup (30 minutes)
```bash
# 1. Clone and install
git clone <repo-url>
cd emdr-agent
npm run install:all

# 2. Database setup
docker-compose up -d postgres redis  # OR use local installations
cp config/development.env .env
# Edit .env with your configuration

# 3. Run migrations
npm run db:migrate

# 4. Start development
npm run dev
```

### Current State
- ✅ Database schema complete
- ✅ Type system comprehensive  
- ✅ One agent (EMDRTherapistAgent) as reference
- ❌ No working services or API endpoints
- ❌ Frontend has only landing page

### Where to Start

#### Option A: Backend Developer
1. Start with **Issue #2** - Implement core services
   - Begin with `backend/src/services/PrismaService.ts`
   - Then `LLMService.ts` for AI integration
   - Follow the patterns in `EMDRTherapistAgent.ts`

2. Move to **Issue #3** - API Controllers
   - Start with auth endpoints
   - Use existing types from `shared/types/`

#### Option B: Frontend Developer  
1. Start with **Issue #4** - React Components
   - Begin with basic UI components
   - Use existing Tailwind animations in CSS
   - Follow TypeScript types in `shared/types/`

2. Move to **Issue #5** - State Management
   - Create Zustand stores
   - Start with AuthStore

#### Option C: Full-Stack Developer
1. Follow the weekly plan in `DEVELOPMENT_PLAN.md`
2. Start with Week 1 backend foundation
3. Alternate between backend and frontend tasks

### Key Files to Understand
1. `shared/types/Agent.ts` - Agent system design
2. `shared/types/EMDR.ts` - EMDR protocol types
3. `backend/prisma/schema.prisma` - Database structure
4. `backend/src/agents/therapy/EMDRTherapistAgent.ts` - Agent implementation pattern

### Development Commands
```bash
# Backend development
cd backend
npm run dev          # Start backend server
npm run type-check   # Check types
npm run test         # Run tests

# Frontend development  
cd frontend
npm run dev          # Start frontend
npm run type-check   # Check types
npm run test         # Run tests

# Database
npm run db:studio    # Visual database editor
npm run db:generate  # Update Prisma client
```

### Safety First Reminder
⚠️ This is a mental health application. Every feature must:
- Prioritize user safety
- Include proper error handling
- Have safety triggers where appropriate
- Be reviewed for clinical appropriateness

### Getting Help
- Check `ARCHITECTURE.md` for system design
- Review `SAFETY_GUIDELINES.md` for safety requirements
- Look at GitHub issues for implementation details
- Ask clinical advisor for therapy-specific questions

### Next Steps
1. Pick an issue from the GitHub project
2. Create a feature branch
3. Implement with safety in mind
4. Submit PR with comprehensive tests
5. Get code review + safety review

Remember: We're building something that handles vulnerable users in difficult moments. Quality and safety matter more than speed.