-- Content Management Module Migration
-- Phase 10: Pages, Posts, Help Articles, Announcements, Email Templates

-- ============================================================================
-- Content Pages Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Author
  author_id UUID REFERENCES auth.users(id),

  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Content Posts Table (Blog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,

  -- Categorization
  category TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Media
  featured_image TEXT,

  -- Author
  author_id UUID REFERENCES auth.users(id),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Analytics
  views INT DEFAULT 0,

  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Content Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Hierarchy
  parent_id UUID REFERENCES public.content_categories(id),

  -- Display
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Help Articles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,

  -- Categorization
  category_id UUID REFERENCES public.content_categories(id),
  tags TEXT[] DEFAULT '{}',

  -- Analytics
  views INT DEFAULT 0,
  helpful_yes INT DEFAULT 0,
  helpful_no INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Author
  author_id UUID REFERENCES auth.users(id),

  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Announcements Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,

  -- Type: info, warning, success, error
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),

  -- Target: all, admins, users, specific_companies
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'admins', 'users', 'specific_companies')),
  target_company_ids UUID[] DEFAULT '{}',

  -- Schedule
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Author
  created_by UUID REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Email Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Content
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,

  -- Variables that can be used in template
  variables TEXT[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_content_pages_slug ON public.content_pages(slug);
CREATE INDEX IF NOT EXISTS idx_content_pages_status ON public.content_pages(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_slug ON public.content_posts(slug);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON public.content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_category ON public.content_posts(category);
CREATE INDEX IF NOT EXISTS idx_content_categories_slug ON public.content_categories(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON public.help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON public.announcements(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Content Pages - Public can view published, admins full access
CREATE POLICY "Anyone can view published pages" ON public.content_pages
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "Platform admins full access to pages" ON public.content_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Content Posts - Public can view published, admins full access
CREATE POLICY "Anyone can view published posts" ON public.content_posts
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "Platform admins full access to posts" ON public.content_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Content Categories - Anyone can view active
CREATE POLICY "Anyone can view active categories" ON public.content_categories
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Platform admins full access to categories" ON public.content_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Help Articles - Public can view published
CREATE POLICY "Anyone can view published help articles" ON public.help_articles
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "Platform admins full access to help articles" ON public.help_articles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Announcements - Users can view active targeted to them
CREATE POLICY "Users can view active announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (is_active = true AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW()));

CREATE POLICY "Platform admins full access to announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- Email Templates - Admins only
CREATE POLICY "Platform admins full access to email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u JOIN public.rbac_user_roles ur ON u.id = ur.user_id JOIN public.rbac_roles r ON ur.role_id = r.id WHERE u.id = auth.uid() AND r.hierarchy_level >= 100));

-- ============================================================================
-- Grant Access
-- ============================================================================

GRANT ALL ON public.content_pages TO authenticated;
GRANT ALL ON public.content_posts TO authenticated;
GRANT ALL ON public.content_categories TO authenticated;
GRANT ALL ON public.help_articles TO authenticated;
GRANT ALL ON public.announcements TO authenticated;
GRANT ALL ON public.email_templates TO authenticated;

-- ============================================================================
-- Seed Content Categories
-- ============================================================================

INSERT INTO public.content_categories (name, slug, description, sort_order) VALUES
  ('Announcements', 'announcements', 'Platform announcements and news', 1),
  ('Tutorials', 'tutorials', 'How-to guides and tutorials', 2),
  ('Updates', 'updates', 'Product updates and changelog', 3),
  ('FAQ', 'faq', 'Frequently asked questions', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed Email Templates
-- ============================================================================

INSERT INTO public.email_templates (name, slug, description, subject, html_content, text_content, variables) VALUES
  ('Welcome Email', 'welcome', 'Sent to new users after signup',
   'Welcome to ISYNCSO, {{user_name}}!',
   '<h1>Welcome, {{user_name}}!</h1><p>Thank you for joining ISYNCSO. We''re excited to have you on board.</p><p>Get started by exploring your dashboard at {{dashboard_url}}.</p><p>Best regards,<br>The ISYNCSO Team</p>',
   'Welcome, {{user_name}}!\n\nThank you for joining ISYNCSO. We''re excited to have you on board.\n\nGet started by exploring your dashboard at {{dashboard_url}}.\n\nBest regards,\nThe ISYNCSO Team',
   ARRAY['user_name', 'user_email', 'dashboard_url']),

  ('Password Reset', 'password-reset', 'Sent when user requests password reset',
   'Reset your ISYNCSO password',
   '<h1>Password Reset Request</h1><p>Hi {{user_name}},</p><p>We received a request to reset your password. Click the button below to create a new password:</p><p><a href="{{reset_url}}" style="background:#ef4444;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you didn''t request this, you can safely ignore this email.</p>',
   'Password Reset Request\n\nHi {{user_name}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_url}}\n\nThis link will expire in 1 hour.\n\nIf you didn''t request this, you can safely ignore this email.',
   ARRAY['user_name', 'reset_url']),

  ('Invoice', 'invoice', 'Sent when a new invoice is generated',
   'Invoice #{{invoice_number}} from ISYNCSO',
   '<h1>Invoice #{{invoice_number}}</h1><p>Hi {{user_name}},</p><p>Your invoice for {{period}} is ready.</p><table><tr><td>Amount Due:</td><td><strong>{{amount}}</strong></td></tr><tr><td>Due Date:</td><td>{{due_date}}</td></tr></table><p><a href="{{invoice_url}}" style="background:#ef4444;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">View Invoice</a></p>',
   'Invoice #{{invoice_number}}\n\nHi {{user_name}},\n\nYour invoice for {{period}} is ready.\n\nAmount Due: {{amount}}\nDue Date: {{due_date}}\n\nView your invoice: {{invoice_url}}',
   ARRAY['user_name', 'invoice_number', 'period', 'amount', 'due_date', 'invoice_url'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Seed Sample Help Articles
-- ============================================================================

INSERT INTO public.help_articles (slug, title, content, category_id, tags, status, published_at) VALUES
  ('getting-started', 'Getting Started with ISYNCSO',
   '## Welcome to ISYNCSO\n\nThis guide will help you get started with our platform.\n\n### Step 1: Complete Your Profile\nNavigate to Settings > Profile to add your information.\n\n### Step 2: Invite Your Team\nGo to Team > Members to invite colleagues.\n\n### Step 3: Explore Features\nCheck out our main modules: Finance, Products, Growth, and more.',
   (SELECT id FROM content_categories WHERE slug = 'tutorials'),
   ARRAY['getting-started', 'onboarding', 'basics'],
   'published', NOW()),

  ('billing-faq', 'Billing & Subscription FAQ',
   '## Frequently Asked Questions about Billing\n\n### How do I upgrade my plan?\nGo to Settings > Subscription and click "Upgrade Plan".\n\n### Can I cancel anytime?\nYes, you can cancel your subscription at any time from Settings > Subscription.\n\n### How do refunds work?\nWe offer a 30-day money-back guarantee for annual subscriptions.',
   (SELECT id FROM content_categories WHERE slug = 'faq'),
   ARRAY['billing', 'subscription', 'payments', 'faq'],
   'published', NOW())
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Admin Functions
-- ============================================================================

-- Get content stats
CREATE OR REPLACE FUNCTION public.admin_get_content_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total_pages', (SELECT COUNT(*) FROM content_pages),
    'published_pages', (SELECT COUNT(*) FROM content_pages WHERE status = 'published'),
    'draft_pages', (SELECT COUNT(*) FROM content_pages WHERE status = 'draft'),
    'total_posts', (SELECT COUNT(*) FROM content_posts),
    'published_posts', (SELECT COUNT(*) FROM content_posts WHERE status = 'published'),
    'draft_posts', (SELECT COUNT(*) FROM content_posts WHERE status = 'draft'),
    'total_help_articles', (SELECT COUNT(*) FROM help_articles),
    'published_help_articles', (SELECT COUNT(*) FROM help_articles WHERE status = 'published'),
    'total_announcements', (SELECT COUNT(*) FROM announcements),
    'active_announcements', (SELECT COUNT(*) FROM announcements WHERE is_active = true AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW())),
    'total_email_templates', (SELECT COUNT(*) FROM email_templates),
    'active_email_templates', (SELECT COUNT(*) FROM email_templates WHERE is_active = true),
    'total_categories', (SELECT COUNT(*) FROM content_categories),
    'total_views', (
      SELECT COALESCE(SUM(views), 0) FROM (
        SELECT views FROM content_posts
        UNION ALL
        SELECT views FROM help_articles
      ) v
    )
  );
END;
$$;

-- Get pages
CREATE OR REPLACE FUNCTION public.admin_get_pages(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'items', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            cp.*,
            u.full_name as author_name
          FROM content_pages cp
          LEFT JOIN users u ON cp.author_id = u.id
          WHERE (p_status IS NULL OR cp.status = p_status)
            AND (p_search IS NULL OR cp.title ILIKE '%' || p_search || '%' OR cp.slug ILIKE '%' || p_search || '%')
          ORDER BY cp.updated_at DESC
          LIMIT p_limit OFFSET p_offset
        ) t
      ), '[]'::json),
      'total', (
        SELECT COUNT(*)
        FROM content_pages cp
        WHERE (p_status IS NULL OR cp.status = p_status)
          AND (p_search IS NULL OR cp.title ILIKE '%' || p_search || '%' OR cp.slug ILIKE '%' || p_search || '%')
      )
    )
  );
END;
$$;

-- Get posts
CREATE OR REPLACE FUNCTION public.admin_get_posts(
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'items', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            cp.*,
            u.full_name as author_name
          FROM content_posts cp
          LEFT JOIN users u ON cp.author_id = u.id
          WHERE (p_status IS NULL OR cp.status = p_status)
            AND (p_category IS NULL OR cp.category = p_category)
            AND (p_search IS NULL OR cp.title ILIKE '%' || p_search || '%' OR cp.slug ILIKE '%' || p_search || '%')
          ORDER BY cp.updated_at DESC
          LIMIT p_limit OFFSET p_offset
        ) t
      ), '[]'::json),
      'total', (
        SELECT COUNT(*)
        FROM content_posts cp
        WHERE (p_status IS NULL OR cp.status = p_status)
          AND (p_category IS NULL OR cp.category = p_category)
          AND (p_search IS NULL OR cp.title ILIKE '%' || p_search || '%' OR cp.slug ILIKE '%' || p_search || '%')
      )
    )
  );
END;
$$;

-- Get help articles
CREATE OR REPLACE FUNCTION public.admin_get_help_articles(
  p_status TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'items', COALESCE((
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            ha.*,
            cc.name as category_name,
            u.full_name as author_name
          FROM help_articles ha
          LEFT JOIN content_categories cc ON ha.category_id = cc.id
          LEFT JOIN users u ON ha.author_id = u.id
          WHERE (p_status IS NULL OR ha.status = p_status)
            AND (p_category_id IS NULL OR ha.category_id = p_category_id)
            AND (p_search IS NULL OR ha.title ILIKE '%' || p_search || '%' OR ha.slug ILIKE '%' || p_search || '%')
          ORDER BY ha.updated_at DESC
          LIMIT p_limit OFFSET p_offset
        ) t
      ), '[]'::json),
      'total', (
        SELECT COUNT(*)
        FROM help_articles ha
        WHERE (p_status IS NULL OR ha.status = p_status)
          AND (p_category_id IS NULL OR ha.category_id = p_category_id)
          AND (p_search IS NULL OR ha.title ILIKE '%' || p_search || '%' OR ha.slug ILIKE '%' || p_search || '%')
      )
    )
  );
END;
$$;

-- Get announcements
CREATE OR REPLACE FUNCTION public.admin_get_announcements(
  p_active_only BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
    FROM (
      SELECT
        a.*,
        u.full_name as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE NOT p_active_only OR (a.is_active = true AND a.starts_at <= NOW() AND (a.ends_at IS NULL OR a.ends_at > NOW()))
    ) t
  );
END;
$$;

-- Get email templates
CREATE OR REPLACE FUNCTION public.admin_get_email_templates()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.name), '[]'::json)
    FROM (
      SELECT * FROM email_templates
    ) t
  );
END;
$$;

-- Upsert page
CREATE OR REPLACE FUNCTION public.admin_upsert_page(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE content_pages SET
      title = COALESCE(p_data->>'title', title),
      slug = COALESCE(p_data->>'slug', slug),
      content = COALESCE(p_data->>'content', content),
      seo_title = COALESCE(p_data->>'seo_title', seo_title),
      seo_description = COALESCE(p_data->>'seo_description', seo_description),
      status = COALESCE(p_data->>'status', status),
      published_at = CASE
        WHEN p_data->>'status' = 'published' AND published_at IS NULL THEN NOW()
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO content_pages (title, slug, content, seo_title, seo_description, status, author_id, published_at)
    VALUES (
      p_data->>'title',
      p_data->>'slug',
      p_data->>'content',
      p_data->>'seo_title',
      p_data->>'seo_description',
      COALESCE(p_data->>'status', 'draft'),
      (p_data->>'author_id')::UUID,
      CASE WHEN p_data->>'status' = 'published' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(cp) FROM content_pages cp WHERE cp.id = result_id);
END;
$$;

-- Upsert post
CREATE OR REPLACE FUNCTION public.admin_upsert_post(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE content_posts SET
      title = COALESCE(p_data->>'title', title),
      slug = COALESCE(p_data->>'slug', slug),
      excerpt = COALESCE(p_data->>'excerpt', excerpt),
      content = COALESCE(p_data->>'content', content),
      category = COALESCE(p_data->>'category', category),
      tags = COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'tags') t), tags),
      featured_image = COALESCE(p_data->>'featured_image', featured_image),
      status = COALESCE(p_data->>'status', status),
      published_at = CASE
        WHEN p_data->>'status' = 'published' AND published_at IS NULL THEN NOW()
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO content_posts (title, slug, excerpt, content, category, tags, featured_image, status, author_id, published_at)
    VALUES (
      p_data->>'title',
      p_data->>'slug',
      p_data->>'excerpt',
      p_data->>'content',
      p_data->>'category',
      COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'tags') t), '{}'),
      p_data->>'featured_image',
      COALESCE(p_data->>'status', 'draft'),
      (p_data->>'author_id')::UUID,
      CASE WHEN p_data->>'status' = 'published' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(cp) FROM content_posts cp WHERE cp.id = result_id);
END;
$$;

-- Upsert help article
CREATE OR REPLACE FUNCTION public.admin_upsert_help_article(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE help_articles SET
      title = COALESCE(p_data->>'title', title),
      slug = COALESCE(p_data->>'slug', slug),
      content = COALESCE(p_data->>'content', content),
      category_id = COALESCE((p_data->>'category_id')::UUID, category_id),
      tags = COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'tags') t), tags),
      status = COALESCE(p_data->>'status', status),
      published_at = CASE
        WHEN p_data->>'status' = 'published' AND published_at IS NULL THEN NOW()
        ELSE published_at
      END,
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO help_articles (title, slug, content, category_id, tags, status, author_id, published_at)
    VALUES (
      p_data->>'title',
      p_data->>'slug',
      p_data->>'content',
      (p_data->>'category_id')::UUID,
      COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'tags') t), '{}'),
      COALESCE(p_data->>'status', 'draft'),
      (p_data->>'author_id')::UUID,
      CASE WHEN p_data->>'status' = 'published' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(ha) FROM help_articles ha WHERE ha.id = result_id);
END;
$$;

-- Upsert announcement
CREATE OR REPLACE FUNCTION public.admin_upsert_announcement(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE announcements SET
      title = COALESCE(p_data->>'title', title),
      content = COALESCE(p_data->>'content', content),
      type = COALESCE(p_data->>'type', type),
      target_audience = COALESCE(p_data->>'target_audience', target_audience),
      starts_at = COALESCE((p_data->>'starts_at')::TIMESTAMPTZ, starts_at),
      ends_at = (p_data->>'ends_at')::TIMESTAMPTZ,
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO announcements (title, content, type, target_audience, starts_at, ends_at, is_active, created_by)
    VALUES (
      p_data->>'title',
      p_data->>'content',
      COALESCE(p_data->>'type', 'info'),
      COALESCE(p_data->>'target_audience', 'all'),
      COALESCE((p_data->>'starts_at')::TIMESTAMPTZ, NOW()),
      (p_data->>'ends_at')::TIMESTAMPTZ,
      COALESCE((p_data->>'is_active')::BOOLEAN, true),
      (p_data->>'created_by')::UUID
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(a) FROM announcements a WHERE a.id = result_id);
END;
$$;

-- Upsert email template
CREATE OR REPLACE FUNCTION public.admin_upsert_email_template(p_data JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_data->>'id' IS NOT NULL THEN
    UPDATE email_templates SET
      name = COALESCE(p_data->>'name', name),
      description = COALESCE(p_data->>'description', description),
      subject = COALESCE(p_data->>'subject', subject),
      html_content = COALESCE(p_data->>'html_content', html_content),
      text_content = COALESCE(p_data->>'text_content', text_content),
      variables = COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'variables') t), variables),
      is_active = COALESCE((p_data->>'is_active')::BOOLEAN, is_active),
      updated_at = NOW()
    WHERE id = (p_data->>'id')::UUID
    RETURNING id INTO result_id;
  ELSE
    INSERT INTO email_templates (name, slug, description, subject, html_content, text_content, variables, is_active)
    VALUES (
      p_data->>'name',
      p_data->>'slug',
      p_data->>'description',
      p_data->>'subject',
      p_data->>'html_content',
      p_data->>'text_content',
      COALESCE((SELECT array_agg(t) FROM jsonb_array_elements_text(p_data->'variables') t), '{}'),
      COALESCE((p_data->>'is_active')::BOOLEAN, true)
    )
    RETURNING id INTO result_id;
  END IF;
  RETURN (SELECT row_to_json(et) FROM email_templates et WHERE et.id = result_id);
END;
$$;

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.admin_get_content_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_pages(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_posts(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_help_articles(TEXT, UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_announcements(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_email_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_page(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_post(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_help_article(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_announcement(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_email_template(JSONB) TO authenticated;
