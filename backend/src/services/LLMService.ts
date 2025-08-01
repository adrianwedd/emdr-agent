import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  provider?: 'openai' | 'anthropic';
  model?: string;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
  responseTime: number;
}

export interface LLMProviderConfig {
  openai?: {
    apiKey: string;
    defaultModel: string;
    organization?: string;
  };
  anthropic?: {
    apiKey: string;
    defaultModel: string;
  };
  defaultProvider: 'openai' | 'anthropic';
  timeout: number;
  maxRetries: number;
}

export class LLMService {
  private static instance: LLMService;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private config: LLMProviderConfig;

  private constructor(config: LLMProviderConfig) {
    this.config = config;

    // Initialize OpenAI client if configured
    if (config.openai?.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openai.apiKey,
        organization: config.openai.organization,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      });
      logger.info('OpenAI client initialized');
    }

    // Initialize Anthropic client if configured
    if (config.anthropic?.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: config.anthropic.apiKey,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      });
      logger.info('Anthropic client initialized');
    }

    if (!this.openaiClient && !this.anthropicClient) {
      throw new Error('At least one LLM provider must be configured');
    }
  }

  /**
   * Initialize singleton instance
   */
  public static initialize(config: LLMProviderConfig): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService(config);
    }
    return LLMService.instance;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      throw new Error('LLMService must be initialized before use');
    }
    return LLMService.instance;
  }

  /**
   * Generate response using specified or default provider
   */
  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const provider = request.provider || this.config.defaultProvider;

    try {
      logger.debug(`Generating LLM response using ${provider}`, {
        systemPromptLength: request.systemPrompt.length,
        userPromptLength: request.userPrompt.length,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      });

      let response: LLMResponse;

      if (provider === 'openai') {
        response = await this.generateOpenAIResponse(request);
      } else if (provider === 'anthropic') {
        response = await this.generateAnthropicResponse(request);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      response.responseTime = Date.now() - startTime;

      logger.info(`LLM response generated successfully`, {
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        responseTime: response.responseTime,
        contentLength: response.content.length,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`LLM response generation failed`, {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      });
      throw this.handleLLMError(error, provider);
    }
  }

  /**
   * Generate response using OpenAI
   */
  private async generateOpenAIResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const model = request.model || this.config.openai?.defaultModel || 'gpt-4';
    
    const completion = await this.openaiClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const choice = completion.choices[0];
    if (!choice?.message?.content) {
      throw new Error('No content received from OpenAI');
    }

    return {
      content: choice.message.content,
      provider: 'openai',
      model,
      tokensUsed: completion.usage?.total_tokens,
      finishReason: choice.finish_reason || undefined,
      responseTime: 0, // Will be set by caller
    };
  }

  /**
   * Generate response using Anthropic
   */
  private async generateAnthropicResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const model = request.model || this.config.anthropic?.defaultModel || 'claude-3-sonnet-20240229';
    
    const message = await this.anthropicClient.messages.create({
      model,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: [
        { role: 'user', content: request.userPrompt },
      ],
    });

    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content received from Anthropic');
    }

    return {
      content: textBlock.text,
      provider: 'anthropic',
      model,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      finishReason: message.stop_reason || undefined,
      responseTime: 0, // Will be set by caller
    };
  }

  /**
   * Validate content for safety and appropriateness
   */
  public async validateContent(content: string): Promise<{
    safe: boolean;
    categories?: string[];
    confidence?: number;
    reasoning?: string;
  }> {
    try {
      // Use OpenAI's moderation endpoint if available
      if (this.openaiClient) {
        const moderation = await this.openaiClient.moderations.create({
          input: content,
        });

        const result = moderation.results[0];
        if (!result) {
          throw new Error('No moderation result received');
        }

        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category, _]) => category);

        return {
          safe: !result.flagged,
          categories: flaggedCategories,
          confidence: Math.max(...Object.values(result.category_scores)),
        };
      }

      // Fallback: Basic content validation
      const concerningPatterns = [
        /self.?harm/i,
        /suicide/i,
        /kill.?(myself|yourself)/i,
        /hurt.?(myself|yourself)/i,
      ];

      const hasConcerningContent = concerningPatterns.some(pattern => 
        pattern.test(content)
      );

      return {
        safe: !hasConcerningContent,
        categories: hasConcerningContent ? ['self-harm'] : [],
        reasoning: 'Basic pattern matching validation',
      };
    } catch (error) {
      logger.error('Content validation failed:', error);
      // Err on the side of caution
      return {
        safe: false,
        reasoning: 'Validation error - marked unsafe as precaution',
      };
    }
  }

  /**
   * Test provider connectivity
   */
  public async testProvider(provider: 'openai' | 'anthropic'): Promise<{
    available: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const testRequest: LLMRequest = {
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Say "Hello" in response to this test.',
        maxTokens: 10,
        temperature: 0,
        provider,
      };

      await this.generateResponse(testRequest);

      return {
        available: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get health status of all providers
   */
  public async getHealthStatus(): Promise<{
    openai?: { available: boolean; latency?: number };
    anthropic?: { available: boolean; latency?: number };
  }> {
    const status: any = {};

    if (this.openaiClient) {
      status.openai = await this.testProvider('openai');
    }

    if (this.anthropicClient) {
      status.anthropic = await this.testProvider('anthropic');
    }

    return status;
  }

  /**
   * Handle LLM provider errors
   */
  private handleLLMError(error: unknown, provider: string): Error {
    if (error instanceof Error) {
      // Handle specific provider errors
      if (provider === 'openai' && error.message.includes('quota')) {
        return new Error('OpenAI quota exceeded. Please check your usage limits.');
      }
      
      if (provider === 'anthropic' && error.message.includes('rate_limit')) {
        return new Error('Anthropic rate limit exceeded. Please try again later.');
      }

      if (error.message.includes('timeout')) {
        return new Error(`${provider} request timed out. Please try again.`);
      }

      if (error.message.includes('network') || error.message.includes('connection')) {
        return new Error(`Network error connecting to ${provider}. Please check your connection.`);
      }

      return new Error(`${provider} error: ${error.message}`);
    }

    return new Error(`Unknown error with ${provider} provider`);
  }
}

// Factory function to create and initialize service
export function createLLMService(): LLMService {
  const config: LLMProviderConfig = {
    defaultProvider: 'openai',
    timeout: 30000, // 30 seconds
    maxRetries: 3,
  };

  // Add OpenAI config if API key exists
  if (process.env.OPENAI_API_KEY) {
    config.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
      organization: process.env.OPENAI_ORGANIZATION,
    };
  }

  // Add Anthropic config if API key exists
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-sonnet-20240229',
    };
    
    // Use Anthropic as default if only Anthropic is configured
    if (!config.openai) {
      config.defaultProvider = 'anthropic';
    }
  }

  return LLMService.initialize(config);
}