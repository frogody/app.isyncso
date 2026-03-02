// EU VAT Standard Rates (2026)
// Source: European Commission
export const EU_VAT_RATES = {
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19,
  CZ: 21, DK: 25, EE: 22, FI: 25.5, FR: 20,
  DE: 19, GR: 24, HU: 27, IE: 23, IT: 22,
  LV: 21, LT: 21, LU: 17, MT: 18, NL: 21,
  PL: 23, PT: 23, RO: 19, SK: 23, SI: 22,
  ES: 21, SE: 25,
  // Non-EU
  GB: 20, US: 0, CH: 8.1, NO: 25, CA: 0,
  AU: 10, JP: 10, CN: 13, IN: 18, BR: 0,
  IL: 17, SG: 9, KR: 10, TR: 20, AE: 5,
  Other: 0,
};

export function getVatRate(countryCode) {
  return EU_VAT_RATES[countryCode] ?? 0;
}

export function calculateExclFromIncl(priceIncl, vatRate) {
  if (vatRate <= 0) return priceIncl;
  return priceIncl / (1 + vatRate / 100);
}

export function calculateInclFromExcl(priceExcl, vatRate) {
  return priceExcl * (1 + vatRate / 100);
}
