-- Seed AI Models with actual models used in iSyncSO
-- These models are used by SYNC agent, image generation, invoice processing, etc.

-- ============================================================================
-- Together.ai LLM Models (used by SYNC Agent)
-- ============================================================================

INSERT INTO public.ai_models (name, slug, provider, model_id, description, capabilities, pricing_input, pricing_output, max_tokens, context_window, is_active)
VALUES
  -- SYNC primary model - Moonshot Kimi K2
  ('Kimi K2 Instruct', 'kimi-k2-instruct', 'together', 'moonshotai/Kimi-K2-Instruct',
   'Primary model for SYNC agent - best open-source agentic model with 131K context',
   ARRAY['chat', 'function_calling'], 0.0006, 0.0009, 8192, 131072, true),

  -- SYNC fallback model - Free Llama
  ('Llama 3.3 70B Turbo (Free)', 'llama-3.3-70b-free', 'together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
   'Free fallback model for SYNC agent when primary fails',
   ARRAY['chat'], 0, 0, 8192, 131072, true),

  -- Paid Llama variant
  ('Llama 3.3 70B Turbo', 'llama-3.3-70b', 'together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
   'High-quality open-source model for complex reasoning tasks',
   ARRAY['chat', 'function_calling'], 0.00088, 0.00088, 8192, 131072, true),

  -- Fast model for classification
  ('Llama 3.1 8B Turbo', 'llama-3.1-8b', 'together', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
   'Fast, efficient model for intent classification and simple tasks',
   ARRAY['chat'], 0.00018, 0.00018, 8192, 131072, true)

ON CONFLICT (slug) DO UPDATE SET
  pricing_input = EXCLUDED.pricing_input,
  pricing_output = EXCLUDED.pricing_output,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- Embedding Models (used by SYNC memory/RAG)
-- ============================================================================

INSERT INTO public.ai_models (name, slug, provider, model_id, description, capabilities, pricing_input, pricing_output, max_tokens, context_window, is_active)
VALUES
  ('BGE Large EN v1.5', 'bge-large-en', 'together', 'BAAI/bge-large-en-v1.5',
   'High-quality embedding model for RAG and semantic search (1024 dimensions)',
   ARRAY['embedding'], 0.00002, 0, 512, 8192, true)

ON CONFLICT (slug) DO UPDATE SET
  pricing_input = EXCLUDED.pricing_input,
  pricing_output = EXCLUDED.pricing_output,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- Groq Models (used by Invoice Processing)
-- ============================================================================

INSERT INTO public.ai_models (name, slug, provider, model_id, description, capabilities, pricing_input, pricing_output, max_tokens, context_window, is_active)
VALUES
  ('Llama 3.1 8B Instant (Groq)', 'llama-3.1-8b-groq', 'groq', 'llama-3.1-8b-instant',
   'Ultra-fast inference for invoice text extraction',
   ARRAY['chat'], 0.00005, 0.00008, 8192, 131072, true),

  ('Llama 3.3 70B Versatile (Groq)', 'llama-3.3-70b-groq', 'groq', 'llama-3.3-70b-versatile',
   'High-quality model for complex extraction tasks',
   ARRAY['chat'], 0.00059, 0.00079, 32768, 128000, true)

ON CONFLICT (slug) DO UPDATE SET
  pricing_input = EXCLUDED.pricing_input,
  pricing_output = EXCLUDED.pricing_output,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- Image Generation Models (Together.ai FLUX)
-- Note: Pricing is per megapixel, stored as 0 for tokens (handled specially)
-- ============================================================================

INSERT INTO public.ai_models (name, slug, provider, model_id, description, capabilities, pricing_input, pricing_output, max_tokens, context_window, is_active)
VALUES
  ('FLUX Kontext Pro', 'flux-kontext-pro', 'together', 'black-forest-labs/FLUX.1-Kontext-pro',
   'Premium image model with reference support - $0.04/megapixel',
   ARRAY['image'], 0, 0, 0, 0, true),

  ('FLUX Kontext Dev', 'flux-kontext-dev', 'together', 'black-forest-labs/FLUX.1-Kontext-dev',
   'Development image model with reference support - $0.025/megapixel',
   ARRAY['image'], 0, 0, 0, 0, true),

  ('FLUX 1.1 Pro', 'flux-pro', 'together', 'black-forest-labs/FLUX.1.1-pro',
   'High-quality marketing and creative images - $0.04/megapixel',
   ARRAY['image'], 0, 0, 0, 0, true),

  ('FLUX Dev', 'flux-dev', 'together', 'black-forest-labs/FLUX.1-dev',
   'Development-grade text-to-image - $0.025/megapixel',
   ARRAY['image'], 0, 0, 0, 0, true),

  ('FLUX Schnell', 'flux-schnell', 'together', 'black-forest-labs/FLUX.1-schnell',
   'Fast draft images - $0.003/megapixel',
   ARRAY['image'], 0, 0, 0, 0, true)

ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- Video Generation Models (Google)
-- ============================================================================

INSERT INTO public.ai_models (name, slug, provider, model_id, description, capabilities, pricing_input, pricing_output, max_tokens, context_window, is_active)
VALUES
  ('Google Veo', 'google-veo', 'google', 'veo-2.0-generate-001',
   'Google video generation model',
   ARRAY['video'], 0, 0, 0, 0, true),

  ('Gemini 2.0 Flash', 'gemini-2.0-flash', 'google', 'gemini-2.0-flash-exp',
   'Fast multimodal model for video generation fallback',
   ARRAY['video', 'chat', 'vision'], 0.00015, 0.0006, 8192, 1000000, true)

ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- Create index on model_id for fast lookups from edge functions
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_models_model_id ON public.ai_models(model_id);
