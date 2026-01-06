/**
 * Explorium.ai integration for company data enrichment
 * 
 * IMPORTANT: Backend functions must be created via Dashboard → Settings → Backend Functions
 * 
 * Create the following 5 functions:
 * 
 * 1. explorium/firmographics (POST)
 * 2. explorium/funding (POST)
 * 3. explorium/technographics (POST)
 * 4. explorium/companies (POST)
 * 5. explorium/people (POST)
 * 
 * Each function needs the EXPLORIUM_API_KEY environment variable set in Dashboard → Settings.
 * 
 * Full Deno code for each function is provided below in comments.
 */

import { base44 } from "@/api/base44Client";

/**
 * BACKEND FUNCTION CODE FOR: explorium/firmographics
 * 
 * Deno.serve(async (req) => {
 *     try {
 *         const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
 *         if (!API_KEY) {
 *             return new Response(JSON.stringify({ error: "API key not configured" }), { 
 *                 status: 500,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const requestBody = await req.json();
 * 
 *         const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
 *             method: "POST",
 *             headers: {
 *                 "API_KEY": API_KEY,
 *                 "Content-Type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "businesses_to_match": requestBody.businesses || []
 *             })
 *         });
 * 
 *         if (!matchResponse.ok) {
 *             const errorText = await matchResponse.text();
 *             return new Response(JSON.stringify({ error: `Match failed: ${errorText}` }), {
 *                 status: matchResponse.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const matchRes = await matchResponse.json();
 *         const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id) || [];
 * 
 *         if (businessesIds.length === 0) {
 *             return new Response(JSON.stringify({ data: [], total_results: 0 }), {
 *                 headers: { 'Content-Type': 'application/json' },
 *                 status: 200
 *             });
 *         }
 * 
 *         const response = await fetch("https://api.explorium.ai/v1/businesses/firmographics/bulk_enrich", {
 *             method: "POST",
 *             headers: {
 *                 "api_key": API_KEY,
 *                 "accept": "application/json",
 *                 "content-type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "business_ids": businessesIds
 *             })
 *         });
 * 
 *         if (!response.ok) {
 *             const errorText = await response.text();
 *             return new Response(JSON.stringify({ error: `Enrich failed: ${errorText}` }), {
 *                 status: response.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const data = await response.json();
 * 
 *         return new Response(JSON.stringify(data), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 200
 *         });
 *     } catch (error) {
 *         return new Response(JSON.stringify({ error: error.message }), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 500
 *         });
 *     }
 * });
 */

/**
 * Get firmographic data about companies (industry, size, revenue, LinkedIn profile, etc.)
 */
export async function getFirmographicData({ businesses }) {
  try {
    const response = await base44.functions.invoke('exploriumFirmographics', { businesses });
    return response.data;
  } catch (error) {
    console.error('Firmographic data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * BACKEND FUNCTION CODE FOR: explorium/funding
 * 
 * Deno.serve(async (req) => {
 *     try {
 *         const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
 *         if (!API_KEY) {
 *             return new Response(JSON.stringify({ error: "API key not configured" }), { 
 *                 status: 500,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const requestBody = await req.json();
 * 
 *         const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
 *             method: "POST",
 *             headers: {
 *                 "API_KEY": API_KEY,
 *                 "Content-Type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "businesses_to_match": requestBody.businesses || []
 *             })
 *         });
 * 
 *         if (!matchResponse.ok) {
 *             const errorText = await matchResponse.text();
 *             return new Response(JSON.stringify({ error: `Match failed: ${errorText}` }), {
 *                 status: matchResponse.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const matchRes = await matchResponse.json();
 *         const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id) || [];
 * 
 *         if (businessesIds.length === 0) {
 *             return new Response(JSON.stringify({ data: [], total_results: 0 }), {
 *                 headers: { 'Content-Type': 'application/json' },
 *                 status: 200
 *             });
 *         }
 * 
 *         const response = await fetch("https://api.explorium.ai/v1/businesses/funding_and_acquisition/bulk_enrich", {
 *             method: "POST",
 *             headers: {
 *                 "api_key": API_KEY,
 *                 "accept": "application/json",
 *                 "content-type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "business_ids": businessesIds
 *             })
 *         });
 * 
 *         if (!response.ok) {
 *             const errorText = await response.text();
 *             return new Response(JSON.stringify({ error: `Enrich failed: ${errorText}` }), {
 *                 status: response.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const data = await response.json();
 * 
 *         return new Response(JSON.stringify(data), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 200
 *         });
 *     } catch (error) {
 *         return new Response(JSON.stringify({ error: error.message }), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 500
 *         });
 *     }
 * });
 */

/**
 * Get funding and acquisition data
 */
export async function getFundingAndAcquisitionData({ businesses }) {
  try {
    const response = await base44.functions.invoke('exploriumFunding', { businesses });
    return response.data;
  } catch (error) {
    console.error('Funding data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * BACKEND FUNCTION CODE FOR: explorium/technographics
 * 
 * Deno.serve(async (req) => {
 *     try {
 *         const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
 *         if (!API_KEY) {
 *             return new Response(JSON.stringify({ error: "API key not configured" }), { 
 *                 status: 500,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const requestBody = await req.json();
 * 
 *         const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
 *             method: "POST",
 *             headers: {
 *                 "API_KEY": API_KEY,
 *                 "Content-Type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "businesses_to_match": requestBody.businesses || []
 *             })
 *         });
 * 
 *         if (!matchResponse.ok) {
 *             const errorText = await matchResponse.text();
 *             return new Response(JSON.stringify({ error: `Match failed: ${errorText}` }), {
 *                 status: matchResponse.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const matchRes = await matchResponse.json();
 *         const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id) || [];
 * 
 *         if (businessesIds.length === 0) {
 *             return new Response(JSON.stringify({ data: [], total_results: 0 }), {
 *                 headers: { 'Content-Type': 'application/json' },
 *                 status: 200
 *             });
 *         }
 * 
 *         const response = await fetch("https://api.explorium.ai/v1/businesses/technographics/bulk_enrich", {
 *             method: "POST",
 *             headers: {
 *                 "api_key": API_KEY,
 *                 "accept": "application/json",
 *                 "content-type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "business_ids": businessesIds
 *             })
 *         });
 * 
 *         if (!response.ok) {
 *             const errorText = await response.text();
 *             return new Response(JSON.stringify({ error: `Enrich failed: ${errorText}` }), {
 *                 status: response.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const data = await response.json();
 * 
 *         return new Response(JSON.stringify(data), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 200
 *         });
 *     } catch (error) {
 *         return new Response(JSON.stringify({ error: error.message }), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 500
 *         });
 *     }
 * });
 */

/**
 * Get technographic data (tech stack used by the company)
 */
export async function getTechnographicsData({ businesses }) {
  try {
    const response = await base44.functions.invoke('exploriumTechnographics', { businesses });
    return response.data;
  } catch (error) {
    console.error('Technographic data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * BACKEND FUNCTION CODE FOR: explorium/companies
 * 
 * Deno.serve(async (req) => {
 *     try {
 *         const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
 *         if (!API_KEY) {
 *             return new Response(JSON.stringify({ error: "API key not configured" }), { 
 *                 status: 500,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const requestBody = await req.json();
 *         const { filters = {}, page = 1, page_size = 20 } = requestBody;
 * 
 *         const queryParams = new URLSearchParams({
 *             page: page.toString(),
 *             page_size: page_size.toString()
 *         });
 * 
 *         if (filters.industry) queryParams.append('industry', filters.industry);
 *         if (filters.country) queryParams.append('country', filters.country);
 *         if (filters.min_employees) queryParams.append('min_employees', filters.min_employees);
 *         if (filters.max_employees) queryParams.append('max_employees', filters.max_employees);
 *         if (filters.technologies) queryParams.append('technologies', filters.technologies);
 * 
 *         const response = await fetch(`https://api.explorium.ai/v1/businesses/search?${queryParams.toString()}`, {
 *             method: "GET",
 *             headers: {
 *                 "api_key": API_KEY,
 *                 "accept": "application/json"
 *             }
 *         });
 * 
 *         if (!response.ok) {
 *             const errorText = await response.text();
 *             return new Response(JSON.stringify({ error: `Search failed: ${errorText}` }), {
 *                 status: response.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const data = await response.json();
 * 
 *         return new Response(JSON.stringify(data), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 200
 *         });
 *     } catch (error) {
 *         return new Response(JSON.stringify({ error: error.message }), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 500
 *         });
 *     }
 * });
 */

/**
 * Search/filter companies by various criteria
 */
export async function getCompanies({ filters, page = 1, page_size = 20 }) {
  try {
    const response = await base44.functions.invoke('exploriumCompanies', { filters, page, page_size });
    return response.data;
  } catch (error) {
    console.error('Companies fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * BACKEND FUNCTION CODE FOR: explorium/people
 * 
 * Deno.serve(async (req) => {
 *     try {
 *         const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
 *         if (!API_KEY) {
 *             return new Response(JSON.stringify({ error: "API key not configured" }), { 
 *                 status: 500,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const requestBody = await req.json();
 * 
 *         // Match people to get contact IDs
 *         const matchResponse = await fetch("https://api.explorium.ai/v1/contacts/match", {
 *             method: "POST",
 *             headers: {
 *                 "API_KEY": API_KEY,
 *                 "Content-Type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "contacts_to_match": requestBody.contacts || []
 *             })
 *         });
 * 
 *         if (!matchResponse.ok) {
 *             const errorText = await matchResponse.text();
 *             return new Response(JSON.stringify({ error: `Match failed: ${errorText}` }), {
 *                 status: matchResponse.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const matchRes = await matchResponse.json();
 *         const contactIds = matchRes.matched_contacts?.map((x) => x.contact_id) || [];
 * 
 *         if (contactIds.length === 0) {
 *             return new Response(JSON.stringify({ data: [], total_results: 0 }), {
 *                 headers: { 'Content-Type': 'application/json' },
 *                 status: 200
 *             });
 *         }
 * 
 *         // Enrich with people data
 *         const response = await fetch("https://api.explorium.ai/v1/contacts/enrich", {
 *             method: "POST",
 *             headers: {
 *                 "api_key": API_KEY,
 *                 "accept": "application/json",
 *                 "content-type": "application/json"
 *             },
 *             body: JSON.stringify({
 *                 "contact_ids": contactIds
 *             })
 *         });
 * 
 *         if (!response.ok) {
 *             const errorText = await response.text();
 *             return new Response(JSON.stringify({ error: `Enrich failed: ${errorText}` }), {
 *                 status: response.status,
 *                 headers: { 'Content-Type': 'application/json' }
 *             });
 *         }
 * 
 *         const data = await response.json();
 * 
 *         return new Response(JSON.stringify(data), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 200
 *         });
 *     } catch (error) {
 *         return new Response(JSON.stringify({ error: error.message }), {
 *             headers: { 'Content-Type': 'application/json' },
 *             status: 500
 *         });
 *     }
 * });
 */

/**
 * Get enriched professional data about individuals from LinkedIn
 */
export async function getPeopleData({ contacts }) {
  try {
    const response = await base44.functions.invoke('exploriumPeople', { contacts });
    return response.data;
  } catch (error) {
    console.error('People data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * Enrich a CRM contact with company and person data
 * This is a high-level function that combines firmographic and people data
 */
export async function enrichContact({ companyName, domain, email, linkedinUrl, fullName }) {
  const results = {
    company: null,
    person: null,
    enriched: false,
    error: null
  };

  try {
    // Enrich company data if we have company name or domain
    if (companyName || domain) {
      const businesses = [{
        name: companyName || null,
        domain: domain || null
      }];

      const firmographicData = await getFirmographicData({ businesses });
      if (firmographicData?.data?.length > 0) {
        results.company = firmographicData.data[0];
        results.enriched = true;
      }
    }

    // Enrich person data if we have email or LinkedIn
    if (email || linkedinUrl || fullName) {
      const contacts = [{
        email: email || null,
        linkedin_url: linkedinUrl || null,
        full_name: fullName || null,
        company_name: companyName || null
      }];

      const peopleData = await getPeopleData({ contacts });
      if (peopleData?.data?.length > 0) {
        results.person = peopleData.data[0];
        results.enriched = true;
      }
    }

    return results;
  } catch (error) {
    console.error('Contact enrichment failed:', error);
    return {
      ...results,
      error: error.message
    };
  }
}

/**
 * Convert enriched data to CRM contact format
 * Maps Explorium data fields to your Prospect/Contact entity fields
 */
export function mapEnrichedDataToContact(enrichedData) {
  const { company, person } = enrichedData;

  const mapped = {};

  // Map company data
  if (company) {
    mapped.company_name = company.company_name || company.name;
    mapped.industry = company.industry;
    mapped.company_size = company.employee_count_range || company.employees?.toString();
    mapped.website = company.website || company.domain;
    mapped.location = [company.city, company.state, company.country].filter(Boolean).join(', ');
    mapped.linkedin_url = company.linkedin_url;
    mapped.revenue = company.estimated_revenue;
    mapped.founded_year = company.founded_year;
    mapped.description = company.description;
    mapped.hq_city = company.city;
    mapped.hq_country = company.country;
  }

  // Map person data
  if (person) {
    mapped.contact_name = person.full_name || mapped.contact_name;
    mapped.contact_title = person.title || person.job_title;
    mapped.contact_email = person.email || mapped.contact_email;
    mapped.contact_phone = person.phone;
    mapped.linkedin_url = person.linkedin_url || mapped.linkedin_url;
  }

  return mapped;
}

export default function ExploriumAPI() {
  return null;
}