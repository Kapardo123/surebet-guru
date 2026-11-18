import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "@/lib/version";

/**
 * Crash and error reporting. Enabled only when VITE_SENTRY_DSN is set
 * (Vercel env / .env); otherwise everything here is a no-op.
 */
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const initMonitoring = () => {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    release: `great-sport-bets@${APP_VERSION}`,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    initialScope: { tags: { platform: Capacitor.getPlatform() } },
    // Keep personal data out of reports.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
};

/** Attach the signed-in user's id (never the email) to future reports. */
export const setMonitoringUser = (id: string | null) => {
  if (!DSN) return;
  Sentry.setUser(id ? { id } : null);
};

export const ErrorBoundary = Sentry.ErrorBoundary;
