/**
 * ISS-012: Cross-check DB tenure against work history dates.
 * If the DB value differs from calculated by >5 years, trust the calculated value.
 */
export function getCrossCheckedTenure(candidate) {
  const dbYears = candidate?.years_at_company != null ? Math.round(candidate.years_at_company) : null;

  let calculatedYears = null;
  const history = candidate?.work_history || candidate?.experience;
  if (Array.isArray(history) && history.length > 0) {
    const currentJob = history.find(exp => exp.is_primary || !exp.end_date || exp.end_date === 'Present');
    const startDate = currentJob?.start_date;
    if (startDate) {
      const startYear = parseInt(String(startDate).match(/\d{4}/)?.[0]);
      if (startYear) calculatedYears = new Date().getFullYear() - startYear;
    }
  }

  if (dbYears !== null && calculatedYears !== null && Math.abs(dbYears - calculatedYears) > 5) {
    return calculatedYears;
  }
  return dbYears ?? calculatedYears;
}
