"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import PremiumButton from "@/components/ui/premium-button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: unknown;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: unknown, errorInfo: ErrorInfo) {

    console.error("[GlobalErrorBoundary] Uncaught error:", error, errorInfo);
    
    Sentry.withScope((scope) => {
      scope.setTag("component", "GlobalErrorBoundary");
      scope.setExtras(errorInfo as unknown as Record<string, unknown>);
      Sentry.captureException(error);
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--fc-app-bg)] px-6 text-center text-[var(--fc-theme-text)]">
          <div className="relative mb-8">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-red-500/10 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <AlertCircle size={40} className="text-red-400" />
            </div>
          </div>

          <h1 className="mb-3 text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          
          <p className="mb-8 max-w-md text-zinc-400">
            FlexChat encountered an unexpected error. We&apos;ve been notified and are looking into it.
          </p>

          <div className="flex w-full max-w-xs flex-col gap-3">
            <PremiumButton onClick={this.handleReset}>
              <div className="flex items-center gap-2">
                <RefreshCcw size={18} />
                <span>Try again</span>
              </div>
            </PremiumButton>

            <button
              onClick={this.handleGoHome}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 font-medium transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <Home size={18} />
              <span>Back to home</span>
            </button>
          </div>

          {process.env.NODE_ENV === "development" && this.state.error ? (
            <div className="mt-12 max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-red-400">
                Developer Debug Info
              </p>
              <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed text-zinc-500">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(this.state.error as any).stack || String(this.state.error)}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
