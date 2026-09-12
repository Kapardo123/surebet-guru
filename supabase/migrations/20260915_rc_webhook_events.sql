-- Idempotency log for RevenueCat webhook deliveries. RevenueCat retries
-- webhooks; additive (stacking) grants must not be applied twice.
CREATE TABLE IF NOT EXISTS public.rc_webhook_events (
  event_id   text PRIMARY KEY,
  event_type text,
  user_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rc_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge functions) may read/write this.
