// shared/types/Agent.ts

export enum AgentType {
  THERAPIST = 'therapist',
  SESSION_ORCHESTRATOR = 'session_orchestrator',
  SAFETY_MONITOR = 'safety_monitor',
  PROGRESS_ANALYST = 'progress_analyst',
  CRISIS_INTERVENTION = 'crisis_intervention',
  RESOURCE_PREPARATION = 'resource_preparation',
  TRAUMA_ASSESSMENT = 'trauma_assessment'
}

export enum AgentState {
  IDLE = 'idle',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  WAITING_FOR_RESPONSE = 'waiting_for_response',
  EMERGENCY_MODE = 'emergency_mode',
  OFFLINE = 'offline'
}

export enum MessageType {
  GUIDANCE = 'guidance',
  QUESTION = 'question',
  ASSESSMENT = 'assessment',
  INTERVENTION = 'intervention',
  EDUCATION = 'education',
  SAFETY_CHECK = 'safety_check',
  EMERGENCY_ALERT = 'emergency_alert',
  PROTOCOL_ADJUSTMENT = 'protocol_adjustment'
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: 'assessment' | 'intervention' | 'monitoring' | 'guidance' | 'safety' | 'analysis';
  requiredContext: string[];
  outputTypes: string[];
}

export interface AgentPersonality {
  tone: 'professional' | 'warm' | 'encouraging' | 'direct' | 'gentle';
  empathyLevel: number; // 1-10
  directnessLevel: number; // 1-10
  supportivenessLevel: number; // 1-10
  language: {
    formality: 'casual' | 'professional' | 'clinical';
    complexity: 'simple' | 'moderate' | 'complex';
    culturalSensitivity: number; // 1-10
  };
  adaptability: number; // 1-10 - how much agent adapts to user
}

export interface AgentMemory {
  id: string;
  agentId: string;
  userId: string;
  sessionId?: string;
  memoryType: 'episodic' | 'semantic' | 'procedural' | 'working';
  content: {
    key: string;
    value: any;
    confidence: number; // 0-1
    relevance: number; // 0-1
    lastAccessed: Date;
    accessCount: number;
  };
  tags: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDecision {
  id: string;
  agentId: string;
  timestamp: Date;
  context: {
    sessionState: any;
    userState: any;
    environmentalFactors: any;
  };
  decisionType: 'intervention' | 'guidance' | 'protocol_adjustment' | 'safety_action';
  options: {
    option: string;
    probability: number;
    confidence: number;
    reasoning: string;
  }[];
  selectedOption: string;
  outcome?: {
    success: boolean;
    userResponse?: any;
    effectiveness: number; // 0-1
    sideEffects?: string[];
  };
  reasoning: string;
  confidenceLevel: number; // 0-1
}

export interface AgentMessage {
  id: string;
  agentId: string;
  agentType: AgentType;
  sessionId: string;
  userId: string;
  timestamp: Date;
  
  type: MessageType;
  priority: Priority;
  
  content: {
    text: string;
    metadata?: {
      phase?: string;
      context?: any;
      requiresResponse?: boolean;
      expectedResponseType?: string;
      timeout?: number;
    };
  };
  
  // For multi-modal messages
  attachments?: {
    type: 'audio' | 'visual' | 'haptic' | 'document';
    content: any;
    description?: string;
  }[];
  
  // Response tracking
  responseRequired: boolean;
  responseReceived?: boolean;
  userResponse?: {
    content: any;
    timestamp: Date;
    processingComplete: boolean;
  };
  
  // Agent coordination
  triggeredByAgentId?: string;
  relatedMessageIds?: string[];
  followUpRequired?: boolean;
  
  status: 'pending' | 'delivered' | 'acknowledged' | 'responded' | 'expired';
}

export interface AgentCoordination {
  id: string;
  sessionId: string;
  timestamp: Date;
  coordinationType: 'handoff' | 'collaboration' | 'escalation' | 'consultation';
  
  fromAgent: {
    agentId: string;
    agentType: AgentType;
  };
  
  toAgents: {
    agentId: string;
    agentType: AgentType;
    role: 'primary' | 'secondary' | 'observer';
  }[];
  
  context: {
    reason: string;
    urgency: Priority;
    requiredCapabilities: string[];
    sharedContext: any;
  };
  
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  outcome?: {
    success: boolean;
    duration: number;
    effectiveness: number;
    lessons: string[];
  };
}

export interface AgentConfiguration {
  id: string;
  agentType: AgentType;
  version: string;
  
  capabilities: AgentCapability[];
  personality: AgentPersonality;
  
  // Behavioral parameters
  parameters: {
    responseTime: {
      min: number;
      max: number;
      target: number;
    };
    interventionThresholds: {
      [metric: string]: number;
    };
    adaptationRate: number; // How quickly agent learns/adapts
    conservatismLevel: number; // 1-10, higher = more conservative
  };
  
  // Knowledge base
  knowledgeBase: {
    protocols: string[];
    techniques: string[];
    safetyGuidelines: string[];
    culturalConsiderations: string[];
  };
  
  // Integration settings
  integrations: {
    llmProvider: 'openai' | 'anthropic' | 'local';
    modelVersion: string;
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Learning and improvement
  learningEnabled: boolean;
  feedbackLoop: {
    collectUserFeedback: boolean;
    collectOutcomeData: boolean;
    updateFrequency: 'session' | 'daily' | 'weekly';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  agentType: AgentType;
  period: {
    start: Date;
    end: Date;
  };
  
  // Response metrics
  responseMetrics: {
    averageResponseTime: number;
    responseAccuracy: number;
    userSatisfaction: number;
    interventionEffectiveness: number;
  };
  
  // Safety metrics
  safetyMetrics: {
    safetyViolations: number;
    falsePositives: number;
    falseNegatives: number;
    appropriateEscalations: number;
  };
  
  // Collaboration metrics
  collaborationMetrics: {
    successfulHandoffs: number;
    coordinationEfficiency: number;
    conflictResolutions: number;
  };
  
  // Learning metrics
  learningMetrics: {
    adaptationRate: number;
    accuracyImprovement: number;
    knowledgeRetention: number;
  };
  
  // User interaction metrics
  userMetrics: {
    engagementLevel: number;
    trustScore: number;
    followThroughRate: number;
  };
}

export interface AgentState {
  agentId: string;
  agentType: AgentType;
  currentState: AgentState;
  
  // Current context
  activeSession?: {
    sessionId: string;
    userId: string;
    phase: string;
    role: 'primary' | 'secondary' | 'observer';
  };
  
  // Working memory
  workingMemory: {
    [key: string]: any;
  };
  
  // Current objectives
  objectives: {
    primary: string[];
    secondary: string[];
    constraints: string[];
  };
  
  // Resource utilization
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    apiCalls: number;
    responseQueue: number;
  };
  
  // Coordination state
  coordination: {
    activeCollaborations: string[];
    pendingHandoffs: string[];
    observingSessions: string[];
  };
  
  lastUpdated: Date;
}

export interface AgentLearning {
  id: string;
  agentId: string;
  learningType: 'outcome_based' | 'feedback_based' | 'pattern_recognition' | 'collaborative';
  
  trigger: {
    event: string;
    context: any;
    timestamp: Date;
  };
  
  observation: {
    situation: string;
    action: string;
    outcome: string;
    effectiveness: number;
  };
  
  insight: {
    pattern: string;
    confidence: number;
    applicability: string[];
    recommendations: string[];
  };
  
  integration: {
    applied: boolean;
    appliedAt?: Date;
    impact?: {
      performanceChange: number;
      userSatisfaction: number;
      safetyImprovement: number;
    };
  };
  
  createdAt: Date;
  validatedAt?: Date;
}

// Base agent interface that all agents implement
export interface BaseAgent {
  id: string;
  type: AgentType;
  configuration: AgentConfiguration;
  state: AgentState;
  memory: AgentMemory[];
  
  // Core methods that all agents must implement
  initialize(config: AgentConfiguration): Promise<void>;
  processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  makeDecision(context: any): Promise<AgentDecision>;
  updateState(newState: Partial<AgentState>): Promise<void>;
  
  // Memory management
  storeMemory(memory: Omit<AgentMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  retrieveMemory(query: string, limit?: number): Promise<AgentMemory[]>;
  
  // Learning and adaptation
  learn(experience: AgentLearning): Promise<void>;
  adapt(feedback: any): Promise<void>;
  
  // Coordination
  requestCoordination(request: Omit<AgentCoordination, 'id' | 'timestamp'>): Promise<void>;
  handleCoordination(coordination: AgentCoordination): Promise<void>;
  
  // Monitoring and metrics
  getMetrics(period?: { start: Date; end: Date }): Promise<AgentPerformanceMetrics>;
  healthCheck(): Promise<{ healthy: boolean; issues: string[] }>;
}