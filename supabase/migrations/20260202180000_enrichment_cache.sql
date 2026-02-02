-- Enrichment Cache: Reduce Explorium API costs by caching results globally
-- Prospect data: 90-day freshness | Company data: 180-day freshness

-- Prospect/LinkedIn enrichment cache
CREATE TABLE IF NOT EXISTS enrichment_cache_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_url TEXT,
  email TEXT,
  enrichment_data JSONB NOT NULL,
  explorium_prospect_id TEXT,
  explorium_business_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
  hit_count INTEGER DEFAULT 1,
  last_hit_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_prospects_linkedin
  ON enrichment_cache_prospects(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_prospects_email
  ON enrichment_cache_prospects(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_prospects_expires
  ON enrichment_cache_prospects(expires_at);

-- Company intelligence enrichment cache
CREATE TABLE IF NOT EXISTS enrichment_cache_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT,
  domain TEXT,
  intelligence_data JSONB NOT NULL,
  explorium_business_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '180 days',
  hit_count INTEGER DEFAULT 1,
  last_hit_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_companies_name
  ON enrichment_cache_companies(normalized_name) WHERE normalized_name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_companies_domain
  ON enrichment_cache_companies(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_companies_expires
  ON enrichment_cache_companies(expires_at);
