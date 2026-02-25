// ─── Belastingdienst Source Links ─────────────────────────────────────────────
// Deterministic map of tax mechanisms → official Belastingdienst URLs.
// The copilot explains in plain language; users verify via the official source.

export const TAX_SOURCE_LINKS = {
  standard_btw: {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen/btw_aangifte/',
    label: 'BTW aangifte doen',
    description: 'Official guide on filing your BTW return',
  },
  reverse_charge_eu: {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/zakendoen_met_het_buitenland/goederen_en_diensten_uit_eu_landen/btw_berekenen_bij_diensten_uit_eu/',
    label: 'Diensten uit EU-landen',
    description: 'How reverse charge works for EU services',
  },
  reverse_charge_non_eu: {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/zakendoen_met_het_buitenland/goederen_en_diensten_uit_niet_eu_landen/',
    label: 'Diensten uit niet-EU-landen',
    description: 'Rules for services from outside the EU',
  },
  import_no_vat: {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/zakendoen_met_het_buitenland/invoer_van_goederen/',
    label: 'Invoer van goederen',
    description: 'Import VAT and customs duties',
  },
};

export const RUBRIC_LINKS = {
  '4a': {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen/bereken_het_bedrag/rubrieken_aangifte/rubriek_4a/',
    label: 'Rubriek 4a \u2014 Verwerving buiten EU',
  },
  '4b': {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen/bereken_het_bedrag/rubrieken_aangifte/rubriek_4b/',
    label: 'Rubriek 4b \u2014 Verwerving binnen EU',
  },
  '1a': {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen/bereken_het_bedrag/rubrieken_aangifte/rubriek_1a/',
    label: 'Rubriek 1a \u2014 Hoog tarief (21%)',
  },
  '1b': {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aangifte_doen/bereken_het_bedrag/rubrieken_aangifte/rubriek_1b/',
    label: 'Rubriek 1b \u2014 Laag tarief (9%)',
  },
};

export const FINANCE_GUIDE_LINKS = {
  deductibility: {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_aftrekken/',
    label: 'BTW aftrekken (voorbelasting)',
    description: 'When and how you can deduct input VAT',
  },
  kleineondernemersregeling: {
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/hoe_werkt_de_btw/kleineondernemersregeling/',
    label: 'Kleineondernemersregeling (KOR)',
    description: 'Small business VAT exemption scheme',
  },
};
