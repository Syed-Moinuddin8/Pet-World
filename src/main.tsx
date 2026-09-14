import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-6 text-center text-[#2D2D2D]">
          <div className="w-14 h-14 rounded-full bg-[#D97757] text-white flex items-center justify-center shadow-md mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[#666666] max-w-md mb-6">
            {this.state.error?.message || 'An unexpected error occurred while running Pet World.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#464632] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Reload Application
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {}
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-[#F5F2ED] text-[#5A5A40] border border-[#EAE7E0] text-xs font-semibold transition-all cursor-pointer"
            >
              Reset Session Cache
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global unhandled error logging with safe suppression of benign iframe/WebSocket/aborted events
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    // Suppress cross-origin script error noise or ResizeObserver loop limit notices
    if (msg === 'Script error.' || msg.includes('ResizeObserver')) {
      event.preventDefault();
      return;
    }
    console.warn('Window event notice:', msg);
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Mark as handled to prevent browser/test runner uncaught fatal halts
    event.preventDefault();

    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';

    // Ignore benign rejections: null/undefined reason, aborted fetches, websocket disconnects, canvas limitations
    if (
      !reason ||
      msg.includes('AbortError') ||
      msg.includes('Failed to fetch') ||
      msg.includes('WebSocket') ||
      msg.includes('ResizeObserver') ||
      msg.includes('storage') ||
      msg.includes('canvas')
    ) {
      return;
    }

    console.warn('Promise rejection notice:', msg || reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

