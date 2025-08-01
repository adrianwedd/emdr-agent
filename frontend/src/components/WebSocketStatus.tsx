import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export const WebSocketStatus: React.FC = () => {
  const { isConnected, connectionState, error, messages, safetyAlerts } = useWebSocket();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '⚫';
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">WebSocket Status</h3>
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          <span>{getStatusIcon()}</span>
          <span className="font-medium">{getStatusText()}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
          <p className="text-red-600 text-xs">Error: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
        <div>
          <span className="font-medium">Messages:</span> {messages.length}
        </div>
        <div>
          <span className="font-medium">Alerts:</span> 
          <span className={safetyAlerts.length > 0 ? 'text-orange-600 font-medium' : ''}>
            {' '}{safetyAlerts.length}
          </span>
        </div>
      </div>

      {/* Recent messages preview */}
      {messages.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <p className="text-xs text-gray-500 mb-1">Recent Messages:</p>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {messages.slice(-3).map((message, index) => (
              <div key={index} className="text-xs bg-gray-50 rounded p-1">
                <span className="font-medium text-blue-600">{message.agentType}:</span>
                <span className="text-gray-700 ml-1">
                  {message.content.substring(0, 50)}
                  {message.content.length > 50 ? '...' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety alerts preview */}
      {safetyAlerts.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <p className="text-xs text-gray-500 mb-1">Safety Alerts:</p>
          <div className="space-y-1 max-h-16 overflow-y-auto">
            {safetyAlerts.slice(-2).map((alert, index) => (
              <div key={index} className="text-xs bg-orange-50 border border-orange-200 rounded p-1">
                <span className="text-orange-600 font-medium">⚠️ Alert:</span>
                <span className="text-gray-700 ml-1">
                  {alert.message || 'Safety concern detected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};