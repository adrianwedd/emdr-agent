import { io, Socket } from 'socket.io-client';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5001';

export interface AgentMessage {
  id: string;
  sessionId: string;
  agentType: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface SessionState {
  sessionId: string;
  phase: string;
  currentSUD: number;
  currentVOC: number;
  isActive: boolean;
  safetyStatus: 'safe' | 'caution' | 'danger';
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io(WEBSOCKET_URL, {
      autoConnect: false,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('🔗 WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
      this.handleReconnection();
      this.emit('connection', { status: 'error', error });
    });

    // Agent communication events
    this.socket.on('agent_message', (message: AgentMessage) => {
      console.log('🤖 Agent message received:', message);
      this.emit('agent_message', message);
    });

    this.socket.on('session_update', (sessionState: SessionState) => {
      console.log('📊 Session state updated:', sessionState);
      this.emit('session_update', sessionState);
    });

    this.socket.on('safety_alert', (alert: any) => {
      console.warn('⚠️ Safety alert:', alert);
      this.emit('safety_alert', alert);
    });

    this.socket.on('bilateral_stimulation', (stimulation: any) => {
      console.log('👁️ Bilateral stimulation:', stimulation);
      this.emit('bilateral_stimulation', stimulation);
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection', { status: 'failed', attempts: this.reconnectAttempts });
    }
  }

  public connect(): void {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.error('❌ Cannot connect WebSocket: No access token');
      return;
    }

    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  public joinSession(sessionId: string): void {
    if (this.isConnected && this.socket) {
      console.log(`🏠 Joining session: ${sessionId}`);
      this.socket.emit('join_session', sessionId);
    }
  }

  public leaveSession(sessionId: string): void {
    if (this.isConnected && this.socket) {
      console.log(`🚪 Leaving session: ${sessionId}`);
      this.socket.emit('leave_session', sessionId);
    }
  }

  public sendMessage(sessionId: string, message: string, metadata?: any): void {
    if (this.isConnected && this.socket) {
      const messageData = {
        sessionId,
        content: message,
        timestamp: new Date(),
        metadata,
      };
      
      console.log('📤 Sending message:', messageData);
      this.socket.emit('user_message', messageData);
    }
  }

  public updateSafetyMeasurements(sessionId: string, measurements: any): void {
    if (this.isConnected && this.socket) {
      console.log('📊 Updating safety measurements:', measurements);
      this.socket.emit('safety_measurements', {
        sessionId,
        measurements,
        timestamp: new Date(),
      });
    }
  }

  public requestBilateralStimulation(sessionId: string, type: 'visual' | 'auditory' | 'tactile', settings: any): void {
    if (this.isConnected && this.socket) {
      console.log('👁️ Requesting bilateral stimulation:', { type, settings });
      this.socket.emit('request_stimulation', {
        sessionId,
        type,
        settings,
        timestamp: new Date(),
      });
    }
  }

  public stopBilateralStimulation(sessionId: string): void {
    if (this.isConnected && this.socket) {
      console.log('⏹️ Stopping bilateral stimulation');
      this.socket.emit('stop_stimulation', { sessionId });
    }
  }

  public emergencyStop(sessionId: string, reason: string): void {
    if (this.isConnected && this.socket) {
      console.warn('🚨 Emergency stop triggered:', reason);
      this.socket.emit('emergency_stop', {
        sessionId,
        reason,
        timestamp: new Date(),
      });
    }
  }

  // Event listener management
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: Function): void {
    if (!this.eventListeners.has(event)) return;
    
    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.set(event, []);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Getters
  public get connected(): boolean {
    return this.isConnected;
  }

  public get connectionState(): string {
    if (!this.socket) return 'disconnected';
    if (this.isConnected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;