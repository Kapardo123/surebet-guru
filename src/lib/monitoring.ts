import type { ComponentType, ReactNode } from "react";
import { Component } from "react";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "@/lib/version";

/**
 * Crash and error reporting. Enabled only when VITE_SENTRY_DSN is set; the
 * Sentry SDK is loaded on demand, so builds without a DSN don't ship it.
 */
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
type SentryModule = typeof import("@sentry/react");
let sentry: SentryModule | null = null;
let pendingUser: string | null | undefined;

export const initMonitoring = () => {
  if (!DSN) return;
  import("@sentry/react").then((S) => {
    S.init({
      dsn: DSN,
      release: `great-sport-bets@${APP_VERSION}`,
      environment: import.meta.env.MODE,
      integrations: [S.browserTracingIntegration()],
      tracesSampleRate: 0.1,
      initialScope: { tags: { platform: Capacitor.getPlatform() } },
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.user) event.user = { id: event.user.id };
        return event;
      },
    });
    sentry = S;
    if (pendingUser !== undefined) S.setUser(pendingUser ? { id: pendingUser } : null);
  });
};

/** Attach the signed-in user's id (never the email) to future reports. */
export const setMonitoringUser = (id: string | null) => {
  if (!DSN) return;
  if (sentry) sentry.setUser(id ? { id } : null);
  else pendingUser = id;
};

/** Shows `fallback` instead of a blank screen when rendering crashes, and reports it. */
export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    sentry?.captureException(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export type { ComponentType };
