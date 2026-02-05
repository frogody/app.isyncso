/**
 * Explorium API Integration for Contact & Company Enrichment
 *
 * This service calls the explorium-enrich edge function which proxies
 * requests to the Explorium API (to avoid CORS issues).
 *
 * Available enrichment capabilities:
 * - Prospect matching (LinkedIn, email, name+company)
 * - Contact enrichment (emails, phones)
 * - Profile enrichment (skills, experience, education)
 * - Business matching and enrichment (firmographics, funding, tech stack)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEnrichmentFunction(body) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/explorium-enrich`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Enrichment request failed');
  }

  return data;
}

/**
 * Match prospect by LinkedIn URL, email, or name+company
 * @param {Object} params - Search parameters
 * @param {string} [params.linkedin] - LinkedIn profile URL
 * @param {string} [params.email] - Email address
 * @param {string} [params.full_name] - Full name
 * @param {string} [params.company_name] - Company name
 * @returns {Promise<string|null>} Prospect ID if found
 */
export async function matchProspect({ linkedin, email, full_name, company_name }) {
  const result = await callEnrichmentFunction({
    action: 'match_prospect',
    linkedin,
    email,
    full_name,
    company_name,
  });
  return result.prospect_id;
}

/**
 * Enrich prospect contact info (emails, phones)
 * @param {string} prospectId - Explorium prospect ID
 * @returns {Promise<Object>} Contact data
 */
export async function enrichProspectContact(prospectId) {
  return callEnrichmentFunction({
    action: 'enrich_contacts',
    prospect_id: prospectId,
  });
}

/**
 * Enrich prospect profile (experience, skills, education)
 * @param {string} prospectId - Explorium prospect ID
 * @returns {Promise<Object>} Profile data
 */
export async function enrichProspectProfile(prospectId) {
  return callEnrichmentFunction({
    action: 'enrich_profile',
    prospect_id: prospectId,
  });
}

/**
 * Match business by name or domain
 * @param {Object} params - Search parameters
 * @param {string} [params.company_name] - Company name
 * @param {string} [params.domain] - Company domain
 * @returns {Promise<string|null>} Business ID if found
 */
export async function matchBusiness({ company_name, domain }) {
  const result = await callEnrichmentFunction({
    action: 'match_business',
    company_name,
    domain,
  });
  return result.business_id;
}

/**
 * Enrich business (firmographics, funding, tech stack)
 * @param {string} businessId - Explorium business ID
 * @returns {Promise<Object>} Business data
 */
export async function enrichBusiness(businessId) {
  return callEnrichmentFunction({
    action: 'enrich_business',
    business_id: businessId,
  });
}

/**
 * MAIN FUNCTION: Full enrichment from LinkedIn URL
 * Matches prospect, enriches contact and profile, then enriches company
 *
 * @param {string} linkedinUrl - LinkedIn profile URL
 * @returns {Promise<Object>} Combined enrichment data
 */
export async function fullEnrichFromLinkedIn(linkedinUrl) {
  return callEnrichmentFunction({
    action: 'full_enrich',
    linkedin: linkedinUrl,
  });
}

/**
 * Enrich from email address
 * @param {string} email - Email address
 * @param {string} [companyName] - Optional company name for better matching
 * @returns {Promise<Object>} Combined enrichment data
 */
export async function fullEnrichFromEmail(email, companyName) {
  return callEnrichmentFunction({
    action: 'full_enrich',
    email,
    company_name: companyName,
  });
}

/**
 * Enrich company only by name or domain
 * @param {Object} params - Search parameters
 * @param {string} [params.company_name] - Company name
 * @param {string} [params.domain] - Company domain
 * @returns {Promise<Object>} Company data
 */
export async function enrichCompanyOnly({ company_name, domain }) {
  // First match the business
  const businessId = await matchBusiness({ company_name, domain });
  if (!businessId) {
    throw new Error('Could not find company in Explorium database');
  }

  // Then enrich it
  const bizEnrich = await enrichBusiness(businessId);
  const data = bizEnrich.data?.[0]?.data || {};

  return {
    business_id: businessId,
    name: data.company_name || company_name,
    domain: data.domain || domain,
    linkedin: data.linkedin,
    industry: data.industry,
    size_range: data.size_range,
    employee_count: data.employee_count,
    revenue_range: data.revenue_range,
    founded_year: data.founded_year,
    hq_location: data.hq_location,
    description: data.description,
    tech_stack: data.technologies || [],
    funding_total: data.total_funding,
    latest_funding: data.latest_funding_round,
    enriched_at: new Date().toISOString(),
    enrichment_source: 'explorium',
  };
}
