// shared/types/EMDR.ts

export enum EMDRPhase {
  PREPARATION = 'preparation',
  ASSESSMENT = 'assessment',
  DESENSITIZATION = 'desensitization',
  INSTALLATION = 'installation',
  BODY_SCAN = 'body_scan',
  CLOSURE = 'closure',
  REEVALUATION = 'reevaluation',
  RESOURCE_INSTALLATION = 'resource_installation'
}

export enum BilateralStimulationType {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  TACTILE = 'tactile',
  COMBINED = 'combined'
}

export enum SessionState {
  PREPARING = 'preparing',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  EMERGENCY_STOPPED = 'emergency_stopped'
}

export enum DistressLevel {
  MINIMAL = 0,
  LOW = 1,
  MILD = 2,
  MODERATE = 3,
  HIGH = 4,
  SEVERE = 5,
  EXTREME = 6,
  OVERWHELMING = 7,
  UNBEARABLE = 8,
  MAXIMUM = 9,
  CRISIS = 10
}

export enum ValidityOfCognition {
  COMPLETELY_FALSE = 1,
  MOSTLY_FALSE = 2,
  SOMEWHAT_FALSE = 3,
  NEUTRAL = 4,
  SOMEWHAT_TRUE = 5,
  MOSTLY_TRUE = 6,
  COMPLETELY_TRUE = 7
}

export interface TargetMemory {
  id: string;
  description: string;
  image: string;
  negativeCognition: string;
  positiveCognition: string;
  emotion: string;
  initialSUD: DistressLevel;
  initialVOC: ValidityOfCognition;
  bodyLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BilateralStimulationSettings {
  type: BilateralStimulationType;
  duration: number; // in seconds
  speed: number; // BPM or Hz
  intensity: number; // 0-100
  visual?: {
    shape: 'dot' | 'bar' | 'image';
    color: string;
    size: number;
    path: 'horizontal' | 'vertical' | 'diagonal' | 'figure8';
    backgroundColor: string;
  };
  auditory?: {
    toneFrequency: number;
    volume: number;
    soundType: 'beep' | 'chime' | 'nature' | 'binaural';
    binauralFrequency?: number;
  };
  tactile?: {
    pattern: 'alternate' | 'simultaneous' | 'wave';
    intensity: number;
    duration: number;
  };
}

export interface EMDRSet {
  id: string;
  number: number;
  startTime: Date;
  endTime?: Date;
  duration: number;
  stimulationSettings: BilateralStimulationSettings;
  userFeedback?: {
    sudLevel?: DistressLevel;
    bodyResponse?: string;
    imagery?: string;
    thoughts?: string;
    emotions?: string;
    associations?: string;
  };
  agentObservations?: {
    responseTime: number;
    engagementLevel: number;
    stressIndicators: string[];
    recommendations: string[];
  };
}

export interface EMDRSession {
  id: string;
  userId: string;
  targetMemoryId: string;
  phase: EMDRPhase;
  state: SessionState;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  
  // Pre-session data
  preparationNotes?: string;
  safetyAssessment?: SafetyAssessment;
  resourceState?: number; // 1-10 scale
  
  // Session progression
  sets: EMDRSet[];
  currentSetNumber: number;
  
  // Measurements
  initialSUD: DistressLevel;
  currentSUD?: DistressLevel;
  finalSUD?: DistressLevel;
  initialVOC: ValidityOfCognition;
  currentVOC?: ValidityOfCognition;
  finalVOC?: ValidityOfCognition;
  
  // Phase-specific data
  phaseData: {
    [key in EMDRPhase]?: {
      startTime?: Date;
      endTime?: Date;
      duration?: number;
      notes?: string;
      completed: boolean;
    };
  };
  
  // Agent interactions
  agentGuidance: AgentInteraction[];
  
  // Safety and monitoring
  safetyChecks: SafetyCheck[];
  emergencyProtocols?: EmergencyProtocol[];
  
  // Outcome measures
  sessionOutcome?: SessionOutcome;
  nextSessionRecommendations?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyAssessment {
  id: string;
  timestamp: Date;
  responses: {
    [questionId: string]: string | number | boolean;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  clearanceForSession: boolean;
  requiresProfessionalSupport: boolean;
}

export interface SafetyCheck {
  id: string;
  timestamp: Date;
  type: 'automatic' | 'manual' | 'triggered';
  trigger?: string;
  measurements: {
    sudLevel?: DistressLevel;
    dissociationLevel?: number;
    groundingScore?: number;
    responseTime?: number;
  };
  action: 'continue' | 'pause' | 'grounding' | 'emergency_stop';
  intervention?: GroundingTechnique;
}

export interface GroundingTechnique {
  id: string;
  name: string;
  type: '5-4-3-2-1' | 'breathing' | 'progressive_muscle' | 'visualization' | 'mindfulness';
  instructions: string[];
  duration: number;
  effectiveness?: number; // 1-10 post-technique rating
}

export interface EmergencyProtocol {
  id: string;
  timestamp: Date;
  trigger: string;
  severity: 'medium' | 'high' | 'critical';
  actions: string[];
  resources: {
    hotlines: string[];
    emergencyContacts: string[];
    professionalReferrals: string[];
  };
  followUpRequired: boolean;
}

export interface AgentInteraction {
  id: string;
  timestamp: Date;
  agentType: 'therapist' | 'safety' | 'orchestrator' | 'crisis';
  phase: EMDRPhase;
  interactionType: 'guidance' | 'question' | 'assessment' | 'intervention' | 'education';
  message: string;
  userResponse?: string;
  context: {
    sudLevel?: DistressLevel;
    vocLevel?: ValidityOfCognition;
    sessionState: SessionState;
    setNumber?: number;
  };
  adaptations?: {
    stimulationAdjustment?: Partial<BilateralStimulationSettings>;
    phaseModification?: string;
    safetyIntervention?: string;
  };
}

export interface SessionOutcome {
  id: string;
  sessionId: string;
  completionStatus: 'completed' | 'partial' | 'discontinued' | 'emergency_stopped';
  
  // Quantitative measures
  sudReduction: number;
  vocImprovement: number;
  totalSets: number;
  totalDuration: number;
  
  // Qualitative assessments
  targetResolution: 'complete' | 'partial' | 'minimal';
  adaptiveCapacity: number; // 1-10
  resourcesUtilized: string[];
  
  // Agent evaluations
  protocolAdherence: number; // percentage
  safetyMaintenance: number; // 1-10 score
  userEngagement: number; // 1-10 score
  
  // Recommendations
  nextSessionGoals?: string[];
  protocolAdjustments?: string[];
  additionalResources?: string[];
  professionalReferral?: {
    recommended: boolean;
    urgency: 'routine' | 'soon' | 'immediate';
    specializations: string[];
  };
  
  createdAt: Date;
}

export interface EMDRProtocol {
  id: string;
  name: string;
  version: string;
  description: string;
  
  phases: {
    [key in EMDRPhase]: {
      required: boolean;
      minimumDuration?: number;
      maximumDuration?: number;
      exitCriteria: string[];
      safetyChecks: string[];
      agentGuidance: string[];
    };
  };
  
  adaptationRules: {
    condition: string;
    adaptation: string;
    phase?: EMDRPhase;
  }[];
  
  safetyProtocols: {
    triggers: string[];
    interventions: string[];
    escalationPaths: string[];
  };
  
  bilateralStimulationDefaults: BilateralStimulationSettings;
  
  // Personalization parameters
  userFactors: {
    traumaType?: string[];
    comorbidities?: string[];
    therapyHistory?: string[];
    preferredModalities?: BilateralStimulationType[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Utility types for real-time session management
export interface SessionUpdate {
  type: 'phase_change' | 'set_complete' | 'measurement_update' | 'safety_check' | 'agent_message';
  timestamp: Date;
  data: any;
}

export interface SessionMetrics {
  sessionId: string;
  realTimeData: {
    currentPhase: EMDRPhase;
    currentSet: number;
    elapsedTime: number;
    currentSUD?: DistressLevel;
    currentVOC?: ValidityOfCognition;
    lastSafetyCheck: Date;
  };
  aggregatedData: {
    averageSudLevel: number;
    setCompletionRate: number;
    phaseProgression: number;
    safetyScore: number;
  };
}