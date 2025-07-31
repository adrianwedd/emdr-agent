#!/bin/bash

# Agentic EMDR App Setup Script
# This script initializes the development environment

set -e

echo "🧠 Setting up Agentic EMDR Therapy App..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed locally. You can use Docker instead."
    fi
    
    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        print_warning "Redis is not installed locally. You can use Docker instead."
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker is available for containerized development."
    else
        print_warning "Docker is not installed. Some features may require manual setup."
    fi
    
    print_success "Dependency check completed."
}

# Create directory structure
create_structure() {
    print_status "Creating project structure..."
    
    # Main directories
    mkdir -p frontend/{src,public,tests}
    mkdir -p backend/{src,tests,prisma}
    mkdir -p shared/{types,protocols,utils}
    mkdir -p docs
    mkdir -p scripts
    mkdir -p config/{docker,nginx}
    mkdir -p tests/{unit,integration,e2e}
    
    # Frontend subdirectories
    mkdir -p frontend/src/{components,agents,hooks,utils,types,services,assets}
    mkdir -p frontend/src/components/{BilateralStimulation,SessionManagement,AgentInterface,SafetyFeatures,Common}
    
    # Backend subdirectories
    mkdir -p backend/src/{agents,services,models,controllers,middleware,utils,types}
    mkdir -p backend/src/agents/{core,therapy,specialized}
    
    print_success "Project structure created."
}

# Initialize package.json files
init_packages() {
    print_status "Initializing package configurations..."
    
    # Root package.json is already created via artifact
    
    # Frontend package.json
    cat > frontend/package.json << 'EOF'
{
  "name": "emdr-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "typescript": "^5.1.6",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "axios": "^1.4.0",
    "socket.io-client": "^4.7.0",
    "framer-motion": "^10.12.0",
    "lucide-react": "^0.263.1",
    "zustand": "^4.3.8",
    "react-hook-form": "^7.45.0",
    "zod": "^3.21.4",
    "@hookform/resolvers": "^3.1.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0",
    "@types/node": "^20.3.1",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

    # Backend package.json
    cat > backend/package.json << 'EOF'
{
  "name": "emdr-backend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "typescript": "^5.1.6",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/compression": "^1.7.2",
    "@types/morgan": "^1.9.4",
    "prisma": "^5.1.1",
    "@prisma/client": "^5.1.1",
    "redis": "^4.6.7",
    "ioredis": "^5.3.2",
    "socket.io": "^4.7.2",
    "jsonwebtoken": "^9.0.1",
    "@types/jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.2",
    "joi": "^17.9.2",
    "winston": "^3.10.0",
    "axios": "^1.4.0",
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.4.0",
    "langchain": "^0.0.125",
    "uuid": "^9.0.0",
    "@types/uuid": "^9.0.2"
  },
  "devDependencies": {
    "@types/node": "^20.3.1",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "eslint": "^8.45.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.6.1",
    "@types/jest": "^29.5.3",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12"
  },
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "ts-node prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio"
  }
}
EOF

    # Shared package.json
    cat > shared/package.json << 'EOF'
{
  "name": "emdr-shared",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "typescript": "^5.1.6",
    "zod": "^3.21.4"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  }
}
EOF

    print_success "Package configurations initialized."
}

# Create configuration files
create_configs() {
    print_status "Creating configuration files..."
    
    # TypeScript config for root
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "resolveJsonModule": true
  },
  "include": ["shared/**/*"],
  "exclude": ["node_modules", "dist", "frontend", "backend"]
}
EOF

    # Frontend TypeScript config
    cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "jsx": "react-jsx",
    "declaration": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["../shared/types/*"],
      "@/protocols/*": ["../shared/protocols/*"],
      "@/utils/*": ["../shared/utils/*"]
    }
  },
  "include": [
    "src/**/*",
    "../shared/**/*"
  ],
  "exclude": ["node_modules", "dist"]
}
EOF

    # Backend TypeScript config
    cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["../shared/types/*"],
      "@/protocols/*": ["../shared/protocols/*"],
      "@/utils/*": ["../shared/utils/*"]
    }
  },
  "include": [
    "src/**/*",
    "../shared/**/*"
  ],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

    # ESLint configuration
    cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
EOF

    # Prettier configuration
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

    # Environment template
    cat > config/development.env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://emdr_user:emdr_password@localhost:5432/emdr_db

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# AI Service Configuration
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Application Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Safety Configuration
MAX_SESSION_DURATION=7200 # 2 hours in seconds
CRISIS_HOTLINE=988
EMERGENCY_CONTACT_EMAIL=crisis@your-organization.com

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Feature Flags
ENABLE_BIOMETRIC_MONITORING=false
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_PROFESSIONAL_INTEGRATION=false
EOF

    # Docker ignore
    cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.sass-cache
.DS_Store
*.log
dist
EOF

    # Git ignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
.nyc_output/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
tmp/
temp/

# Docker
.dockerignore
Dockerfile*

# Prisma
prisma/migrations/
!prisma/migrations/.gitkeep
EOF

    print_success "Configuration files created."
}

# Create initial project files
create_initial_files() {
    print_status "Creating initial project files..."
    
    # README
    cat > README.md << 'EOF'
# Agentic EMDR Therapy App

> **⚠️ IMPORTANT DISCLAIMER**: This application is designed for research and educational purposes only. It is NOT a replacement for professional mental health treatment. Always consult with a qualified mental health professional before using EMDR techniques.

## Quick Start

```bash
# Install dependencies
npm run install:all

# Copy environment configuration
cp config/development.env .env
# Edit .env with your configuration

# Start development servers
npm run dev
```

For detailed setup instructions, see the [full documentation](docs/SETUP.md).

## Project Structure

- `frontend/` - React TypeScript application
- `backend/` - Node.js TypeScript API server  
- `shared/` - Shared types and utilities
- `docs/` - Documentation
- `config/` - Configuration files
- `scripts/` - Utility scripts

## Key Features

- 🤖 AI-powered therapeutic agents
- 🛡️ Comprehensive safety monitoring
- 🎯 Adaptive EMDR protocols
- 🔄 Multi-modal bilateral stimulation
- 📊 Progress tracking and analytics
- 🚨 Crisis intervention protocols

## Development

```bash
# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## Safety First

This application implements multiple layers of safety protocols:
- Real-time distress monitoring
- Automatic grounding technique triggers
- Crisis intervention protocols
- Professional referral systems
- Emergency contact integration

## License

MIT License - see [LICENSE](LICENSE) file for details.
EOF

    # License file
    cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Agentic EMDR App

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

DISCLAIMER: This software is for educational and research purposes only. 
It is not intended as a substitute for professional medical or therapeutic advice, 
diagnosis, or treatment. Always seek the advice of qualified health providers 
with any questions you may have regarding a medical or mental health condition.
EOF

    # Basic Prisma schema
    cat > backend/prisma/schema.prisma << 'EOF'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User management
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  hashedPassword    String?
  firstName         String?
  lastName          String?
  isActive          Boolean  @default(true)
  emailVerified     Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // EMDR-specific fields
  safetyProfile     SafetyProfile?
  sessions          EMDRSession[]
  targetMemories    TargetMemory[]
  progressReports   ProgressReport[]

  @@map("users")
}

// Safety assessment and monitoring
model SafetyProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  riskLevel             RiskLevel @default(LOW)
  contraindications     String[]
  emergencyContacts     Json?
  professionalSupport   Json?
  crisisProtocols       Json?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("safety_profiles")
}

// Target memories for EMDR processing
model TargetMemory {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  description       String
  image             String?
  negativeCognition String
  positiveCognition String
  emotion           String
  bodyLocation      String?
  
  initialSUD        Int
  initialVOC        Int
  
  isActive          Boolean  @default(true)
  isResolved        Boolean  @default(false)
  
  sessions          EMDRSession[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("target_memories")
}

// EMDR therapy sessions
model EMDRSession {
  id                String        @id @default(cuid())
  userId            String
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetMemoryId    String
  targetMemory      TargetMemory  @relation(fields: [targetMemoryId], references: [id], onDelete: Cascade)
  
  phase             EMDRPhase
  state             SessionState  @default(PREPARING)
  
  startTime         DateTime?
  endTime           DateTime?
  totalDuration     Int?          // in seconds
  
  // Measurements
  initialSUD        Int
  currentSUD        Int?
  finalSUD          Int?
  initialVOC        Int
  currentVOC        Int?
  finalVOC          Int?
  
  // Session data
  preparationNotes  String?
  currentSetNumber  Int           @default(0)
  phaseData         Json?
  sessionData       Json?         // Additional session metadata
  
  // Related records
  sets              EMDRSet[]
  agentMessages     AgentMessage[]
  safetyChecks      SafetyCheck[]
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@map("emdr_sessions")
}

// Individual EMDR sets within a session
model EMDRSet {
  id                String      @id @default(cuid())
  sessionId         String
  session           EMDRSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  setNumber         Int
  startTime         DateTime
  endTime           DateTime?
  duration          Int?        // in seconds
  
  stimulationSettings Json      // BilateralStimulationSettings
  userFeedback        Json?     // User responses after the set
  agentObservations   Json?     // Agent observations
  
  createdAt         DateTime    @default(now())

  @@map("emdr_sets")
}

// Agent interactions and messages
model AgentMessage {
  id                String      @id @default(cuid())
  sessionId         String
  session           EMDRSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  agentId           String
  agentType         AgentType
  messageType       MessageType
  priority          Priority    @default(MEDIUM)
  
  content           Json        // Message content and metadata
  userResponse      Json?       // User's response if applicable
  
  responseRequired  Boolean     @default(false)
  responseReceived  Boolean     @default(false)
  status            MessageStatus @default(PENDING)
  
  timestamp         DateTime    @default(now())

  @@map("agent_messages")
}

// Safety monitoring and checks
model SafetyCheck {
  id                String      @id @default(cuid())
  sessionId         String
  session           EMDRSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  checkType         SafetyCheckType
  trigger           String?
  measurements      Json        // Safety measurements
  action            SafetyAction
  intervention      Json?       // Intervention details if any
  
  timestamp         DateTime    @default(now())

  @@map("safety_checks")
}

// Progress tracking over time
model ProgressReport {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  reportType        String   // weekly, monthly, outcome_based
  period            Json     // Date range for the report
  
  metrics           Json     // Progress metrics and analysis
  insights          Json     // AI-generated insights
  recommendations   String[]
  
  createdAt         DateTime @default(now())

  @@map("progress_reports")
}

// Enums
enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum EMDRPhase {
  PREPARATION
  ASSESSMENT
  DESENSITIZATION
  INSTALLATION
  BODY_SCAN
  CLOSURE
  REEVALUATION
  RESOURCE_INSTALLATION
}

enum SessionState {
  PREPARING
  IN_PROGRESS
  PAUSED
  COMPLETED
  EMERGENCY_STOPPED
}

enum AgentType {
  THERAPIST
  SESSION_ORCHESTRATOR
  SAFETY_MONITOR
  PROGRESS_ANALYST
  CRISIS_INTERVENTION
  RESOURCE_PREPARATION
  TRAUMA_ASSESSMENT
}

enum MessageType {
  GUIDANCE
  QUESTION
  ASSESSMENT
  INTERVENTION
  EDUCATION
  SAFETY_CHECK
  EMERGENCY_ALERT
  PROTOCOL_ADJUSTMENT
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
  CRITICAL
}

enum MessageStatus {
  PENDING
  DELIVERED
  ACKNOWLEDGED
  RESPONDED
  EXPIRED
}

enum SafetyCheckType {
  AUTOMATIC
  MANUAL
  TRIGGERED
  SCHEDULED
}

enum SafetyAction {
  CONTINUE
  PAUSE
  GROUNDING
  EMERGENCY_STOP
  PROFESSIONAL_REFERRAL
}
EOF

    # Basic backend entry point
    cat > backend/src/index.ts << 'EOF'
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
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
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
  console.log('Client connected:', socket.id);
  
  socket.on('join_session', (sessionId: string) => {
    socket.join(`session_${sessionId}`);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
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

// Start server
server.listen(PORT, () => {
  console.log(`🧠 Agentic EMDR API server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 WebSocket server ready for connections`);
});

export default app;
EOF

    # Basic frontend entry point
    mkdir -p frontend/src
    cat > frontend/src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

    cat > frontend/src/App.tsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Placeholder components
const Home = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        🧠 Agentic EMDR Therapy App
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        AI-powered EMDR therapy with intelligent therapeutic agents
      </p>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="text-left space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Multi-agent therapeutic system</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Adaptive EMDR protocols</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time safety monitoring</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Multi-modal bilateral stimulation</span>
          </div>
        </div>
      </div>
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>⚠️ Important:</strong> This is a research and educational tool.
          Always consult with qualified mental health professionals.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Additional routes will be added here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
EOF

    cat > frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Custom styles for EMDR components */
.bilateral-stimulation {
  @apply transition-all duration-300 ease-in-out;
}

.safety-alert {
  @apply bg-red-50 border-l-4 border-red-400 p-4;
}

.agent-message {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4;
}

.session-controls {
  @apply fixed bottom-6 left-1/2 transform -translate-x-1/2 
         bg-white shadow-lg rounded-full px-6 py-3 
         border border-gray-200;
}
EOF

    cat > frontend/src/App.css << 'EOF'
.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}

/* Animations for bilateral stimulation */
@keyframes bilateral-horizontal {
  0% { transform: translateX(-50px); }
  50% { transform: translateX(50px); }
  100% { transform: translateX(-50px); }
}

@keyframes bilateral-vertical {
  0% { transform: translateY(-30px); }
  50% { transform: translateY(30px); }
  100% { transform: translateY(-30px); }
}

.stimulation-dot {
  width: 20px;
  height: 20px;
  background-color: #3b82f6;
  border-radius: 50%;
  position: relative;
}

.stimulation-horizontal {
  animation: bilateral-horizontal 2s infinite ease-in-out;
}

.stimulation-vertical {
  animation: bilateral-vertical 2s infinite ease-in-out;
}

/* Safety and emergency styles */
.emergency-button {
  @apply bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full
         shadow-lg transition-colors duration-200;
}

.grounding-container {
  @apply bg-green-50 border border-green-200 rounded-lg p-6 m-4;
}

/* Agent interface styles */
.agent-avatar {
  @apply w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600
         flex items-center justify-center text-white font-semibold;
}

.therapy-session {
  @apply min-h-screen bg-gradient-to-br from-slate-50 to-blue-50;
}
EOF

    # Vite config for frontend
    cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/types': path.resolve(__dirname, '../shared/types'),
      '@/protocols': path.resolve(__dirname, '../shared/protocols'),
      '@/utils': path.resolve(__dirname, '../shared/utils'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
EOF

    # Tailwind config
    cat > frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        therapy: {
          calm: '#e0f2fe',
          focus: '#0ea5e9',
          alert: '#ef4444',
          safe: '#22c55e',
        },
      },
      animation: {
        'bilateral-horizontal': 'bilateral-horizontal 2s infinite ease-in-out',
        'bilateral-vertical': 'bilateral-vertical 2s infinite ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        'bilateral-horizontal': {
          '0%': { transform: 'translateX(-50px)' },
          '50%': { transform: 'translateX(50px)' },
          '100%': { transform: 'translateX(-50px)' },
        },
        'bilateral-vertical': {
          '0%': { transform: 'translateY(-30px)' },
          '50%': { transform: 'translateY(30px)' },
          '100%': { transform: 'translateY(-30px)' },
        },
      },
    },
  },
  plugins: [],
};
EOF

    # Frontend index.html
    cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="AI-powered EMDR therapy application with intelligent therapeutic agents" />
    <title>Agentic EMDR Therapy App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

    print_success "Initial project files created."
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    if npm install; then
        print_success "Root dependencies installed."
    else
        print_error "Failed to install root dependencies."
        exit 1
    fi
    
    # Install frontend dependencies
    cd frontend
    if npm install; then
        print_success "Frontend dependencies installed."
    else
        print_error "Failed to install frontend dependencies."
        exit 1
    fi
    cd ..
    
    # Install backend dependencies
    cd backend
    if npm install; then
        print_success "Backend dependencies installed."
    else
        print_error "Failed to install backend dependencies."
        exit 1
    fi
    cd ..
    
    # Install shared dependencies
    cd shared
    if npm install; then
        print_success "Shared dependencies installed."
    else
        print_error "Failed to install shared dependencies."
        exit 1
    fi
    cd ..
    
    print_success "All dependencies installed successfully."
}

# Generate initial documentation
generate_docs() {
    print_status "Generating documentation..."
    
    # Setup guide
    cat > docs/SETUP.md << 'EOF'
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
EOF

    cat > docs/SAFETY_GUIDELINES.md << 'EOF'
# Safety Guidelines - Agentic EMDR Therapy App

## ⚠️ Critical Safety Principles

### 1. Not a Medical Device
This application is for research and educational purposes only. It is NOT:
- A replacement for professional therapy
- A medical device or diagnostic tool
- Suitable for treating severe trauma without supervision
- Appropriate for individuals in crisis

### 2. Professional Supervision Recommended
- Initial assessment by qualified EMDR therapist
- Regular supervision during use
- Integration with existing treatment plans
- Professional interpretation of results

### 3. User Safety Protocols

#### Pre-Session Safety Assessment
- Risk assessment questionnaire
- Contraindication screening
- Resource availability check
- Emergency contact verification

#### During Session Monitoring
- Real-time SUD level tracking
- Dissociation detection
- Overwhelm response monitoring
- Automatic safety interventions

#### Post-Session Safety
- Grounding technique completion
- Resource state reinforcement
- Crisis risk assessment
- Follow-up planning

## Safety Features Implementation

### Automatic Safety Triggers

```typescript
// SUD level monitoring
if (sudLevel >= 8) {
  triggerSafetyIntervention('high_distress');
}

// Rapid distress increase
if (sudIncrease >= 3) {
  triggerSafetyIntervention('rapid_escalation');
}

// Dissociation indicators
if (dissociationScore >= 6) {
  triggerSafetyIntervention('dissociation_risk');
}
```

### Emergency Protocols
1. **Immediate Safety Stop**
2. **Grounding Technique Activation**
3. **Crisis Resource Connection**
4. **Professional Notification**
5. **Follow-up Scheduling**

### Contraindications
- Active psychosis
- Severe dissociative disorders
- Substance intoxication
- Acute suicidal ideation
- Unstable medical conditions

## Crisis Intervention

### Crisis Hotlines
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Local emergency services: 911

### Professional Referrals
- Licensed EMDR therapists
- Mental health crisis centers
- Hospital emergency departments
- Psychiatrists and psychologists

## Data Safety and Privacy

### Data Protection
- End-to-end encryption
- Anonymized processing
- HIPAA compliance measures
- Secure data transmission

### User Privacy Rights
- Data access and portability
- Deletion requests
- Consent management
- Third-party sharing controls

## Ethical Guidelines

### Informed Consent
- Clear explanation of limitations
- Risk disclosure
- Alternative treatment options
- Right to discontinue

### Therapeutic Boundaries
- No diagnosis or medical advice  
- Appropriate scope of intervention
- Professional referral recommendations
- Clear limitations communication

## Implementation Checklist

- [ ] Safety assessment integration
- [ ] Crisis intervention protocols
- [ ] Emergency contact systems
- [ ] Professional referral network
- [ ] Data protection measures
- [ ] User consent processes
- [ ] Ethics review completion
- [ ] Legal compliance verification

Remember: When in doubt, prioritize safety and professional consultation.
EOF

    print_success "Documentation generated."
}

# Final setup tasks
finalize_setup() {
    print_status "Finalizing setup..."
    
    # Create logs directory
    mkdir -p logs
    
    # Create placeholder for migrations
    mkdir -p backend/prisma/migrations
    touch backend/prisma/migrations/.gitkeep
    
    # Make scripts executable
    chmod +x setup.sh
    
    print_success "Setup finalization complete."
}

# Main execution
main() {
    echo "🚀 Starting Agentic EMDR App setup..."
    echo ""
    
    check_dependencies
    create_structure
    init_packages
    create_configs
    create_initial_files
    install_dependencies
    generate_docs
    finalize_setup
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Copy and configure environment variables:"
    echo "   cp config/development.env .env"  
    echo "   # Edit .env with your database and API keys"
    echo ""
    echo "2. Set up your database:"
    echo "   npm run db:migrate"
    echo ""
    echo "3. Start the development servers:"
    echo "   npm run dev"
    echo ""
    echo "4. Open your browser to:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:5000/health"
    echo ""
    print_warning "Remember: Configure your AI API keys in the .env file!"
    print_warning "Review the safety guidelines in docs/SAFETY_GUIDELINES.md"
    echo ""
    echo "Happy coding! 🧠✨"
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi