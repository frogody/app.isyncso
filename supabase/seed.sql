-- =============================================================================
-- iSyncSO Comprehensive Test Data Seed
-- =============================================================================
-- Run with: psql or Supabase SQL Editor / Management API
-- =============================================================================

-- Disable triggers temporarily for faster inserts
SET session_replication_role = replica;

-- =============================================================================
-- SECTION 1: FOUNDATION DATA
-- =============================================================================

-- 1.1 Organizations
INSERT INTO public.organizations (id, name, slug, description, settings, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'TechCorp Solutions', 'techcorp', 'Technology solutions company', '{"industry": "technology", "size": "medium"}', NOW() - INTERVAL '1 year'),
  ('22222222-2222-2222-2222-222222222222', 'Global Recruiting Partners', 'grp-recruiting', 'Recruitment agency', '{"industry": "recruiting", "size": "small"}', NOW() - INTERVAL '6 months'),
  ('33333333-3333-3333-3333-333333333333', 'Acme Industries', 'acme-ind', 'Manufacturing company', '{"industry": "manufacturing", "size": "large"}', NOW() - INTERVAL '2 years')
ON CONFLICT (id) DO NOTHING;

-- 1.2 Companies
INSERT INTO public.companies (id, organization_id, name, domain, industry, size, created_date) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'TechCorp HQ', 'techcorp.com', 'Technology', 'Medium', NOW() - INTERVAL '1 year'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'GRP Netherlands', 'grp-recruiting.com', 'Recruiting', 'Small', NOW() - INTERVAL '6 months'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Acme Europe', 'acme-ind.com', 'Manufacturing', 'Large', NOW() - INTERVAL '2 years')
ON CONFLICT (id) DO NOTHING;

-- 1.3 Users
INSERT INTO public.users (id, auth_id, email, name, full_name, avatar_url, role, company_id, organization_id) VALUES
  -- TechCorp Users
  ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'david@techcorp.com', 'David', 'David de Bruin', NULL, 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'sarah@techcorp.com', 'Sarah', 'Sarah Johnson', NULL, 'manager', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'mike@techcorp.com', 'Mike', 'Mike Chen', NULL, 'user', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('a1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'emma@techcorp.com', 'Emma', 'Emma Williams', NULL, 'user', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  -- GRP Users
  ('b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'lisa@grp-recruiting.com', 'Lisa', 'Lisa van der Berg', NULL, 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
  ('b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'tom@grp-recruiting.com', 'Tom', 'Tom Bakker', NULL, 'manager', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
  ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'anna@grp-recruiting.com', 'Anna', 'Anna Jansen', NULL, 'user', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
  ('b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'peter@grp-recruiting.com', 'Peter', 'Peter de Vries', NULL, 'user', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
  -- Acme Users
  ('c1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'hans@acme-ind.com', 'Hans', 'Hans Mueller', NULL, 'admin', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333'),
  ('c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'claudia@acme-ind.com', 'Claudia', 'Claudia Schmidt', NULL, 'manager', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333'),
  ('c1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'klaus@acme-ind.com', 'Klaus', 'Klaus Weber', NULL, 'user', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333'),
  ('c1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'maria@acme-ind.com', 'Maria', 'Maria Fischer', NULL, 'user', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- 1.4 Teams
INSERT INTO public.teams (id, organization_id, company_id, name, description, lead_id, created_date) VALUES
  ('00100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Engineering', 'Software development team', 'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 year'),
  ('00100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sales & Growth', 'Sales and business development', 'a1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 year'),
  ('00200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tech Recruiters', 'Technology sector recruitment', 'b1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 months'),
  ('00200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Executive Search', 'C-level recruitment', 'b1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '6 months'),
  ('00300000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Operations', 'Manufacturing operations', 'c1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 years'),
  ('00300000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Supply Chain', 'Logistics and procurement', 'c1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 years')
ON CONFLICT (id) DO NOTHING;

-- 1.5 Team Members
INSERT INTO public.team_members (id, team_id, user_id, role, joined_at) VALUES
  ('01100000-0000-0000-0000-000000000001', '00100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'lead', NOW()),
  ('01100000-0000-0000-0000-000000000002', '00100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'member', NOW()),
  ('01100000-0000-0000-0000-000000000003', '00100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'lead', NOW()),
  ('01100000-0000-0000-0000-000000000004', '00100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'member', NOW()),
  ('01200000-0000-0000-0000-000000000001', '00200000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'lead', NOW()),
  ('01200000-0000-0000-0000-000000000002', '00200000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'member', NOW())
ON CONFLICT (id) DO NOTHING;

-- 1.6 RBAC Roles (skip if roles already exist)
INSERT INTO public.rbac_roles (id, name, hierarchy_level, description) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'super_admin', 100, 'Full system access'),
  ('e0000000-0000-0000-0000-000000000002', 'admin', 80, 'Company-wide management'),
  ('e0000000-0000-0000-0000-000000000003', 'manager', 60, 'Team/department management'),
  ('e0000000-0000-0000-0000-000000000004', 'user', 40, 'Standard features'),
  ('e0000000-0000-0000-0000-000000000005', 'viewer', 20, 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- 1.7 User Roles (using role lookup by name)
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', id FROM public.rbac_roles WHERE name = 'admin'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', id FROM public.rbac_roles WHERE name = 'manager'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', id FROM public.rbac_roles WHERE name = 'user'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', id FROM public.rbac_roles WHERE name = 'user'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e200000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', id FROM public.rbac_roles WHERE name = 'admin'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e200000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', id FROM public.rbac_roles WHERE name = 'manager'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e200000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', id FROM public.rbac_roles WHERE name = 'user'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e300000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', id FROM public.rbac_roles WHERE name = 'admin'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.rbac_user_roles (id, user_id, role_id)
SELECT '0e300000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', id FROM public.rbac_roles WHERE name = 'manager'
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 2: TALENT & RECRUITMENT MODULE
-- =============================================================================

-- 2.1 Projects (Recruitment Projects)
INSERT INTO public.projects (id, organization_id, title, description, client_company, client_contact_name, client_contact_email, status, priority, created_date) VALUES
  ('02100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Platform Team Expansion', 'Hiring senior engineers for platform team', 'TechCorp Solutions', 'David de Bruin', 'david@techcorp.com', 'active', 'high', NOW() - INTERVAL '2 months'),
  ('02100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Data Science Team Build', 'Building new data science capability', 'TechCorp Solutions', 'Sarah Johnson', 'sarah@techcorp.com', 'active', 'medium', NOW() - INTERVAL '1 month'),
  ('02200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'FinTech Scale-up Hiring', 'Series B startup needs engineering team', 'PayFlow BV', 'Mark Stevens', 'mark@payflow.io', 'active', 'high', NOW() - INTERVAL '3 months'),
  ('02200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'E-commerce CTO Search', 'Executive search for CTO position', 'ShopNow AG', 'Julia Richter', 'julia@shopnow.de', 'active', 'high', NOW() - INTERVAL '2 weeks'),
  ('02200000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Healthcare Tech Expansion', 'Multiple hires for healthtech company', 'MedTech Solutions', 'Dr. Anna Peters', 'anna@medtech.nl', 'active', 'medium', NOW() - INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- 2.2 Roles (Job Positions)
INSERT INTO public.roles (id, organization_id, project_id, title, description, required_skills, salary_range, location_requirements, remote_policy, employment_type, status, created_date) VALUES
  ('03100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '02100000-0000-0000-0000-000000000001', 'Senior Backend Engineer', 'Design and build scalable backend services', '{"Python", "Go", "Kubernetes", "PostgreSQL", "AWS"}', '80000-110000 EUR', 'Amsterdam, Netherlands', 'hybrid', 'full_time', 'open', NOW() - INTERVAL '2 months'),
  ('03100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '02100000-0000-0000-0000-000000000001', 'DevOps Engineer', 'Maintain and improve CI/CD infrastructure', '{"Kubernetes", "Terraform", "AWS", "CI/CD", "Docker"}', '70000-95000 EUR', 'Amsterdam, Netherlands', 'hybrid', 'full_time', 'open', NOW() - INTERVAL '2 months'),
  ('03100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '02100000-0000-0000-0000-000000000002', 'Senior Data Scientist', 'Build ML models for product recommendations', '{"Python", "TensorFlow", "PyTorch", "SQL", "MLOps"}', '90000-120000 EUR', 'Amsterdam, Netherlands', 'remote', 'full_time', 'open', NOW() - INTERVAL '1 month'),
  ('03200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000001', 'Full Stack Developer', 'Build fintech payment platform', '{"React", "Node.js", "TypeScript", "PostgreSQL"}', '65000-85000 EUR', 'Rotterdam, Netherlands', 'hybrid', 'full_time', 'open', NOW() - INTERVAL '3 months'),
  ('03200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000001', 'QA Engineer', 'Ensure quality of payment platform', '{"Selenium", "Cypress", "API Testing", "CI/CD"}', '50000-70000 EUR', 'Rotterdam, Netherlands', 'hybrid', 'full_time', 'open', NOW() - INTERVAL '3 months'),
  ('03200000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000002', 'Chief Technology Officer', 'Lead technology strategy and team', '{"Leadership", "Architecture", "E-commerce", "Strategy"}', '150000-200000 EUR', 'Berlin, Germany', 'hybrid', 'full_time', 'open', NOW() - INTERVAL '2 weeks'),
  ('03200000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000003', 'Healthcare Software Engineer', 'Build HIPAA-compliant healthcare apps', '{"Java", "Spring Boot", "HIPAA", "HL7", "FHIR"}', '70000-95000 EUR', 'Utrecht, Netherlands', 'hybrid', 'full_time', 'open', NOW() - INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- 2.3 Candidates (intelligence_level: Low/Medium/High/Critical, intelligence_urgency: Low/Medium/High)
INSERT INTO public.candidates (id, organization_id, first_name, last_name, email, phone, linkedin_profile, job_title, company_name, person_home_location, skills, years_experience, contact_status, source, intelligence_score, intelligence_level, intelligence_urgency, outreach_status, outreach_stage, created_date) VALUES
  ('cd100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alex', 'Thompson', 'alex.thompson@email.com', '+31612345001', 'https://linkedin.com/in/alexthompson', 'Senior Software Engineer', 'Booking.com', 'Amsterdam, Netherlands', '{"Python", "Go", "Kubernetes", "PostgreSQL", "AWS"}', 7, 'new', 'linkedin', 85, 'High', 'Medium', 'pending', 'initial', NOW() - INTERVAL '10 days'),
  ('cd100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Maria', 'Garcia', 'maria.garcia@email.com', '+31612345002', 'https://linkedin.com/in/mariagarcia', 'Backend Lead', 'Adyen', 'Amsterdam, Netherlands', '{"Java", "Kotlin", "Spring Boot", "Kafka", "AWS"}', 8, 'contacted', 'linkedin', 92, 'Critical', 'High', 'contacted', 'follow_up_1', NOW() - INTERVAL '15 days'),
  ('cd100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Jan', 'de Groot', 'jan.degroot@email.com', '+31612345003', 'https://linkedin.com/in/jandegroot', 'Platform Engineer', 'ING', 'Rotterdam, Netherlands', '{"Go", "Kubernetes", "Terraform", "GCP", "Python"}', 6, 'new', 'referral', 78, 'High', 'Low', 'pending', 'initial', NOW() - INTERVAL '5 days'),
  ('cd100000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Sophie', 'Laurent', 'sophie.laurent@email.com', '+31612345004', 'https://linkedin.com/in/sophielaurent', 'Senior Data Scientist', 'Philips', 'Eindhoven, Netherlands', '{"Python", "TensorFlow", "PyTorch", "SQL", "MLOps"}', 6, 'new', 'linkedin', 88, 'High', 'Medium', 'pending', 'initial', NOW() - INTERVAL '8 days'),
  ('cd100000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Chen', 'Wei', 'chen.wei@email.com', '+31612345005', 'https://linkedin.com/in/chenwei', 'ML Research Engineer', 'TomTom', 'Amsterdam, Netherlands', '{"Python", "PyTorch", "Computer Vision", "Deep Learning"}', 5, 'interested', 'linkedin', 95, 'Critical', 'High', 'replied', 'completed', NOW() - INTERVAL '20 days'),
  ('cd100000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Erik', 'Johansson', 'erik.johansson@email.com', '+31612345006', 'https://linkedin.com/in/erikjohansson', 'DevOps Engineer', 'Coolblue', 'Rotterdam, Netherlands', '{"Kubernetes", "Terraform", "AWS", "CI/CD", "Python"}', 4, 'new', 'linkedin', 75, 'Medium', 'Low', 'pending', 'initial', NOW() - INTERVAL '3 days'),
  ('cd200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Thomas', 'Vermeer', 'thomas.vermeer@email.com', '+31612345101', 'https://linkedin.com/in/thomasvermeer', 'Full Stack Developer', 'Bunq', 'Amsterdam, Netherlands', '{"React", "Node.js", "TypeScript", "PostgreSQL", "AWS"}', 4, 'contacted', 'linkedin', 82, 'High', 'Medium', 'contacted', 'follow_up_1', NOW() - INTERVAL '25 days'),
  ('cd200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Nina', 'Kowalski', 'nina.kowalski@email.com', '+31612345102', 'https://linkedin.com/in/ninakowalski', 'Senior Frontend Engineer', 'Mollie', 'Amsterdam, Netherlands', '{"React", "Vue.js", "TypeScript", "GraphQL", "Testing"}', 5, 'interested', 'referral', 89, 'High', 'High', 'replied', 'completed', NOW() - INTERVAL '30 days'),
  ('cd200000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Pieter', 'Hendriks', 'pieter.hendriks@email.com', '+31612345103', 'https://linkedin.com/in/pieterhendriks', 'Backend Developer', 'ABN AMRO', 'Amsterdam, Netherlands', '{"Java", "Spring Boot", "Kafka", "Oracle", "Microservices"}', 6, 'new', 'linkedin', 76, 'Medium', 'Low', 'pending', 'initial', NOW() - INTERVAL '7 days'),
  ('cd200000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Michael', 'Bauer', 'michael.bauer@email.com', '+49170123401', 'https://linkedin.com/in/michaelbauer', 'VP of Engineering', 'Zalando', 'Berlin, Germany', '{"Leadership", "Architecture", "E-commerce", "Microservices"}', 12, 'contacted', 'executive_search', 94, 'Critical', 'Medium', 'contacted', 'follow_up_1', NOW() - INTERVAL '14 days'),
  ('cd200000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Katrin', 'Hoffmann', 'katrin.hoffmann@email.com', '+49170123402', 'https://linkedin.com/in/katrinhoffmann', 'CTO', 'About You', 'Hamburg, Germany', '{"Leadership", "E-commerce", "Cloud Architecture", "Agile"}', 15, 'interested', 'executive_search', 97, 'Critical', 'High', 'replied', 'completed', NOW() - INTERVAL '12 days'),
  ('cd200000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'Eva', 'Janssen', 'eva.janssen@email.com', '+31612345104', 'https://linkedin.com/in/evajanssen', 'Healthcare IT Specialist', 'Philips Healthcare', 'Eindhoven, Netherlands', '{"Java", "HIPAA", "HL7", "FHIR", "Spring Boot"}', 7, 'new', 'linkedin', 86, 'High', 'Medium', 'pending', 'initial', NOW() - INTERVAL '6 days'),
  ('cd200000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'Rob', 'van Dijk', 'rob.vandijk@email.com', '+31612345105', 'https://linkedin.com/in/robvandijk', 'Medical Software Engineer', 'ASML', 'Veldhoven, Netherlands', '{"C++", "Python", "Medical Devices", "Embedded Systems"}', 5, 'contacted', 'linkedin', 79, 'Medium', 'Low', 'contacted', 'initial', NOW() - INTERVAL '4 days'),
  ('cd200000-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222', 'Lisa', 'Muller', 'lisa.muller@email.com', '+49170123403', 'https://linkedin.com/in/lisamuller', 'QA Lead', 'Delivery Hero', 'Berlin, Germany', '{"Selenium", "Cypress", "API Testing", "CI/CD", "Agile"}', 6, 'new', 'linkedin', 81, 'High', 'Medium', 'pending', 'initial', NOW() - INTERVAL '9 days'),
  ('cd200000-0000-0000-0000-000000000009', '22222222-2222-2222-2222-222222222222', 'Marco', 'Rossi', 'marco.rossi@email.com', '+39345678901', 'https://linkedin.com/in/marcorossi', 'Senior Full Stack', 'N26', 'Berlin, Germany', '{"React", "Node.js", "TypeScript", "AWS", "FinTech"}', 5, 'interested', 'linkedin', 87, 'High', 'High', 'replied', 'completed', NOW() - INTERVAL '18 days'),
  ('cd200000-0000-0000-0000-000000000010', '22222222-2222-2222-2222-222222222222', 'Sanne', 'de Wit', 'sanne.dewit@email.com', '+31612345106', 'https://linkedin.com/in/sannedewit', 'Product Manager', 'Bol.com', 'Utrecht, Netherlands', '{"Product Management", "Agile", "E-commerce", "Data Analysis"}', 4, 'not_interested', 'linkedin', 72, 'Medium', 'Low', 'contacted', 'completed', NOW() - INTERVAL '35 days')
ON CONFLICT (id) DO NOTHING;

-- 2.4 Campaigns
INSERT INTO public.campaigns (id, organization_id, project_id, name, description, status, campaign_type, matching_criteria, message_style, stats, created_date) VALUES
  ('04100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '02100000-0000-0000-0000-000000000001', 'Senior Backend Q1 2026', 'Outreach campaign for senior backend engineers', 'active', 'recruitment', '{"skills": ["Python", "Go"], "experience_min": 5}', '{"tone": "professional"}', '{"matched": 15, "contacted": 8, "responded": 3}', NOW() - INTERVAL '1 month'),
  ('04100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '02100000-0000-0000-0000-000000000002', 'Data Science Talent Hunt', 'Finding senior data scientists', 'active', 'recruitment', '{"skills": ["Python", "ML"], "experience_min": 5}', '{"tone": "friendly"}', '{"matched": 12, "contacted": 5, "responded": 2}', NOW() - INTERVAL '2 weeks'),
  ('04200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000001', 'PayFlow Developer Search', 'Full stack developers for fintech startup', 'active', 'recruitment', '{"skills": ["React", "Node.js"], "experience_min": 3}', '{"tone": "enthusiastic"}', '{"matched": 25, "contacted": 18, "responded": 7}', NOW() - INTERVAL '2 months'),
  ('04200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000002', 'ShopNow CTO Executive Search', 'Executive search for CTO position', 'active', 'recruitment', '{"experience_min": 10, "leadership": true}', '{"tone": "formal"}', '{"matched": 8, "contacted": 6, "responded": 4}', NOW() - INTERVAL '10 days'),
  ('04200000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '02200000-0000-0000-0000-000000000003', 'MedTech Engineering Team', 'Healthcare software engineers', 'draft', 'recruitment', '{"skills": ["Java", "Healthcare"], "experience_min": 3}', '{"tone": "professional"}', '{"matched": 10, "contacted": 0, "responded": 0}', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- 2.5 Outreach Tasks
INSERT INTO public.outreach_tasks (id, organization_id, candidate_id, campaign_id, task_type, subject, content, candidate_name, status, stage, attempt_number, scheduled_at, sent_at, created_date, updated_at) VALUES
  ('05100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cd100000-0000-0000-0000-000000000001', '04100000-0000-0000-0000-000000000001', 'initial_outreach', 'Exciting opportunity at TechCorp', 'Hi Alex, I noticed your impressive background at Booking.com...', 'Alex Thompson', 'pending', 'initial', 1, NOW() + INTERVAL '1 day', NULL, NOW(), NOW()),
  ('05100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cd100000-0000-0000-0000-000000000002', '04100000-0000-0000-0000-000000000001', 'initial_outreach', 'Senior Backend role - Great fit', 'Hi Maria, Your experience as Backend Lead at Adyen...', 'Maria Garcia', 'sent', 'initial', 1, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('05100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cd100000-0000-0000-0000-000000000002', '04100000-0000-0000-0000-000000000001', 'follow_up_1', 'Following up - Backend opportunity', 'Hi Maria, Just wanted to follow up...', 'Maria Garcia', 'sent', 'follow_up_1', 2, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('05100000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cd100000-0000-0000-0000-000000000003', '04100000-0000-0000-0000-000000000001', 'initial_outreach', 'Platform Engineer opportunity', 'Hi Jan, Your background in Go and Kubernetes...', 'Jan de Groot', 'approved_ready', 'initial', 1, NOW() + INTERVAL '2 hours', NULL, NOW(), NOW()),
  ('05200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000001', '04200000-0000-0000-0000-000000000001', 'initial_outreach', 'Full Stack opportunity at FinTech', 'Hi Thomas, I came across your profile...', 'Thomas Vermeer', 'sent', 'initial', 1, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('05200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000001', '04200000-0000-0000-0000-000000000001', 'follow_up_1', 'Quick follow-up, Thomas', 'Hi Thomas, I wanted to follow up...', 'Thomas Vermeer', 'sent', 'follow_up_1', 2, NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
  ('05200000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000002', '04200000-0000-0000-0000-000000000001', 'initial_outreach', 'Frontend role - Perfect for you', 'Hi Nina, Your work at Mollie caught my attention...', 'Nina Kowalski', 'replied', 'initial', 1, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days'),
  ('05200000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000004', '04200000-0000-0000-0000-000000000002', 'initial_outreach', 'CTO opportunity - E-commerce leader', 'Dear Michael, I am reaching out regarding an exciting CTO position...', 'Michael Bauer', 'sent', 'initial', 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('05200000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000004', '04200000-0000-0000-0000-000000000002', 'follow_up_1', 'Following up on CTO opportunity', 'Dear Michael, I hope this finds you well...', 'Michael Bauer', 'approved_ready', 'follow_up_1', 2, NOW() + INTERVAL '3 days', NULL, NOW(), NOW()),
  ('05200000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000005', '04200000-0000-0000-0000-000000000002', 'initial_outreach', 'CTO position - Top E-commerce opportunity', 'Dear Katrin, Your impressive track record as CTO...', 'Katrin Hoffmann', 'replied', 'initial', 1, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- 2.6 Talent Deals
INSERT INTO public.talent_deals (id, organization_id, candidate_id, project_id, role_id, title, description, stage, deal_value, fee_type, fee_percentage, currency, candidate_salary, expected_start_date, probability, notes, created_at, updated_at) VALUES
  ('06200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000002', '02200000-0000-0000-0000-000000000001', '03200000-0000-0000-0000-000000000001', 'Nina Kowalski - PayFlow Full Stack', 'Strong candidate', 'interviews', 17500, 'percentage', 25, 'EUR', 70000, '2026-03-01', 70, 'Second interview scheduled', NOW() - INTERVAL '20 days', NOW()),
  ('06200000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000005', '02200000-0000-0000-0000-000000000002', '03200000-0000-0000-0000-000000000003', 'Katrin Hoffmann - ShopNow CTO', 'Exceptional candidate', 'offer', 45000, 'percentage', 25, 'EUR', 180000, '2026-04-01', 85, 'Verbal agreement reached', NOW() - INTERVAL '8 days', NOW()),
  ('06200000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000009', '02200000-0000-0000-0000-000000000001', '03200000-0000-0000-0000-000000000001', 'Marco Rossi - PayFlow Full Stack', 'Fintech experience', 'presented', 20000, 'percentage', 25, 'EUR', 80000, '2026-02-15', 50, 'Presented to client', NOW() - INTERVAL '15 days', NOW()),
  ('06200000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', NULL, '02200000-0000-0000-0000-000000000001', NULL, 'Anna Svensson - Data Role', 'Exploring role fit', 'search', 18750, 'percentage', 25, 'EUR', 75000, '2026-03-15', 30, 'Exploring opportunities', NOW() - INTERVAL '5 days', NOW()),
  ('06200000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'cd100000-0000-0000-0000-000000000005', '02200000-0000-0000-0000-000000000001', '03200000-0000-0000-0000-000000000001', 'Chen Wei - PayFlow (Placed)', 'Excellent ML engineer', 'confirmed', 22500, 'percentage', 25, 'EUR', 90000, '2025-12-01', 100, 'Successfully placed', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 weeks'),
  ('06200000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'cd200000-0000-0000-0000-000000000010', '02200000-0000-0000-0000-000000000001', '03200000-0000-0000-0000-000000000001', 'Sanne de Wit - PayFlow (Lost)', 'Product manager', 'lost', 0, 'percentage', 25, 'EUR', 65000, NULL, 0, 'Client wanted technical background', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 3: FINANCE MODULE
-- =============================================================================

-- 3.1 Suppliers
INSERT INTO public.suppliers (id, company_id, name, code, contact, address, terms, rating, status, country, created_at) VALUES
  ('07100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TechSupply BV', 'TECH001', '{"email": "orders@techsupply.nl", "phone": "+31201234567"}', '{"street": "Industrieweg 15", "city": "Amsterdam"}', '{"payment_days": 30}', 4.5, 'active', 'NL', NOW() - INTERVAL '6 months'),
  ('07100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Global Electronics', 'GLOB001', '{"email": "sales@globalelec.com", "phone": "+442071234567"}', '{"street": "Tech Park 45", "city": "London"}', '{"payment_days": 45}', 4.2, 'active', 'UK', NOW() - INTERVAL '1 year'),
  ('07100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Parts Direct GmbH', 'PART001', '{"email": "verkauf@partsdirect.de", "phone": "+49301234567"}', '{"street": "Hauptstrasse 88", "city": "Berlin"}', '{"payment_days": 14}', 4.8, 'active', 'DE', NOW() - INTERVAL '3 months'),
  ('07300000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Industrial Components AG', 'IND001', '{"email": "orders@indcomp.de"}', '{"street": "Fabrikweg 22", "city": "Munich"}', '{"payment_days": 30}', 4.6, 'active', 'DE', NOW() - INTERVAL '2 years'),
  ('07300000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Steel Masters NL', 'STEEL01', '{"email": "sales@steelmasters.nl"}', '{"street": "Havenweg 100", "city": "Rotterdam"}', '{"payment_days": 21}', 4.3, 'active', 'NL', NOW() - INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- 3.2 Products
INSERT INTO public.products (id, company_id, slug, type, status, name, tagline, description, category, tags, ean, is_physical, created_at) VALUES
  ('08100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'laptop-pro-15', 'physical', 'published', 'Laptop Pro 15', 'Professional laptop', 'High-performance laptop with 32GB RAM', 'Electronics', '{"laptop", "computer"}', '8712345678901', true, NOW() - INTERVAL '6 months'),
  ('08100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'monitor-4k-27', 'physical', 'published', '4K Monitor 27"', 'Crystal clear 4K display', '27-inch 4K UHD monitor', 'Electronics', '{"monitor", "display"}', '8712345678902', true, NOW() - INTERVAL '6 months'),
  ('08100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mechanical-keyboard', 'physical', 'published', 'Mechanical Keyboard Pro', 'Premium typing', 'Cherry MX mechanical keyboard', 'Accessories', '{"keyboard"}', '8712345678903', true, NOW() - INTERVAL '4 months'),
  ('08100000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'usb-c-hub-7port', 'physical', 'published', 'USB-C Hub 7-Port', 'All-in-one connectivity', '7-port USB-C hub', 'Accessories', '{"usb", "hub"}', '8712345678904', true, NOW() - INTERVAL '3 months'),
  ('08100000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'webcam-hd-1080', 'physical', 'published', 'HD Webcam 1080p', 'Professional video', '1080p webcam with autofocus', 'Electronics', '{"webcam"}', '8712345678905', true, NOW() - INTERVAL '5 months'),
  ('08100000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'headphones-wireless', 'physical', 'published', 'Wireless Headphones ANC', 'Immersive audio', 'Over-ear wireless with ANC', 'Audio', '{"headphones"}', '8712345678906', true, NOW() - INTERVAL '2 months'),
  ('08300000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'steel-beam-100', 'physical', 'published', 'Steel Beam 100mm', 'Industrial grade', '100mm H-beam structural steel', 'Raw Materials', '{"steel"}', '8712345678911', true, NOW() - INTERVAL '2 years'),
  ('08300000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aluminum-sheet-2mm', 'physical', 'published', 'Aluminum Sheet 2mm', 'Lightweight', '2mm aluminum sheet', 'Raw Materials', '{"aluminum"}', '8712345678912', true, NOW() - INTERVAL '2 years'),
  ('08300000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'industrial-motor-5kw', 'physical', 'published', 'Industrial Motor 5kW', 'High-efficiency', '5kW three-phase motor', 'Components', '{"motor"}', '8712345678913', true, NOW() - INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- 3.3 Customers
INSERT INTO public.customers (id, company_id, name, email, phone, address_line1, city, postal_code, country, kvk_number, btw_number, payment_days_after_delivery, credit_limit, status, created_at) VALUES
  ('09100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Digital Agency BV', 'finance@digitalagency.nl', '+31201111111', 'Herengracht 100', 'Amsterdam', '1015BS', 'NL', '12345678', 'NL123456789B01', 30, 50000, 'active', NOW() - INTERVAL '1 year'),
  ('09100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'StartUp Labs', 'accounts@startuplabs.io', '+31202222222', 'Singel 250', 'Amsterdam', '1016AB', 'NL', '23456789', 'NL234567890B01', 14, 25000, 'active', NOW() - INTERVAL '8 months'),
  ('09100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Corporate Solutions GmbH', 'billing@corpsolutions.de', '+49301112233', 'Friedrichstrasse 50', 'Berlin', '10117', 'DE', NULL, 'DE123456789', 45, 100000, 'active', NOW() - INTERVAL '6 months'),
  ('09100000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tech Startup NL', 'invoices@techstartup.nl', '+31203333333', 'Westerstraat 45', 'Amsterdam', '1015LZ', 'NL', '34567890', 'NL345678901B01', 30, 15000, 'active', NOW() - INTERVAL '4 months'),
  ('09300000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Construction Giant NV', 'procurement@construgiant.be', '+3221234567', 'Rue de la Loi 200', 'Brussels', '1000', 'BE', NULL, 'BE0123456789', 30, 500000, 'active', NOW() - INTERVAL '2 years'),
  ('09300000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Manufacturing Plus', 'orders@mfgplus.de', '+49401234567', 'Hafenstrasse 15', 'Hamburg', '20095', 'DE', NULL, 'DE234567890', 45, 250000, 'active', NOW() - INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- 3.4 Prospects (CRM)
INSERT INTO public.prospects (id, owner_id, organization_id, first_name, last_name, email, phone, company, job_title, website, linkedin_url, location, stage, probability, deal_value, contact_type, source, is_recruitment_client, recruitment_fee_percentage, active_projects_count, total_placements, notes, created_date) VALUES
  ('0a100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Robert', 'van den Berg', 'r.vandenberg@fintech-nl.com', '+31612345201', 'FinTech NL', 'CTO', 'https://fintech-nl.com', 'https://linkedin.com/in/robertvandenberg', 'Amsterdam', 'qualified', 60, 75000, 'prospect', 'referral', false, NULL, NULL, NULL, 'Met at TechCrunch event', NOW() - INTERVAL '2 months'),
  ('0a100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Linda', 'Smits', 'linda.smits@healthcare-tech.nl', '+31612345202', 'Healthcare Tech BV', 'Head of IT', 'https://healthcare-tech.nl', NULL, 'Utrecht', 'proposal', 75, 120000, 'prospect', 'linkedin', false, NULL, NULL, NULL, 'Needs custom integration', NOW() - INTERVAL '1 month'),
  ('0a200000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Mark', 'Stevens', 'mark@payflow.io', '+31612345301', 'PayFlow BV', 'CEO', 'https://payflow.io', 'https://linkedin.com/in/markstevens', 'Rotterdam', 'customer', 100, 250000, 'client', 'referral', true, 25, 3, 2, 'Active recruitment partner', NOW() - INTERVAL '6 months'),
  ('0a200000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Julia', 'Richter', 'julia@shopnow.de', '+49170234567', 'ShopNow AG', 'CHRO', 'https://shopnow.de', NULL, 'Berlin', 'customer', 100, 180000, 'client', 'executive_search', true, 25, 1, 0, 'Executive search client', NOW() - INTERVAL '3 months'),
  ('0a200000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Anna', 'Peters', 'anna@medtech.nl', '+31612345302', 'MedTech Solutions', 'HR Director', 'https://medtech.nl', NULL, 'Utrecht', 'qualified', 80, 150000, 'prospect', 'linkedin', true, 20, 1, 0, 'Expanding team', NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- 3.5 Expenses
INSERT INTO public.expenses (id, company_id, supplier_id, expense_number, document_type, subtotal, tax_percent, tax_amount, total, currency, payment_status, payment_due_date, invoice_date, description, category, status, created_at, user_id) VALUES
  ('0b100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '07100000-0000-0000-0000-000000000001', 'EXP-2026-001', 'invoice', 5000, 21, 1050, 6050, 'EUR', 'paid', '2026-01-15', '2025-12-15', 'Laptop components bulk order', 'inventory', 'approved', NOW() - INTERVAL '1 month', 'a1000000-0000-0000-0000-000000000001'),
  ('0b100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '07100000-0000-0000-0000-000000000002', 'EXP-2026-002', 'invoice', 12500, 20, 2500, 15000, 'EUR', 'pending', '2026-02-01', '2026-01-01', 'Monitor shipment Q1', 'inventory', 'approved', NOW() - INTERVAL '2 weeks', 'a1000000-0000-0000-0000-000000000001'),
  ('0b100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '07100000-0000-0000-0000-000000000003', 'EXP-2026-003', 'invoice', 2500, 19, 475, 2975, 'EUR', 'pending', '2026-01-28', '2026-01-14', 'Keyboard and accessories', 'inventory', 'pending', NOW() - INTERVAL '1 week', 'a1000000-0000-0000-0000-000000000003'),
  ('0b100000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'EXP-2026-004', 'receipt', 450, 21, 94.50, 544.50, 'EUR', 'paid', '2026-01-10', '2026-01-08', 'Office supplies', 'office', 'approved', NOW() - INTERVAL '1 week', 'a1000000-0000-0000-0000-000000000002'),
  ('0b300000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '07300000-0000-0000-0000-000000000001', 'EXP-2026-001', 'invoice', 45000, 19, 8550, 53550, 'EUR', 'paid', '2026-01-20', '2025-12-20', 'Industrial motors batch', 'inventory', 'approved', NOW() - INTERVAL '1 month', 'c1000000-0000-0000-0000-000000000001'),
  ('0b300000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '07300000-0000-0000-0000-000000000002', 'EXP-2026-002', 'invoice', 125000, 21, 26250, 151250, 'EUR', 'pending', '2026-02-05', '2026-01-05', 'Steel beam shipment', 'inventory', 'approved', NOW() - INTERVAL '10 days', 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 4: INVENTORY
-- =============================================================================

-- 4.1 Inventory Records
INSERT INTO public.inventory (id, company_id, product_id, quantity_on_hand, quantity_reserved, max_stock, reorder_point, warehouse_location, last_counted_at, created_at) VALUES
  ('0c100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '08100000-0000-0000-0000-000000000001', 45, 5, 100, 20, 'Warehouse A - Rack 1', NOW() - INTERVAL '1 week', NOW() - INTERVAL '6 months'),
  ('0c100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '08100000-0000-0000-0000-000000000002', 78, 10, 150, 30, 'Warehouse A - Rack 2', NOW() - INTERVAL '1 week', NOW() - INTERVAL '6 months'),
  ('0c100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '08100000-0000-0000-0000-000000000003', 120, 0, 200, 40, 'Warehouse A - Rack 3', NOW() - INTERVAL '1 week', NOW() - INTERVAL '4 months'),
  ('0c100000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '08100000-0000-0000-0000-000000000004', 200, 15, 300, 50, 'Warehouse A - Rack 4', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 months'),
  ('0c100000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '08100000-0000-0000-0000-000000000005', 65, 5, 100, 25, 'Warehouse A - Rack 5', NOW() - INTERVAL '1 week', NOW() - INTERVAL '5 months'),
  ('0c100000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '08100000-0000-0000-0000-000000000006', 8, 3, 50, 15, 'Warehouse A - Rack 6', NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 months'),
  ('0c300000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '08300000-0000-0000-0000-000000000001', 500, 100, 2000, 200, 'Factory Floor - Section A', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 years'),
  ('0c300000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '08300000-0000-0000-0000-000000000002', 250, 50, 500, 100, 'Factory Floor - Section B', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 years'),
  ('0c300000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '08300000-0000-0000-0000-000000000003', 25, 5, 50, 15, 'Factory Floor - Section C', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- 4.2 Expected Deliveries
INSERT INTO public.expected_deliveries (id, company_id, supplier_id, product_id, quantity_expected, expected_date, status, notes, created_at) VALUES
  ('ed100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '07100000-0000-0000-0000-000000000001', '08100000-0000-0000-0000-000000000001', 30, NOW() + INTERVAL '5 days', 'confirmed', 'Regular restock order', NOW() - INTERVAL '1 week'),
  ('ed100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '07100000-0000-0000-0000-000000000002', '08100000-0000-0000-0000-000000000002', 50, NOW() + INTERVAL '12 days', 'in_transit', 'Q1 bulk order', NOW() - INTERVAL '2 weeks'),
  ('ed100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '07100000-0000-0000-0000-000000000003', '08100000-0000-0000-0000-000000000006', 40, NOW() + INTERVAL '3 days', 'confirmed', 'Urgent restock - low inventory', NOW() - INTERVAL '5 days'),
  ('ed300000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '07300000-0000-0000-0000-000000000001', '08300000-0000-0000-0000-000000000003', 20, NOW() + INTERVAL '8 days', 'confirmed', 'Motor restock', NOW() - INTERVAL '1 week'),
  ('ed300000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '07300000-0000-0000-0000-000000000002', '08300000-0000-0000-0000-000000000001', 200, NOW() + INTERVAL '4 days', 'in_transit', 'Steel beam shipment', NOW() - INTERVAL '2 weeks')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 5: AI & SYSTEM DATA
-- =============================================================================

-- 5.1 AI Usage Log
INSERT INTO public.ai_usage_log (id, company_id, user_id, model, cost_usd, content_type, metadata, created_at) VALUES
  ('0d100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000001', 'kimi-k2', 0.0375, 'chat', '{"session_id": "sync-001"}', NOW() - INTERVAL '2 days'),
  ('0d100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000001', 'flux-pro', 0.05, 'image', '{"prompt": "product photo"}', NOW() - INTERVAL '2 days'),
  ('0d100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000002', 'kimi-k2', 0.0255, 'chat', '{"session_id": "sync-002"}', NOW() - INTERVAL '1 day'),
  ('0d100000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000001', 'kimi-k2', 0.005, 'intelligence', '{"candidate_id": "cd200000-0000-0000-0000-000000000001"}', NOW() - INTERVAL '1 day'),
  ('0d100000-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000001', 'kimi-k2', 0.0036, 'outreach', '{"campaign_id": "04200000-0000-0000-0000-000000000001"}', NOW() - INTERVAL '12 hours'),
  ('0d100000-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000002', 'kimi-k2', 0.0195, 'chat', '{"session_id": "sync-003"}', NOW() - INTERVAL '6 hours'),
  ('0d100000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1000000-0000-0000-0000-000000000003', 'llama-3.3', 0.0064, 'invoice', '{"expense_id": "0b100000-0000-0000-0000-000000000003"}', NOW() - INTERVAL '1 hour'),
  ('0d100000-0000-0000-0000-000000000008', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'c1000000-0000-0000-0000-000000000001', 'kimi-k2', 0.0135, 'chat', '{"session_id": "sync-004"}', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- 5.2 SYNC Sessions
INSERT INTO public.sync_sessions (session_id, user_id, company_id, messages, conversation_summary, active_entities, context, created_at, updated_at) VALUES
  ('sync-session-001', 'a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '[{"role": "user", "content": "Show me recent invoices"}]', 'User asked about invoices', '{"clients": ["Digital Agency BV"]}', '{"last_action": "list_invoices"}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('sync-session-002', 'a1000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '[{"role": "user", "content": "Create a proposal for Healthcare Tech"}]', 'Created proposal PROP-2026-002', '{"clients": ["Healthcare Tech BV"]}', '{"last_action": "create_proposal"}', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('sync-session-003', 'b1000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '[{"role": "user", "content": "Generate outreach for PayFlow campaign"}]', 'Generated outreach for 5 candidates', '{"campaigns": ["PayFlow Developer Search"]}', '{"last_action": "generate_campaign_outreach"}', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours')
ON CONFLICT (session_id) DO NOTHING;

-- =============================================================================
-- CLEANUP
-- =============================================================================

SET session_replication_role = DEFAULT;
ANALYZE;

-- =============================================================================
-- END OF SEED FILE
-- =============================================================================
