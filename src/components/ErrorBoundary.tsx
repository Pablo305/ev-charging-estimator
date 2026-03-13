'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallbackLabel?: string;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.fallbackLabel ? ` - ${this.props.fallbackLabel}` : ''}]`, error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <div className="mb-2 text-lg text-red-400">Something went wrong</div>
          {this.props.fallbackLabel && (
            <p className="mb-2 text-sm text-red-600">{this.props.fallbackLabel} encountered an error</p>
          )}
          <p className="mb-4 text-xs text-red-500">
            {process.env.NODE_ENV === 'development'
              ? (this.state.error?.message ?? 'Unknown error')
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
