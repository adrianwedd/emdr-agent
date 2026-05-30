import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-therapy-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="text-gray-600">
              We encountered an unexpected error. Please take a moment to ground yourself.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-amber-900 mb-2">If you are in distress:</p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>Call <strong>988</strong> (Suicide & Crisis Lifeline)</li>
                <li>Text <strong>HOME</strong> to <strong>741741</strong> (Crisis Text Line)</li>
              </ul>
            </div>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="inline-flex items-center px-4 py-2 bg-therapy-accent text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
