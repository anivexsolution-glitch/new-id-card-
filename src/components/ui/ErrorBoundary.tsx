import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(readable);
      if (parsed && typeof parsed.error === 'string') {
        readable = parsed.error;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F6F7] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E3E7EB] rounded-[12px] p-6 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#C44949]/10 text-[#C44949] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#202B38]">
                  Something went wrong
                </h2>
                <p className="text-xs text-[#75808C] mt-1 leading-relaxed break-words">
                  {this.state.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-9 bg-[#24364B] hover:bg-[#304A64] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
