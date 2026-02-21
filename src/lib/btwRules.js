// ─── Dutch BTW (VAT) Rules ──────────────────────────────────────────────────
// Country lists, rubric labels, and tax rule determination functions
// Based on Dutch Belastingdienst BTW-aangifte rubrics

export const EU_COUNTRIES = [
  { code: "AT", name: "Austria", nameNL: "Oostenrijk" },
  { code: "BE", name: "Belgium", nameNL: "België" },
  { code: "BG", name: "Bulgaria", nameNL: "Bulgarije" },
  { code: "HR", name: "Croatia", nameNL: "Kroatië" },
  { code: "CY", name: "Cyprus", nameNL: "Cyprus" },
  { code: "CZ", name: "Czech Republic", nameNL: "Tsjechië" },
  { code: "DK", name: "Denmark", nameNL: "Denemarken" },
  { code: "EE", name: "Estonia", nameNL: "Estland" },
  { code: "FI", name: "Finland", nameNL: "Finland" },
  { code: "FR", name: "France", nameNL: "Frankrijk" },
  { code: "DE", name: "Germany", nameNL: "Duitsland" },
  { code: "GR", name: "Greece", nameNL: "Griekenland" },
  { code: "HU", name: "Hungary", nameNL: "Hongarije" },
  { code: "IE", name: "Ireland", nameNL: "Ierland" },
  { code: "IT", name: "Italy", nameNL: "Italië" },
  { code: "LV", name: "Latvia", nameNL: "Letland" },
  { code: "LT", name: "Lithuania", nameNL: "Litouwen" },
  { code: "LU", name: "Luxembourg", nameNL: "Luxemburg" },
  { code: "MT", name: "Malta", nameNL: "Malta" },
  { code: "NL", name: "Netherlands", nameNL: "Nederland" },
  { code: "PL", name: "Poland", nameNL: "Polen" },
  { code: "PT", name: "Portugal", nameNL: "Portugal" },
  { code: "RO", name: "Romania", nameNL: "Roemenië" },
  { code: "SK", name: "Slovakia", nameNL: "Slowakije" },
  { code: "SI", name: "Slovenia", nameNL: "Slovenië" },
  { code: "ES", name: "Spain", nameNL: "Spanje" },
  { code: "SE", name: "Sweden", nameNL: "Zweden" },
];

export const COMMON_NON_EU = [
  { code: "US", name: "United States", nameNL: "Verenigde Staten" },
  { code: "GB", name: "United Kingdom", nameNL: "Verenigd Koninkrijk" },
  { code: "CH", name: "Switzerland", nameNL: "Zwitserland" },
  { code: "NO", name: "Norway", nameNL: "Noorwegen" },
  { code: "CA", name: "Canada", nameNL: "Canada" },
  { code: "AU", name: "Australia", nameNL: "Australië" },
  { code: "JP", name: "Japan", nameNL: "Japan" },
  { code: "CN", name: "China", nameNL: "China" },
  { code: "IN", name: "India", nameNL: "India" },
  { code: "BR", name: "Brazil", nameNL: "Brazilië" },
  { code: "IL", name: "Israel", nameNL: "Israël" },
  { code: "SG", name: "Singapore", nameNL: "Singapore" },
  { code: "KR", name: "South Korea", nameNL: "Zuid-Korea" },
  { code: "TR", name: "Turkey", nameNL: "Turkije" },
  { code: "AE", name: "United Arab Emirates", nameNL: "Verenigde Arabische Emiraten" },
];

export const ALL_COUNTRIES = [...EU_COUNTRIES, ...COMMON_NON_EU];

const EU_CODES = new Set(EU_COUNTRIES.map((c) => c.code));

export const BTW_RUBRIC_LABELS = {
  // Sales (outgoing)
  "1a": { label: "Leveringen/diensten belast met hoog tarief", rate: "21%", type: "sales" },
  "1b": { label: "Leveringen/diensten belast met laag tarief", rate: "9%", type: "sales" },
  "1c": { label: "Leveringen/diensten belast met overige tarieven", rate: "overig", type: "sales" },
  "1d": { label: "Privégebruik", rate: "", type: "sales" },
  "1e": { label: "Leveringen/diensten belast met 0% of niet belast", rate: "0%", type: "sales" },
  // Domestic reverse charge
  "2a": { label: "Verleggingsregelingen binnenland", rate: "", type: "purchase" },
  // Foreign sales
  "3a": { label: "Leveringen naar landen buiten de EU (uitvoer)", rate: "", type: "sales" },
  "3b": { label: "Leveringen naar/diensten in landen binnen de EU", rate: "", type: "sales" },
  "3c": { label: "Installatie/afstandsverkopen binnen de EU", rate: "", type: "sales" },
  // Foreign purchases
  "4a": { label: "Verwerving uit landen buiten de EU", rate: "21%", type: "purchase" },
  "4b": { label: "Verwerving uit landen binnen de EU", rate: "21%", type: "purchase" },
  // Totals
  "5a": { label: "Verschuldigde omzetbelasting (subtotaal)", rate: "", type: "total" },
  "5b": { label: "Voorbelasting", rate: "", type: "total" },
  "5c": { label: "Subtotaal (5a min 5b)", rate: "", type: "total" },
  "5d": { label: "Vermindering volgens de kleineondernemersregeling", rate: "", type: "total" },
};

/**
 * Determine tax rules for a PURCHASE (expense/bill) based on supplier country.
 * @param {string} countryCode - ISO 2-letter country code
 * @returns {{ mechanism: string, selfAssessRate: number, rubric: string|null, explanation: string }}
 */
export function determineTaxRulesForPurchase(countryCode) {
  const code = (countryCode || "").toUpperCase();

  // NL domestic
  if (code === "NL") {
    return {
      mechanism: "standard_btw",
      selfAssessRate: 0,
      rubric: null,
      explanation: "Binnenlandse aankoop — standaard BTW op factuur",
    };
  }

  // EU non-NL
  if (EU_CODES.has(code) && code !== "NL") {
    return {
      mechanism: "reverse_charge_eu",
      selfAssessRate: 21,
      rubric: "4b",
      explanation: `EU aankoop (${code}) — verlegde BTW 21%, rubriek 4b`,
    };
  }

  // Non-EU (or unknown but not NL/EU)
  if (code && code !== "UNKNOWN") {
    return {
      mechanism: "reverse_charge_non_eu",
      selfAssessRate: 21,
      rubric: "4a",
      explanation: `Aankoop buiten EU (${code}) — verlegde BTW 21%, rubriek 4a`,
    };
  }

  // Unknown
  return {
    mechanism: "standard_btw",
    selfAssessRate: 0,
    rubric: null,
    explanation: "Land onbekend — standaard BTW",
  };
}

/**
 * Determine tax rules for a SALE (invoice) based on client country.
 * @param {string} countryCode - ISO 2-letter country code
 * @param {number} taxRate - Tax rate on the invoice (21, 9, 0)
 * @returns {{ mechanism: string, rubric: string, explanation: string }}
 */
export function determineTaxRulesForSale(countryCode, taxRate = 21) {
  const code = (countryCode || "NL").toUpperCase();

  // NL domestic
  if (code === "NL") {
    let rubric = "1a";
    if (taxRate === 9) rubric = "1b";
    else if (taxRate === 0) rubric = "1e";
    else if (taxRate !== 21 && taxRate > 0) rubric = "1c";

    return {
      mechanism: "standard_btw",
      rubric,
      explanation: `Binnenlandse verkoop — ${taxRate}% BTW, rubriek ${rubric}`,
    };
  }

  // EU non-NL → intracommunity supply
  if (EU_CODES.has(code)) {
    return {
      mechanism: "intracommunity",
      rubric: "3b",
      explanation: `Levering binnen EU (${code}) — 0% verlegd, rubriek 3b`,
    };
  }

  // Non-EU → export
  return {
    mechanism: "export",
    rubric: "3a",
    explanation: `Export buiten EU (${code}) — 0%, rubriek 3a`,
  };
}

/**
 * Get the rubric badge color for display
 */
export function getRubricColor(rubric) {
  if (!rubric) return null;
  const prefix = rubric.charAt(0);
  switch (prefix) {
    case "1": return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" };
    case "2": return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" };
    case "3": return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" };
    case "4": return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" };
    case "5": return { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" };
    default: return { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" };
  }
}
