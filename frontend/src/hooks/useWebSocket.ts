import { useEffect, useState, useCallback, useRef } from 'react';
import websocketService, { AgentMessage, SessionState } from '../services/websocket';
import { useAuthStore } from '../stores/authStore';

interface WebSocketHookState {
  isConnected: boolean;
  connectionState: string;
  messages: AgentMessage[];
  sessionState: SessionState | null;
  safetyAlerts: any[];
  error: string | null;
}

interface WebSocketHookActions {
  connect: () => void;
  disconnect: () => void;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  sendMessage: (sessionId: string, message: string, metadata?: any) => void;
  updateSafetyMeasurements: (sessionId: string, measurements: any) => void;
  requestBilateralStimulation: (sessionId: string, type: 'visual' | 'auditory' | 'tactile', settings: any) => void;
  stopBilateralStimulation: (sessionId: string) => void;
  emergencyStop: (sessionId: string, reason: string) => void;
  clearMessages: () => void;
  clearAlerts: () => void;
}

export const useWebSocket = (): WebSocketHookState & WebSocketHookActions => {
  const { isAuthenticated } = useAuthStore();
  
  const [state, setState] = useState<WebSocketHookState>({
    isConnected: false,
    connectionState: 'disconnected',
    messages: [],
    sessionState: null,
    safetyAlerts: [],
    error: null,
  });

  const currentSessionRef = useRef<string | null>(null);

  // Connection management
  const connect = useCallback(() => {
    if (isAuthenticated) {
      websocketService.connect();
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  // Session management
  const joinSession = useCallback((sessionId: string) => {
    websocketService.joinSession(sessionId);
    currentSessionRef.current = sessionId;
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    websocketService.leaveSession(sessionId);
    if (currentSessionRef.current === sessionId) {
      currentSessionRef.current = null;
    }
  }, []);

  // Message handling
  const sendMessage = useCallback((sessionId: string, message: string, metadata?: any) => {
    websocketService.sendMessage(sessionId, message, metadata);
  }, []);

  // Safety and stimulation controls
  const updateSafetyMeasurements = useCallback((sessionId: string, measurements: any) => {
    websocketService.updateSafetyMeasurements(sessionId, measurements);
  }, []);

  const requestBilateralStimulation = useCallback((sessionId: string, type: 'visual' | 'auditory' | 'tactile', settings: any) => {
    websocketService.requestBilateralStimulation(sessionId, type, settings);
  }, []);

  const stopBilateralStimulation = useCallback((sessionId: string) => {
    websocketService.stopBilateralStimulation(sessionId);
  }, []);

  const emergencyStop = useCallback((sessionId: string, reason: string) => {
    websocketService.emergencyStop(sessionId, reason);
  }, []);

  // State management
  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, safetyAlerts: [] }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleConnection = (data: any) => {
      setState(prev => ({
        ...prev,
        isConnected: data.status === 'connected',
        connectionState: data.status,
        error: data.status === 'error' ? (data.error?.message || 'Connection error') : null,
      }));
    };

    const handleAgentMessage = (message: AgentMessage) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message].slice(-100), // Keep last 100 messages
      }));
    };

    const handleSessionUpdate = (sessionState: SessionState) => {
      setState(prev => ({
        ...prev,
        sessionState,
      }));
    };

    const handleSafetyAlert = (alert: any) => {
      setState(prev => ({
        ...prev,
        safetyAlerts: [...prev.safetyAlerts, { ...alert, timestamp: new Date() }].slice(-20), // Keep last 20 alerts
      }));
    };

    const handleBilateralStimulation = (stimulation: any) => {
      // Handle bilateral stimulation events
      console.log('Bilateral stimulation event:', stimulation);
      // You could add this to state if needed for UI feedback
    };

    // Register event listeners
    websocketService.on('connection', handleConnection);
    websocketService.on('agent_message', handleAgentMessage);
    websocketService.on('session_update', handleSessionUpdate);
    websocketService.on('safety_alert', handleSafetyAlert);
    websocketService.on('bilateral_stimulation', handleBilateralStimulation);

    // Auto-connect when authenticated
    if (isAuthenticated) {
      connect();
    }

    // Cleanup function
    return () => {
      websocketService.off('connection', handleConnection);
      websocketService.off('agent_message', handleAgentMessage);
      websocketService.off('session_update', handleSessionUpdate);
      websocketService.off('safety_alert', handleSafetyAlert);
      websocketService.off('bilateral_stimulation', handleBilateralStimulation);
    };
  }, [isAuthenticated, connect]);

  // Disconnect when user logs out  
  useEffect(() => {
    if (!isAuthenticated) {
      disconnect();
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionState: 'disconnected',
        messages: [],
        sessionState: null,
        safetyAlerts: [],
        error: null,
      }));
    }
  }, [isAuthenticated, disconnect]);

  return {
    // State
    isConnected: state.isConnected,
    connectionState: state.connectionState,
    messages: state.messages,
    sessionState: state.sessionState,
    safetyAlerts: state.safetyAlerts,
    error: state.error,
    
    // Actions
    connect,
    disconnect,
    joinSession,
    leaveSession,
    sendMessage,
    updateSafetyMeasurements,
    requestBilateralStimulation,
    stopBilateralStimulation,
    emergencyStop,
    clearMessages,
    clearAlerts,
  };
};