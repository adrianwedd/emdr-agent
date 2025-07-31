# Agentic EMDR App - Architecture Documentation

## Overview

The Agentic EMDR App is designed as a multi-agent system that provides personalized, AI-guided EMDR therapy sessions. The architecture emphasizes safety, adaptability, and evidence-based therapeutic practices while maintaining clear boundaries about the supplementary nature of the tool.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   (React/TS)    │◄──►│   (Node.js/TS)  │◄──►│   (LLM APIs)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Database      │              │
         └──────────────►│  (PostgreSQL)   │◄─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Cache/Queue   │
                        │    (Redis)      │
                        └─────────────────┘
```

### Agent System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Message Router  │  │ State Manager   │  │ Coordinator │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Therapist   │      │  Safety     │      │ Progress    │
│ Agent       │      │  Monitor    │      │ Analyst     │
└─────────────┘      └─────────────┘      └─────────────┘
        │                       │                       │
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Session     │      │ Crisis      │      │ Resource    │
│ Orchestrator│      │ Intervention│      │ Preparation │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Core Components

### 1. Agent System

#### Agent Types and Responsibilities

**EMDR Therapist Agent**

- Primary therapeutic guidance through EMDR phases
- Natural language interaction with users
- Protocol adaptation based on user responses
- Psychoeducation delivery
- Maintains therapeutic alliance

**Safety Monitor Agent**

- Continuous assessment of user distress levels
- Triggers safety interventions when needed
- Monitors for dissociation or overwhelming responses
- Implements grounding techniques
- Escalates to crisis protocols when necessary

**Session Orchestrator Agent**

- Manages session flow and timing
- Coordinates between different agents
- Handles phase transitions
- Manages bilateral stimulation parameters
- Tracks session progress and metrics

**Progress Analyst Agent**

- Analyzes user progress over time
- Tracks SUD and VOC changes
- Identifies patterns in user responses
- Provides insights for protocol optimization
- Generates progress reports

**Crisis Intervention Agent**

- Activated during high-risk situations
- Provides immediate safety interventions
- Connects users to emergency resources
- Documents crisis events
- Coordinates with professional referral system

#### Agent Communication Protocol

```typescript
// Message flow between agents
User Input → Message Router → Primary Agent → Agent Decision → Response Generation
                    ↓
            Safety Monitor (continuous)
                    ↓
            Crisis Intervention (if triggered)
                    ↓
            Coordination with other agents (as needed)
```

### 2. EMDR Protocol Engine

#### Phase Management

- **Preparation Phase**: Resource building, safety assessment, psychoeducation
- **Assessment Phase**: Target identification, baseline measurements (SUD/VOC)
- **Desensitization Phase**: Bilateral stimulation with memory processing
- **Installation Phase**: Positive cognition strengthening
- **Body Scan Phase**: Somatic processing and resolution
- **Closure Phase**: Session stabilization and grounding
- **Reevaluation Phase**: Progress assessment and planning

#### Adaptive Protocol Features

- Dynamic timing adjustments based on user responses
- Personalized bilateral stimulation optimization
- Protocol modification for different trauma types
- Integration of user preferences and capabilities
- Real-time safety monitoring and intervention

### 3. Bilateral Stimulation System

#### Multi-Modal Stimulation

**Visual Stimulation**

- Customizable moving objects (dots, bars, images)
- Adjustable speed, color, and movement patterns
- Background customization for user comfort
- Eye tracking integration (future enhancement)

**Auditory Stimulation**

- Alternating tones and sounds
- Binaural beats for enhanced processing
- Nature sounds and ambient audio
- Volume and frequency customization

**Tactile Stimulation**

- Vibration patterns for mobile devices
- Alternating haptic feedback
- Integration with specialized hardware (future)
- Customizable intensity and duration

### 4. Safety and Monitoring System

#### Real-Time Safety Monitoring

```typescript
interface SafetyMetrics {
  sudLevel: DistressLevel;
  responseTime: number;
  engagementLevel: number;
  dissociationIndicators: string[];
  physiologicalMarkers?: {
    heartRate?: number;
    breathingRate?: number;
  };
}
```

#### Safety Intervention Triggers

- SUD level > 8 (severe distress)
- Rapid SUD increase (>3 points in single set)
- Signs of dissociation or overwhelm
- User-initiated emergency stop
- Prolonged non-responsiveness
- Concerning content in user responses

#### Grounding Techniques Library

- 5-4-3-2-1 sensory grounding
- Progressive muscle relaxation
- Breathing exercises
- Visualization techniques
- Safe place imagery
- Resource state activation

### 5. Data Architecture

#### Database Schema (PostgreSQL)

```sql
-- Core user and session tables
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  -- Additional user fields
);

CREATE TABLE emdr_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  target_memory_id UUID,
  phase emdr_phase_enum,
  state session_state_enum,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  initial_sud INTEGER,
  current_sud INTEGER,
  final_sud INTEGER,
  initial_voc INTEGER,
  current_voc INTEGER,
  final_voc INTEGER,
  session_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent interactions and decisions
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY,
  agent_id VARCHAR,
  agent_type agent_type_enum,
  session_id UUID REFERENCES emdr_sessions(id),
  user_id UUID REFERENCES users(id),
  message_type message_type_enum,
  content JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Safety monitoring
CREATE TABLE safety_checks (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES emdr_sessions(id),
  check_type VARCHAR,
  measurements JSONB,
  action VARCHAR,
  intervention JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### Redis Cache Structure

```typescript
// Session state caching
"session:{sessionId}": EMDRSession
"agent_state:{agentId}": AgentState
"user_safety:{userId}": SafetyProfile

// Real-time metrics
"metrics:session:{sessionId}": SessionMetrics
"metrics:agent:{agentId}": AgentPerformanceMetrics

// Message queues
"queue:agent_messages": AgentMessage[]
"queue:safety_alerts": SafetyAlert[]
```

## Security and Privacy

### Data Protection

- End-to-end encryption for sensitive therapeutic data
- HIPAA-compliant data handling practices
- Anonymized analytics and research data
- User-controlled data retention policies
- Secure API communications (TLS 1.3)

### Access Control

- JWT-based authentication
- Role-based access control (RBAC)
- Session-based security tokens
- API rate limiting and abuse prevention
- Audit logging for all data access

### Privacy Measures

- Local processing where possible
- Minimal data collection principles
- Transparent privacy policies
- User consent management
- Right to data deletion

## Scalability and Performance

### Horizontal Scaling

- Containerized microservices architecture
- Load balancing across multiple instances
- Database read replicas for performance
- Redis clustering for cache scalability
- CDN integration for static assets

### Performance Optimization

- Agent response caching
- Database query optimization
- Real-time WebSocket connections
- Efficient bilateral stimulation rendering
- Background processing for analytics

### Monitoring and Observability

- Application performance monitoring (APM)
- Real-time error tracking
- User experience analytics
- Agent performance metrics
- System health dashboards

## Development Workflow

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
stages:
  - lint_and_test
  - security_scan
  - build_images  
  - deploy_staging
  - integration_tests
  - deploy_production
  - post_deploy_verification
```

### Testing Strategy

- Unit tests for agent logic
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Performance testing for bilateral stimulation
- Security penetration testing
- Accessibility testing (WCAG compliance)

### Code Quality

- TypeScript strict mode
- ESLint and Prettier configuration
- Husky git hooks for pre-commit checks
- SonarQube for code analysis
- Dependency vulnerability scanning

## Deployment Architecture

### Production Environment

```yaml
# Kubernetes deployment structure
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emdr-app-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: emdr-frontend
  template:
    spec:
      containers:
      - name: frontend
        image: emdr-app/frontend:latest
        ports:
        - containerPort: 3000
---
apiVersion: apps/v1  
kind: Deployment
metadata:
  name: emdr-app-backend
spec:
  replicas: 5
  # Backend deployment configuration
```

### Infrastructure as Code

- Terraform for cloud resource management
- Kubernetes for container orchestration
- Helm charts for application deployment
- Prometheus and Grafana for monitoring
- ELK stack for logging and analysis

## Future Enhancements

### Planned Features

1. **Advanced Biometric Integration**
   - Heart rate variability monitoring
   - Eye tracking for attention assessment
   - Galvanic skin response measurement

2. **Enhanced AI Capabilities**
   - Multimodal AI for gesture and expression analysis
   - Predictive modeling for session outcomes
   - Natural language understanding improvements

3. **Professional Integration**
   - Therapist dashboard and oversight tools
   - Professional referral network integration
   - Supervision and consultation features

4. **Research Platform**
   - Anonymized data contribution to research
   - Outcome tracking and analysis
   - Clinical trial integration capabilities

### Extensibility

- Plugin architecture for custom interventions
- API for third-party integrations  
- Customizable agent personalities
- Configurable safety protocols
- White-label deployment options

This architecture provides a robust foundation for an AI-powered EMDR therapy application that prioritizes safety, effectiveness, and user experience while maintaining the flexibility to evolve with advancing technology and clinical understanding.
