-- Growth Module Tables Migration
-- Run via Supabase Management API

-- Growth Campaigns
CREATE TABLE IF NOT EXISTS growth_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  campaign_type TEXT CHECK (campaign_type IN ('new_business', 'expansion', 'retention')),
  target_audience JSONB DEFAULT '{}',
  campaign_goals JSONB DEFAULT '{}',
  role_context JSONB DEFAULT '{}',
  prospects_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Growth Opportunities (for existing customer expansion)
CREATE TABLE IF NOT EXISTS growth_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_industry TEXT,
  customer_current_plan TEXT,
  customer_arr DECIMAL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('upsell', 'cross-sell', 'expansion')),
  value DECIMAL DEFAULT 0,
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'engaged', 'proposal', 'won', 'lost')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  signal_id UUID,
  signal_description TEXT,
  owner_id UUID,
  owner_name TEXT,
  next_action TEXT,
  next_action_date DATE,
  lost_reason TEXT,
  closed_at TIMESTAMPTZ,
  closed_value DECIMAL,
  days_in_stage INTEGER DEFAULT 0,
  stage_history JSONB DEFAULT '[]',
  activities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Signals
CREATE TABLE IF NOT EXISTS customer_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  customer_industry TEXT,
  customer_health_score INTEGER DEFAULT 50,
  customer_arr DECIMAL DEFAULT 0,
  signal_type TEXT CHECK (signal_type IN ('growth', 'usage', 'engagement', 'external', 'risk')),
  signal_name TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  potential_value DECIMAL DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  created_opportunity_id UUID,
  metadata JSONB DEFAULT '{}'
);

-- Growth Activity Log
CREATE TABLE IF NOT EXISTS growth_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_type TEXT, -- campaign, opportunity, signal, prospect
  related_id UUID,
  user_id UUID,
  user_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_growth_campaigns_org ON growth_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_growth_campaigns_status ON growth_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_growth_opportunities_org ON growth_opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_growth_opportunities_stage ON growth_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_customer_signals_org ON customer_signals(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_signals_type ON customer_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_growth_activities_org ON growth_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_growth_activities_type ON growth_activities(activity_type);

-- RLS Policies
ALTER TABLE growth_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own org campaigns" ON growth_campaigns;
DROP POLICY IF EXISTS "Users can manage own org campaigns" ON growth_campaigns;
DROP POLICY IF EXISTS "Users can view own org opportunities" ON growth_opportunities;
DROP POLICY IF EXISTS "Users can manage own org opportunities" ON growth_opportunities;
DROP POLICY IF EXISTS "Users can view own org signals" ON customer_signals;
DROP POLICY IF EXISTS "Users can manage own org signals" ON customer_signals;
DROP POLICY IF EXISTS "Users can view own org activities" ON growth_activities;
DROP POLICY IF EXISTS "Users can manage own org activities" ON growth_activities;

-- Create policies using auth wrapper functions
CREATE POLICY "Users can view own org campaigns" ON growth_campaigns
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can manage own org campaigns" ON growth_campaigns
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can view own org opportunities" ON growth_opportunities
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can manage own org opportunities" ON growth_opportunities
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can view own org signals" ON customer_signals
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can manage own org signals" ON customer_signals
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can view own org activities" ON growth_activities
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can manage own org activities" ON growth_activities
  FOR ALL TO authenticated
  USING (organization_id = auth_company_id());
