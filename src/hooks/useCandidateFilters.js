import { useMemo } from "react";

/**
 * Filter candidates based on search query and filter criteria
 */
export function useCandidateFilters(candidates, searchQuery, filters) {
  return useMemo(() => {
    if (!candidates || candidates.length === 0) return [];

    let result = [...candidates];

    // Text search across multiple fields
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const searchableText = [
          c.first_name,
          c.last_name,
          `${c.first_name} ${c.last_name}`,
          c.full_name,
          c.job_title,
          c.current_title,
          c.company_name,
          c.current_company,
          c.person_home_location,
          c.location,
          c.email,
          ...(c.skills || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Location filter
    if (filters.locations?.length > 0) {
      result = result.filter((c) => {
        const location = (c.person_home_location || c.location || "").toLowerCase();
        return filters.locations.some((loc) =>
          location.includes(loc.toLowerCase())
        );
      });
    }

    // Title filter
    if (filters.titles?.length > 0) {
      result = result.filter((c) => {
        const title = (c.job_title || c.current_title || "").toLowerCase();
        return filters.titles.some((t) =>
          title.includes(t.toLowerCase())
        );
      });
    }

    // Company filter
    if (filters.companies?.length > 0) {
      result = result.filter((c) => {
        const company = c.company_name || c.current_company || "";
        return filters.companies.includes(company);
      });
    }

    // Skills filter
    if (filters.skills?.length > 0) {
      result = result.filter((c) => {
        const candidateSkills = (c.skills || []).map((s) => s.toLowerCase());
        return filters.skills.some((skill) =>
          candidateSkills.some((cs) => cs.includes(skill.toLowerCase()))
        );
      });
    }

    // Intel score range
    if (filters.intelScoreMin != null) {
      result = result.filter(
        (c) => (c.intelligence_score ?? 0) >= filters.intelScoreMin
      );
    }
    if (filters.intelScoreMax != null) {
      result = result.filter(
        (c) => (c.intelligence_score ?? 100) <= filters.intelScoreMax
      );
    }

    // Experience years range
    if (filters.experienceYearsMin != null) {
      result = result.filter(
        (c) => (c.years_experience ?? 0) >= filters.experienceYearsMin
      );
    }
    if (filters.experienceYearsMax != null) {
      result = result.filter(
        (c) => (c.years_experience ?? 0) <= filters.experienceYearsMax
      );
    }

    // Has email
    if (filters.hasEmail === true) {
      result = result.filter((c) => c.email && c.email.trim() !== "");
    }

    // Has LinkedIn
    if (filters.hasLinkedIn === true) {
      result = result.filter(
        (c) => c.linkedin_profile && c.linkedin_profile.trim() !== ""
      );
    }

    // Intelligence level filter
    if (filters.intelligenceLevels?.length > 0) {
      result = result.filter((c) =>
        filters.intelligenceLevels.includes(c.intelligence_level)
      );
    }

    // Approach filter
    if (filters.approaches?.length > 0) {
      result = result.filter((c) =>
        filters.approaches.includes(c.recommended_approach)
      );
    }

    // Last updated filter (days)
    if (filters.lastUpdatedDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.lastUpdatedDays);
      result = result.filter((c) => {
        const updatedAt = c.last_intelligence_update || c.updated_at || c.created_date;
        return updatedAt && new Date(updatedAt) >= cutoff;
      });
    }

    // Has intel data
    if (filters.hasIntel === true) {
      result = result.filter(
        (c) => c.intelligence_score != null && c.last_intelligence_update
      );
    }

    return result;
  }, [candidates, searchQuery, filters]);
}

/**
 * Extract unique values for filter options from candidates
 */
export function extractFilterOptions(candidates) {
  if (!candidates || candidates.length === 0) {
    return {
      locations: [],
      companies: [],
      titles: [],
      skills: [],
      intelligenceLevels: [],
      approaches: [],
    };
  }

  const locationsSet = new Set();
  const companiesSet = new Set();
  const titlesSet = new Set();
  const skillsSet = new Set();
  const intelligenceLevelsSet = new Set();
  const approachesSet = new Set();

  candidates.forEach((c) => {
    // Extract location - use city/region if available
    const location = c.person_home_location || c.location;
    if (location) {
      // Try to extract city/state from full location
      const parts = location.split(",").map((p) => p.trim());
      if (parts[0]) locationsSet.add(parts[0]);
    }

    // Company
    const company = c.company_name || c.current_company;
    if (company) companiesSet.add(company);

    // Title - normalize common titles
    const title = c.job_title || c.current_title;
    if (title) {
      // Extract base title (e.g., "Senior Software Engineer" -> "Software Engineer")
      titlesSet.add(title);
    }

    // Skills
    if (c.skills && Array.isArray(c.skills)) {
      c.skills.forEach((s) => skillsSet.add(s));
    }

    // Intelligence level
    if (c.intelligence_level) {
      intelligenceLevelsSet.add(c.intelligence_level);
    }

    // Approach
    if (c.recommended_approach) {
      approachesSet.add(c.recommended_approach);
    }
  });

  return {
    locations: [...locationsSet].sort(),
    companies: [...companiesSet].sort(),
    titles: [...titlesSet].sort(),
    skills: [...skillsSet].sort(),
    intelligenceLevels: ["Critical", "High", "Medium", "Low"].filter((l) =>
      intelligenceLevelsSet.has(l)
    ),
    approaches: ["aggressive", "nurture", "network", "direct", "warm_intro", "referral"].filter(
      (a) => approachesSet.has(a)
    ),
  };
}

/**
 * Count the number of active filters
 */
export function countActiveFilters(filters) {
  if (!filters) return 0;

  let count = 0;

  if (filters.locations?.length > 0) count++;
  if (filters.titles?.length > 0) count++;
  if (filters.companies?.length > 0) count++;
  if (filters.skills?.length > 0) count++;
  if (filters.intelligenceLevels?.length > 0) count++;
  if (filters.approaches?.length > 0) count++;
  if (filters.intelScoreMin != null || filters.intelScoreMax != null) count++;
  if (filters.experienceYearsMin != null || filters.experienceYearsMax != null) count++;
  if (filters.hasEmail === true) count++;
  if (filters.hasLinkedIn === true) count++;
  if (filters.hasIntel === true) count++;
  if (filters.lastUpdatedDays) count++;

  return count;
}

/**
 * Get default empty filters object
 */
export function getDefaultFilters() {
  return {
    locations: [],
    skills: [],
    titles: [],
    companies: [],
    intelligenceLevels: [],
    approaches: [],
    intelScoreMin: null,
    intelScoreMax: null,
    experienceYearsMin: null,
    experienceYearsMax: null,
    hasEmail: null,
    hasLinkedIn: null,
    hasIntel: null,
    lastUpdatedDays: null,
  };
}
