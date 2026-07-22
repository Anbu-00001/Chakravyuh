import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
  variant?: 'app' | 'panel';
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.variant === 'panel') {
      return (
        <div className="bg-[#080d19] border border-red-900/60 rounded p-5 flex items-center gap-3 text-slate-400 font-mono text-xs">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>
            <strong className="text-red-400">{this.props.label || 'Panel'} unavailable.</strong>{' '}
            Other systems remain operational.
          </span>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#04070d] text-slate-100 font-mono flex flex-col items-center justify-center gap-4 p-8">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <div className="text-lg font-black text-red-400 uppercase tracking-wider">War-Room Fault Detected</div>
        <p className="text-sm text-slate-400 max-w-md text-center">
          An unexpected error interrupted the tactical interface. Telemetry services remain online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#060a12] font-black text-xs uppercase px-5 py-2.5 rounded transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Reinitialize War-Room
        </button>
      </div>
    );
  }
}
