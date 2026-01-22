/**
 * Explorium.ai integration for company data enrichment
 *
 * This module provides backwards-compatible wrappers around the
 * explorium-api.js library functions. The actual enrichment is handled
 * by the explorium-enrich edge function.
 */

import {
  fullEnrichFromLinkedIn,
  fullEnrichFromEmail,
  enrichCompanyOnly,
  matchBusiness,
  enrichBusiness,
} from '@/lib/explorium-api';

/**
 * Get firmographic data about companies (industry, size, revenue, LinkedIn profile, etc.)
 * @deprecated Use enrichCompanyOnly() from @/lib/explorium-api instead
 */
export async function getFirmographicData({ businesses }) {
  try {
    // Get the first business from the array
    const business = businesses?.[0];
    if (!business) {
      return { data: [], total_results: 0 };
    }

    const result = await enrichCompanyOnly({
      company_name: business.name,
      domain: business.domain,
    });

    return {
      data: [result],
      total_results: 1,
    };
  } catch (error) {
    console.error('Firmographic data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * Get funding and acquisition data
 * @deprecated Use enrichCompanyOnly() from @/lib/explorium-api instead
 */
export async function getFundingAndAcquisitionData({ businesses }) {
  try {
    // Funding data is included in the full company enrichment
    const business = businesses?.[0];
    if (!business) {
      return { data: [], total_results: 0 };
    }

    const result = await enrichCompanyOnly({
      company_name: business.name,
      domain: business.domain,
    });

    return {
      data: [{
        funding_total: result.funding_total,
        latest_funding: result.latest_funding,
      }],
      total_results: 1,
    };
  } catch (error) {
    console.error('Funding data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * Get technographic data (tech stack used by the company)
 * @deprecated Use enrichCompanyOnly() from @/lib/explorium-api instead
 */
export async function getTechnographicsData({ businesses }) {
  try {
    const business = businesses?.[0];
    if (!business) {
      return { data: [], total_results: 0 };
    }

    const result = await enrichCompanyOnly({
      company_name: business.name,
      domain: business.domain,
    });

    return {
      data: [{
        tech_stack: result.tech_stack,
      }],
      total_results: 1,
    };
  } catch (error) {
    console.error('Technographic data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * Search/filter companies by various criteria
 * @deprecated This function is not supported by the current API
 */
export async function getCompanies({ filters, page = 1, page_size = 20 }) {
  console.warn('getCompanies is deprecated and not supported by the current API');
  return { data: [], total_results: 0, error: 'Not supported' };
}

/**
 * Get enriched professional data about individuals
 * @deprecated Use fullEnrichFromLinkedIn or fullEnrichFromEmail from @/lib/explorium-api
 */
export async function getPeopleData({ contacts }) {
  try {
    const contact = contacts?.[0];
    if (!contact) {
      return { data: [], total_results: 0 };
    }

    let result;
    if (contact.linkedin_url) {
      result = await fullEnrichFromLinkedIn(contact.linkedin_url);
    } else if (contact.email) {
      result = await fullEnrichFromEmail(contact.email, contact.company_name);
    } else {
      return { data: [], total_results: 0, error: 'No LinkedIn URL or email provided' };
    }

    return {
      data: [result],
      total_results: 1,
    };
  } catch (error) {
    console.error('People data fetch failed:', error);
    return { data: [], total_results: 0, error: error.message };
  }
}

/**
 * Enrich a CRM contact with company and person data
 * This is a high-level function that combines firmographic and people data
 *
 * @param {Object} params
 * @param {string} [params.companyName] - Company name
 * @param {string} [params.domain] - Company domain
 * @param {string} [params.email] - Contact email
 * @param {string} [params.linkedinUrl] - LinkedIn profile URL
 * @param {string} [params.fullName] - Contact full name
 * @returns {Promise<Object>} Enrichment results
 */
export async function enrichContact({ companyName, domain, email, linkedinUrl, fullName }) {
  const results = {
    company: null,
    person: null,
    enriched: false,
    error: null
  };

  try {
    // Try person enrichment first (LinkedIn or email) since it also returns company data
    if (linkedinUrl) {
      const enriched = await fullEnrichFromLinkedIn(linkedinUrl);
      results.person = enriched;
      results.company = {
        company_name: enriched.company,
        domain: enriched.company_domain,
        industry: enriched.company_industry,
        employee_count_range: enriched.company_size,
        description: enriched.company_description,
        hq_location: enriched.company_hq_location,
        founded_year: enriched.company_founded_year,
        funding_total: enriched.company_funding_total,
        tech_stack: enriched.company_tech_stack,
      };
      results.enriched = true;
    } else if (email) {
      const enriched = await fullEnrichFromEmail(email, companyName);
      results.person = enriched;
      results.company = {
        company_name: enriched.company,
        domain: enriched.company_domain,
        industry: enriched.company_industry,
        employee_count_range: enriched.company_size,
        description: enriched.company_description,
        hq_location: enriched.company_hq_location,
        founded_year: enriched.company_founded_year,
        funding_total: enriched.company_funding_total,
        tech_stack: enriched.company_tech_stack,
      };
      results.enriched = true;
    } else if (companyName || domain) {
      // Fallback to company-only enrichment
      const companyData = await enrichCompanyOnly({
        company_name: companyName,
        domain: domain,
      });
      results.company = companyData;
      results.enriched = true;
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
 *
 * @param {Object} enrichedData - Data from enrichContact()
 * @returns {Object} Mapped fields for CRM contact
 */
export function mapEnrichedDataToContact(enrichedData) {
  const { company, person } = enrichedData;
  const mapped = {};

  // Map company data
  if (company) {
    mapped.company_name = company.company_name || company.name;
    mapped.industry = company.industry;
    mapped.company_size = company.employee_count_range || company.size_range;
    mapped.website = company.website || company.domain;
    mapped.location = company.hq_location || [company.city, company.state, company.country].filter(Boolean).join(', ');
    mapped.linkedin_url = company.linkedin;
    mapped.revenue = company.revenue_range;
    mapped.founded_year = company.founded_year;
    mapped.description = company.description;
  }

  // Map person data
  if (person) {
    const fullName = person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim();
    mapped.contact_name = fullName || mapped.contact_name;
    mapped.contact_title = person.job_title || person.title;
    mapped.contact_email = person.email;
    mapped.contact_phone = person.phone || person.mobile_phone;
    mapped.linkedin_url = person.linkedin_url || mapped.linkedin_url;
    mapped.location = mapped.location || [person.location_city, person.location_country].filter(Boolean).join(', ');
  }

  return mapped;
}

// Default export for backwards compatibility
export default function ExploriumAPI() {
  return null;
}
