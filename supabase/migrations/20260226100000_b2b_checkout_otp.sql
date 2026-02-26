-- B2B Checkout OTP verification table
-- Stores hashed 6-digit codes sent to buyer emails before order placement

CREATE TABLE IF NOT EXISTS public.b2b_checkout_otp (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  organization_id UUID NOT NULL,
  code_hash       TEXT NOT NULL,
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  expires_at      TIMESTAMPTZ NOT NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_b2b_checkout_otp_lookup
  ON public.b2b_checkout_otp(email, organization_id, expires_at DESC)
  WHERE verified_at IS NULL;

ALTER TABLE public.b2b_checkout_otp ENABLE ROW LEVEL SECURITY;
