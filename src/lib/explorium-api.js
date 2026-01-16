/**
 * Explorium API Integration for Contact & Company Enrichment
 *
 * This service provides direct API calls to Explorium for:
 * - Prospect matching (LinkedIn, email, name+company)
 * - Contact enrichment (emails, phones)
 * - Profile enrichment (skills, experience, education)
 * - Business matching and enrichment (firmographics, funding, tech stack)
 */

const EXPLORIUM_API_BASE = 'https://api.explorium.ai/v1';

const getHeaders = () => ({
  'API_KEY': import.meta.env.VITE_EXPLORIUM_API_KEY,
  'Content-Type': 'application/json'
});

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
  const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/match`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      prospects_to_match: [{
        ...(linkedin && { linkedin }),
        ...(email && { email }),
        ...(full_name && { full_name }),
        ...(company_name && { company_name })
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Prospect match failed: ${error}`);
  }

  const data = await response.json();
  return data.matched_prospects?.[0]?.prospect_id || null;
}

/**
 * Enrich prospect contact info (emails, phones)
 * @param {string} prospectId - Explorium prospect ID
 * @returns {Promise<Object>} Contact data
 */
export async function enrichProspectContact(prospectId) {
  const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/contacts_information/enrich`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prospect_id: prospectId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Contact enrichment failed: ${error}`);
  }

  return response.json();
}

/**
 * Enrich prospect profile (experience, skills, education)
 * @param {string} prospectId - Explorium prospect ID
 * @returns {Promise<Object>} Profile data
 */
export async function enrichProspectProfile(prospectId) {
  const response = await fetch(`${EXPLORIUM_API_BASE}/prospects/enrich`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prospect_id: prospectId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Profile enrichment failed: ${error}`);
  }

  return response.json();
}

/**
 * Match business by name or domain
 * @param {Object} params - Search parameters
 * @param {string} [params.company_name] - Company name
 * @param {string} [params.domain] - Company domain
 * @returns {Promise<string|null>} Business ID if found
 */
export async function matchBusiness({ company_name, domain }) {
  const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/match`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      businesses_to_match: [{
        ...(company_name && { company_name }),
        ...(domain && { domain })
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Business match failed: ${error}`);
  }

  const data = await response.json();
  return data.matched_businesses?.[0]?.business_id || null;
}

/**
 * Enrich business (firmographics, funding, tech stack)
 * @param {string} businessId - Explorium business ID
 * @returns {Promise<Object>} Business data
 */
export async function enrichBusiness(businessId) {
  const response = await fetch(`${EXPLORIUM_API_BASE}/businesses/enrich`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ business_id: businessId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Business enrichment failed: ${error}`);
  }

  return response.json();
}

/**
 * MAIN FUNCTION: Full enrichment from LinkedIn URL
 * Matches prospect, enriches contact and profile, then enriches company
 *
 * @param {string} linkedinUrl - LinkedIn profile URL
 * @returns {Promise<Object>} Combined enrichment data
 */
export async function fullEnrichFromLinkedIn(linkedinUrl) {
  // Step 1: Match prospect by LinkedIn
  const prospectId = await matchProspect({ linkedin: linkedinUrl });
  if (!prospectId) {
    throw new Error('Could not find prospect in Explorium database');
  }

  // Step 2 & 3: Get contact and profile info in parallel
  const [contactData, profileData] = await Promise.all([
    enrichProspectContact(prospectId),
    enrichProspectProfile(prospectId)
  ]);

  const contact = contactData.data?.[0]?.data || {};
  const profile = profileData.data?.[0]?.data || {};

  // Step 4: Match and enrich company
  let companyData = {};
  if (profile.company_name || profile.company_website) {
    try {
      const businessId = await matchBusiness({
        company_name: profile.company_name,
        domain: profile.company_website
      });
      if (businessId) {
        const bizEnrich = await enrichBusiness(businessId);
        companyData = bizEnrich.data?.[0]?.data || {};
        companyData.business_id = businessId;
      }
    } catch (e) {
      console.warn('Business enrichment failed:', e.message);
      // Continue without company data
    }
  }

  // Step 5: Return combined data in normalized format
  const nameParts = (profile.full_name || '').split(' ');

  return {
    // Contact
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    email: contact.professional_email || contact.work_email,
    personal_email: contact.personal_email,
    phone: contact.work_phone || contact.office_phone,
    mobile_phone: contact.mobile_phone,
    linkedin_url: linkedinUrl,

    // Professional
    job_title: profile.job_title || profile.current_title,
    job_department: profile.job_department,
    job_seniority_level: profile.job_seniority_level,
    skills: profile.skills || [],
    interests: profile.interests || [],
    education: profile.education || [],
    work_history: profile.experience || [],
    age_group: profile.age_group,

    // Location
    location_city: profile.city,
    location_region: profile.region_name,
    location_country: profile.country_name,

    // Company
    company: profile.company_name,
    company_domain: companyData.domain || profile.company_website,
    company_linkedin: companyData.linkedin || profile.company_linkedin,
    company_industry: companyData.industry,
    company_size: companyData.size_range,
    company_employee_count: companyData.employee_count,
    company_revenue: companyData.revenue_range,
    company_founded_year: companyData.founded_year,
    company_hq_location: companyData.hq_location,
    company_description: companyData.description,
    company_tech_stack: companyData.technologies || [],
    company_funding_total: companyData.total_funding,
    company_latest_funding: companyData.latest_funding_round,

    // Metadata
    enriched_at: new Date().toISOString(),
    enrichment_source: 'explorium',
    explorium_prospect_id: prospectId,
    explorium_business_id: companyData.business_id
  };
}

/**
 * Enrich from email address
 * @param {string} email - Email address
 * @param {string} [companyName] - Optional company name for better matching
 * @returns {Promise<Object>} Combined enrichment data
 */
export async function fullEnrichFromEmail(email, companyName) {
  // Step 1: Match prospect by email
  const prospectId = await matchProspect({ email, company_name: companyName });
  if (!prospectId) {
    throw new Error('Could not find prospect with this email');
  }

  // Reuse the enrichment flow
  const [contactData, profileData] = await Promise.all([
    enrichProspectContact(prospectId),
    enrichProspectProfile(prospectId)
  ]);

  const contact = contactData.data?.[0]?.data || {};
  const profile = profileData.data?.[0]?.data || {};

  // Enrich company
  let companyData = {};
  if (profile.company_name || profile.company_website) {
    try {
      const businessId = await matchBusiness({
        company_name: profile.company_name,
        domain: profile.company_website
      });
      if (businessId) {
        const bizEnrich = await enrichBusiness(businessId);
        companyData = bizEnrich.data?.[0]?.data || {};
        companyData.business_id = businessId;
      }
    } catch (e) {
      console.warn('Business enrichment failed:', e.message);
    }
  }

  const nameParts = (profile.full_name || '').split(' ');

  return {
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    email: email,
    personal_email: contact.personal_email,
    phone: contact.work_phone || contact.office_phone,
    mobile_phone: contact.mobile_phone,
    linkedin_url: profile.linkedin,
    job_title: profile.job_title || profile.current_title,
    job_department: profile.job_department,
    job_seniority_level: profile.job_seniority_level,
    skills: profile.skills || [],
    interests: profile.interests || [],
    education: profile.education || [],
    work_history: profile.experience || [],
    age_group: profile.age_group,
    location_city: profile.city,
    location_region: profile.region_name,
    location_country: profile.country_name,
    company: profile.company_name,
    company_domain: companyData.domain || profile.company_website,
    company_linkedin: companyData.linkedin || profile.company_linkedin,
    company_industry: companyData.industry,
    company_size: companyData.size_range,
    company_employee_count: companyData.employee_count,
    company_revenue: companyData.revenue_range,
    company_founded_year: companyData.founded_year,
    company_hq_location: companyData.hq_location,
    company_description: companyData.description,
    company_tech_stack: companyData.technologies || [],
    company_funding_total: companyData.total_funding,
    company_latest_funding: companyData.latest_funding_round,
    enriched_at: new Date().toISOString(),
    enrichment_source: 'explorium',
    explorium_prospect_id: prospectId,
    explorium_business_id: companyData.business_id
  };
}

/**
 * Enrich company only by name or domain
 * @param {Object} params - Search parameters
 * @param {string} [params.company_name] - Company name
 * @param {string} [params.domain] - Company domain
 * @returns {Promise<Object>} Company data
 */
export async function enrichCompanyOnly({ company_name, domain }) {
  const businessId = await matchBusiness({ company_name, domain });
  if (!businessId) {
    throw new Error('Could not find company in Explorium database');
  }

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
    enrichment_source: 'explorium'
  };
}
