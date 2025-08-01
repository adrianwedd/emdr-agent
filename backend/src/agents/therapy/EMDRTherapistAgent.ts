// backend/src/agents/therapy/EMDRTherapistAgent.ts

import { 
  BaseAgent, 
  AgentType, 
  AgentMessage, 
  AgentDecision, 
  AgentState,
  AgentStateData, 
  AgentConfiguration, 
  MessageType, 
  Priority,
  AgentMemory,
  AgentLearning,
  AgentCoordination,
  AgentPerformanceMetrics
} from '../../../../shared/types/Agent';
import { EMDRPhase, EMDRSession, DistressLevel, ValidityOfCognition, SessionState } from '../../../../shared/types/EMDR';
import { 
  LLMService, 
  SessionService, 
  SafetyProtocolService,
  sessionService,
  safetyProtocolService
} from '../../services';
import { logger } from '../../utils/logger';

export class EMDRTherapistAgent implements BaseAgent {
  id: string;
  type: AgentType = AgentType.THERAPIST;
  configuration: AgentConfiguration;
  state: AgentStateData;
  memory: AgentMemory[] = [];

  private llmService: LLMService;
  private sessionService: SessionService;
  private safetyService: SafetyProtocolService;

  constructor(
    id: string,
    configuration: AgentConfiguration,
    llmService: LLMService
  ) {
    this.id = id;
    this.configuration = configuration;
    this.llmService = llmService;
    this.sessionService = sessionService; // Use singleton
    this.safetyService = safetyProtocolService; // Use singleton
    
    this.state = {
      agentId: id,
      agentType: AgentType.THERAPIST,
      currentState: AgentState.IDLE,
      workingMemory: {},
      objectives: {
        primary: [],
        secondary: [],
        constraints: []
      },
      resources: {
        cpuUsage: 0,
        memoryUsage: 0,
        apiCalls: 0,
        responseQueue: 0
      },
      coordination: {
        activeCollaborations: [],
        pendingHandoffs: [],
        observingSessions: []
      },
      lastUpdated: new Date()
    };
  }

  async initialize(config: AgentConfiguration): Promise<void> {
    this.configuration = config;
    await this.updateState({
      currentState: AgentState.ACTIVE,
      objectives: {
        primary: [
          'Guide user through EMDR protocol phases',
          'Maintain therapeutic alliance',
          'Monitor safety and wellbeing',
          'Adapt protocol based on user responses'
        ],
        secondary: [
          'Provide psychoeducation',
          'Encourage user engagement',
          'Document session progress'
        ],
        constraints: [
          'Never exceed scope of practice',
          'Always prioritize safety',
          'Maintain professional boundaries',
          'Follow evidence-based protocols'
        ]
      }
    });
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    await this.updateState({ currentState: AgentState.PROCESSING });
    
    try {
      // Retrieve session context
      const session = await this.sessionService.getSession(message.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Update working memory with current context
      this.state.workingMemory = {
        ...this.state.workingMemory,
        currentSession: session,
        lastUserMessage: message,
        timestamp: new Date()
      };

      // Determine appropriate response based on message type and session phase
      let response: AgentMessage | null = null;

      switch (message.type) {
        case MessageType.ASSESSMENT:
          response = await this.handleAssessment(message, session);
          break;
        case MessageType.GUIDANCE:
          response = await this.provideGuidance(message, session);
          break;
        case MessageType.QUESTION:
          response = await this.answerQuestion(message, session);
          break;
        case MessageType.INTERVENTION:
          response = await this.handleIntervention(message, session);
          break;
        default:
          response = await this.generateContextualResponse(message, session);
      }

      await this.updateState({ currentState: AgentState.ACTIVE });
      return response;

    } catch (error) {
      console.error('Error processing message:', error);
      await this.updateState({ currentState: AgentState.ACTIVE });
      return this.createErrorResponse(message);
    }
  }

  private async handleAssessment(message: AgentMessage, session: EMDRSession): Promise<AgentMessage> {
    const systemPrompt = this.buildSystemPrompt(session);
    const userPrompt = this.buildAssessmentPrompt(message, session);

    const llmResponse = await this.llmService.generateResponse({
      systemPrompt,
      userPrompt,
      maxTokens: this.configuration.integrations.maxTokens,
      temperature: this.configuration.integrations.temperature
    });

    return this.createResponse(message, MessageType.ASSESSMENT, llmResponse, Priority.HIGH);
  }

  private async provideGuidance(message: AgentMessage, session: EMDRSession): Promise<AgentMessage> {
    const phaseGuidance = this.getPhaseSpecificGuidance(session.phase);
    const systemPrompt = this.buildSystemPrompt(session);
    const userPrompt = `
      Current EMDR Phase: ${session.phase}
      Phase Guidance: ${phaseGuidance}
      User Message: ${message.content.text}
      
      Provide appropriate therapeutic guidance for this phase, incorporating:
      1. Phase-specific instructions
      2. Encouragement and support  
      3. Safety monitoring
      4. Next steps if applicable
      
      Keep response warm, professional, and within 2-3 sentences unless more detail is needed.
    `;

    const llmResponse = await this.llmService.generateResponse({
      systemPrompt,
      userPrompt,
      maxTokens: this.configuration.integrations.maxTokens,
      temperature: this.configuration.integrations.temperature
    });

    return this.createResponse(message, MessageType.GUIDANCE, llmResponse, Priority.MEDIUM);
  }

  private async answerQuestion(message: AgentMessage, session: EMDRSession): Promise<AgentMessage> {
    const systemPrompt = this.buildSystemPrompt(session);
    const userPrompt = `
      User Question: ${message.content.text}
      Current Session Context: Phase ${session.phase}, Set ${session.currentSetNumber}
      
      Provide a helpful, accurate answer that:
      1. Addresses the question directly
      2. Relates to current EMDR context when relevant
      3. Maintains therapeutic boundaries
      4. Encourages continued engagement
      
      If the question is outside your scope, politely redirect to appropriate resources.
    `;

    const llmResponse = await this.llmService.generateResponse({
      systemPrompt,
      userPrompt,
      maxTokens: this.configuration.integrations.maxTokens,
      temperature: this.configuration.integrations.temperature
    });

    return this.createResponse(message, MessageType.GUIDANCE, llmResponse, Priority.MEDIUM);
  }

  private async handleIntervention(message: AgentMessage, session: EMDRSession): Promise<AgentMessage> {
    // Check if safety intervention is needed
    const safetyCheck = await this.safetyService.assessCurrentState(session.id);
    
    if (safetyCheck.action !== 'continue') {
      return this.createSafetyResponse(message, safetyCheck);
    }

    // Handle therapeutic intervention
    const systemPrompt = this.buildSystemPrompt(session);
    const userPrompt = `
      Intervention Context: ${message.content.metadata?.context || 'General intervention needed'}
      User State: ${this.assessUserState(session)}
      
      Provide an appropriate therapeutic intervention that:
      1. Addresses the current need
      2. Maintains safety and stability
      3. Supports continued processing
      4. Adapts to user's current capacity
    `;

    const llmResponse = await this.llmService.generateResponse({
      systemPrompt,
      userPrompt,
      maxTokens: this.configuration.integrations.maxTokens,
      temperature: this.configuration.integrations.temperature
    });

    return this.createResponse(message, MessageType.INTERVENTION, llmResponse, Priority.HIGH);
  }

  private buildSystemPrompt(session: EMDRSession): string {
    return `
      You are an AI EMDR therapy assistant designed to guide users through EMDR sessions safely and effectively.
      
      CRITICAL SAFETY GUIDELINES:
      - You are NOT a replacement for professional therapy
      - Always prioritize user safety and wellbeing
      - If user reports severe distress (SUD > 8), recommend grounding techniques
      - If user reports dissociation or overwhelming responses, pause processing
      - Encourage professional support for complex trauma
      
      YOUR PERSONALITY:
      - Tone: ${this.configuration.personality.tone}
      - Empathy Level: ${this.configuration.personality.empathyLevel}/10
      - Language: ${this.configuration.personality.language.formality}, ${this.configuration.personality.language.complexity}
      
      CURRENT SESSION CONTEXT:
      - Phase: ${session.phase}
      - Current SUD: ${session.currentSUD || 'Not assessed'}
      - Current VOC: ${session.currentVOC || 'Not assessed'}
      - Set Number: ${session.currentSetNumber}
      - Session Duration: ${this.calculateSessionDuration(session)} minutes
      
      EMDR PROTOCOL KNOWLEDGE:
      - Follow standard 8-phase protocol unless adaptation is needed
      - Monitor bilateral stimulation effectiveness
      - Track SUD and VOC measurements appropriately
      - Adapt timing and intensity based on user responses
      
      RESPONSE GUIDELINES:
      - Keep responses concise but supportive (2-3 sentences typically)
      - Use person-first, non-pathologizing language
      - Validate user experiences without judgment
      - Provide clear, actionable guidance
      - Ask for feedback when appropriate
    `;
  }

  private buildAssessmentPrompt(message: AgentMessage, session: EMDRSession): string {
    return `
      Assessment Request: ${message.content.text}
      Current Session State: ${JSON.stringify(session, null, 2)}
      
      Provide an appropriate assessment response that:
      1. Gathers necessary information for safe EMDR processing
      2. Uses validated measurement scales (SUD 0-10, VOC 1-7)
      3. Assesses user's current capacity and resources
      4. Identifies any safety concerns or contraindications
      
      Format your response as natural therapeutic dialogue, not clinical interrogation.
    `;
  }

  private getPhaseSpecificGuidance(phase: EMDRPhase): string {
    const phaseGuidance = {
      [EMDRPhase.PREPARATION]: 'Focus on safety, stabilization, and resource building. Ensure user feels grounded and has coping strategies.',
      [EMDRPhase.ASSESSMENT]: 'Help user identify target memory, negative cognition, positive cognition, and baseline measurements.',
      [EMDRPhase.DESENSITIZATION]: 'Guide bilateral stimulation while user processes the target memory. Monitor SUD levels.',
      [EMDRPhase.INSTALLATION]: 'Strengthen positive cognition while using bilateral stimulation. Monitor VOC levels.',
      [EMDRPhase.BODY_SCAN]: 'Help user scan body for any remaining tension or disturbance related to target memory.',
      [EMDRPhase.CLOSURE]: 'Ensure user returns to calm state. Use stabilization techniques if needed.',
      [EMDRPhase.REEVALUATION]: 'Check on progress from previous session before continuing with current targets.',
      [EMDRPhase.RESOURCE_INSTALLATION]: 'Strengthen positive resources and coping strategies using bilateral stimulation.'
    };

    return phaseGuidance[phase] || 'Provide supportive guidance appropriate to current session needs.';
  }

  private assessUserState(session: EMDRSession): string {
    const currentSUD = session.currentSUD || session.initialSUD;
    const stateDescriptions = {
      [DistressLevel.MINIMAL]: 'Very calm and stable',
      [DistressLevel.LOW]: 'Relaxed and comfortable',  
      [DistressLevel.MILD]: 'Slightly activated but manageable',
      [DistressLevel.MODERATE]: 'Moderately distressed but processing well',
      [DistressLevel.HIGH]: 'Elevated distress, needs support',
      [DistressLevel.SEVERE]: 'High distress, may need grounding',
      [DistressLevel.EXTREME]: 'Very high distress, safety priority',
      [DistressLevel.OVERWHELMING]: 'Overwhelming distress, immediate intervention needed'
    };

    return stateDescriptions[currentSUD] || 'State unclear, assessment needed';
  }

  private calculateSessionDuration(session: EMDRSession): number {
    if (!session.startTime) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - session.startTime.getTime()) / (1000 * 60));
  }

  private createResponse(
    originalMessage: AgentMessage, 
    type: MessageType, 
    content: string, 
    priority: Priority
  ): AgentMessage {
    return {
      id: `agent_${this.id}_${Date.now()}`,
      agentId: this.id,
      agentType: this.type,
      sessionId: originalMessage.sessionId,
      userId: originalMessage.userId,
      timestamp: new Date(),
      type,
      priority,
      content: {
        text: content,
        metadata: {
          responseToMessageId: originalMessage.id,
          agentState: this.state.currentState,
          confidence: 0.85 // Could be calculated based on context
        }
      },
      responseRequired: false,
      status: 'pending'
    };
  }

  private createSafetyResponse(originalMessage: AgentMessage, safetyCheck: any): AgentMessage {
    return {
      id: `safety_${this.id}_${Date.now()}`,
      agentId: this.id,
      agentType: this.type,
      sessionId: originalMessage.sessionId,
      userId: originalMessage.userId,
      timestamp: new Date(),
      type: MessageType.SAFETY_CHECK,
      priority: Priority.CRITICAL,
      content: {
        text: `I notice you might be experiencing some distress. Let's take a moment to focus on grounding and safety. ${safetyCheck.intervention?.instructions?.[0] || 'Take some slow, deep breaths.'}`,
        metadata: {
          safetyCheck: safetyCheck,
          intervention: true
        }
      },
      responseRequired: true,
      status: 'pending'
    };
  }

  private createErrorResponse(originalMessage: AgentMessage): AgentMessage {
    return {
      id: `error_${this.id}_${Date.now()}`,
      agentId: this.id,
      agentType: this.type,
      sessionId: originalMessage.sessionId,
      userId: originalMessage.userId,
      timestamp: new Date(),
      type: MessageType.GUIDANCE,
      priority: Priority.MEDIUM,
      content: {
        text: "I apologize, but I'm having difficulty processing your message right now. Could you please try rephrasing, or would you like to take a brief pause?",
        metadata: {
          error: true,
          requiresHumanSupport: true
        }
      },
      responseRequired: false,
      status: 'pending'
    };
  }

  async makeDecision(context: any): Promise<AgentDecision> {
    const decision: AgentDecision = {
      id: `decision_${this.id}_${Date.now()}`,
      agentId: this.id,
      timestamp: new Date(),
      context,
      decisionType: 'guidance',
      options: [],
      selectedOption: '',
      reasoning: '',
      confidenceLevel: 0
    };

    // Decision-making logic based on context
    if (context.userDistress > 8) {
      decision.decisionType = 'safety_action';
      decision.options = [
        {
          option: 'initiate_grounding',
          probability: 0.8,
          confidence: 0.9,
          reasoning: 'High distress level requires immediate grounding intervention'
        },
        {
          option: 'pause_session',
          probability: 0.2,
          confidence: 0.7,
          reasoning: 'Alternative if grounding insufficient'
        }
      ];
      decision.selectedOption = 'initiate_grounding';
      decision.confidenceLevel = 0.9;
      decision.reasoning = 'User distress level exceeds safe threshold, immediate safety intervention required';
    } else {
      // Normal therapeutic guidance decision
      decision.decisionType = 'guidance';
      decision.options = [
        {
          option: 'continue_protocol',
          probability: 0.7,
          confidence: 0.8,
          reasoning: 'User appears stable and engaged'
        },
        {
          option: 'adjust_stimulation',
          probability: 0.3,
          confidence: 0.6,
          reasoning: 'May benefit from bilateral stimulation adjustment'
        }
      ];
      decision.selectedOption = 'continue_protocol';
      decision.confidenceLevel = 0.8;
      decision.reasoning = 'User engagement and stability support protocol continuation';
    }

    return decision;
  }

  async updateState(newState: Partial<AgentStateData>): Promise<void> {
    this.state = {
      ...this.state,
      ...newState,
      lastUpdated: new Date()
    };
  }

  // Additional required methods would be implemented here...
  async storeMemory(memory: Omit<AgentMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    // Implementation for storing agent memory
  }

  async retrieveMemory(query: string, limit?: number): Promise<AgentMemory[]> {
    // Implementation for retrieving relevant memories
    return [];
  }

  async learn(experience: AgentLearning): Promise<void> {
    // Implementation for agent learning from experience
  }

  async adapt(feedback: any): Promise<void> {
    // Implementation for adapting based on feedback
  }

  async requestCoordination(request: Omit<AgentCoordination, 'id' | 'timestamp'>): Promise<void> {
    // Implementation for requesting coordination with other agents
  }

  async handleCoordination(coordination: AgentCoordination): Promise<void> {
    // Implementation for handling coordination requests
  }

  async getMetrics(period?: { start: Date; end: Date }): Promise<AgentPerformanceMetrics> {
    // Implementation for retrieving performance metrics
    return {} as AgentPerformanceMetrics;
  }

  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (this.state.resources.responseQueue > 10) {
      issues.push('High response queue');
    }
    
    if (!this.llmService) {
      issues.push('LLM service not available');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}