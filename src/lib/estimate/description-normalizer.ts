// ============================================================
// Description Normalizer for Proposal Line Item Matching
// ============================================================

/**
 * Canonical alias table mapping normalized description patterns
 * to standard short-form identifiers. Extend this table as new
 * proposal descriptions are encountered.
 */
export const DESCRIPTION_ALIASES: ReadonlyArray<{
  readonly patterns: readonly string[];
  readonly canonical: string;
}> = [
  {
    patterns: [
      'tesla universal wall connector (gen 3) model 1734412 02',
      'tesla universal wall connector gen 3',
      'tesla uwc gen3',
    ],
    canonical: 'tesla-uwc-gen3',
  },
  {
    patterns: [
      'tesla wall connector pedestal (includes mounting kit)',
      'tesla wall connector pedestal',
    ],
    canonical: 'tesla-pedestal',
  },
  {
    patterns: [
      'installation commissioning of pedestal mounted charger dual port',
      'installation & commissioning of pedestal-mounted charger - dual port',
      'install commission pedestal dual',
    ],
    canonical: 'install-ped-dual',
  },
  {
    patterns: [
      'installation commissioning of pedestal mounted charger single port',
      'installation & commissioning of pedestal-mounted charger - single port',
      'install commission pedestal single',
    ],
    canonical: 'install-ped-single',
  },
  {
    patterns: [
      'installation commissioning of wall mounted charger dual port',
      'installation & commissioning of wall-mounted charger - dual port',
      'install commission wall dual',
    ],
    canonical: 'install-wall-dual',
  },
  {
    patterns: [
      'installation commissioning of wall mounted charger single port',
      'installation & commissioning of wall-mounted charger - single port',
      'install commission wall single',
    ],
    canonical: 'install-wall-single',
  },
  {
    patterns: [
      'furnish install emt conduit up to 2 w up to 4 conductors',
      'furnish & install emt conduit-up to 2" w/ up to #4 conductors',
      'furnish install emt conduit up to 2 w 4 conductors',
      'emt conduit wire breakers connectors and strut cradles',
      'emt conduit wire breakers connectors and strut cradles includes materials labor',
    ],
    canonical: 'emt-conduit-2in',
  },
  {
    patterns: [
      'furnish install pvc schedule 40 up to 2 w 4 conductors',
      'furnish & install pvc schedule 40-up to 2" w/ #4 conductors',
    ],
    canonical: 'pvc-conduit-2in',
  },
  {
    patterns: [
      'base design eng 3 4 sheet site plan riser 1 line cd50 cd100',
      'base design/eng-3-4 sheet, site plan, riser, 1-line, cd50-cd100',
      'base design eng 3 4 sheet site plan riser 1 line cd50 cd100 load study load calcs property line stake garage field sketch as builts',
      'engineered and stamped plan set',
    ],
    canonical: 'design-engineering',
  },
  {
    patterns: [
      'load study load calcs',
      'load study/load calcs',
      'load calculations',
    ],
    canonical: 'load-calcs',
  },
  {
    patterns: [
      'permit coordination and filing up to 2 visits in person',
      'permit coordination and filing-up to 2 visits in person',
      'permit coordination filing up to 2 visits in person',
      'permit coordination filing (2 visits)',
      'permit coordination filing 2 visits',
    ],
    canonical: 'permit-coordination',
  },
  {
    patterns: [
      'misc mounting hardware bos (materials only)',
      'misc. mounting hardware & bos (materials only)',
      'misc mounting hardware bos materials only',
    ],
    canonical: 'mounting-hardware',
  },
  {
    patterns: [
      'install signage and stencils',
      'ev signage (includes materials labor)',
      'ev signage includes materials labor',
    ],
    canonical: 'install-signage',
  },
  {
    patterns: [
      'install provided bolt down bollard',
      'install provided bolt-down bollard',
    ],
    canonical: 'install-bollard',
  },
  {
    patterns: [
      'trenching (no conduit) up to 36 w and no more than 4 d',
      'trenching (no conduit)-up to 36" w and no more than 4\' d',
      'trenching no conduit up to 36 w and no more than 4 d',
      'trenching (assuming soft normal soil conditions)',
      'trenching assuming soft normal soil conditions',
    ],
    canonical: 'trenching-standard',
  },
  {
    patterns: [
      'concrete pads for pedestals',
    ],
    canonical: 'concrete-pads',
  },
  {
    patterns: [
      'site visit',
      'site walk evaluation',
      'site walk / evaluation',
    ],
    canonical: 'site-visit',
  },
  {
    patterns: [
      'utility coordination up to 2 visits in person',
      'utility coordination-up to 2 visits in person',
    ],
    canonical: 'utility-coordination',
  },
  {
    patterns: [
      'permit fees cost 10',
      'permit fees cost + 10%',
      'permit fees- cost + 10%',
      'permit fees (billed at actual cost 10 )',
      'permit fees billed at actual cost 10',
    ],
    canonical: 'permit-fees',
  },
  {
    patterns: [
      'as built',
      'as builts',
    ],
    canonical: 'as-built',
  },
  {
    patterns: [
      'equipment rental',
    ],
    canonical: 'equipment-rental',
  },
  {
    patterns: [
      'utility mark out',
      'utility mark-out',
      'utility markout',
      'private utility mark out and coordination',
    ],
    canonical: 'utility-markout',
  },
  {
    patterns: [
      'concrete removal',
    ],
    canonical: 'concrete-removal',
  },
  {
    patterns: [
      'concrete restoration',
    ],
    canonical: 'concrete-restoration',
  },
  {
    patterns: [
      'install striping per stall',
      'install striping-per stall',
    ],
    canonical: 'install-striping',
  },
  {
    patterns: [
      'furnish and install rubber wheelstops',
    ],
    canonical: 'wheelstops',
  },
  {
    patterns: [
      'install owner provided wi fi equipment',
      'install owner provided wi-fi equipment',
    ],
    canonical: 'wifi-install',
  },
  {
    patterns: [
      'core drilling 1 6 concrete cmu',
      'core drilling 1"-6" concrete/cmu',
      'core drilling 1 6',
    ],
    canonical: 'core-drilling',
  },
  {
    patterns: [
      'scan x ray wall floor',
      'scan/x-ray-wall/floor',
    ],
    canonical: 'scan-xray',
  },
  {
    patterns: [
      'concrete curb gutter 6 in x 24 in',
      'concrete curb & gutter, 6 in x 24 in',
      'concrete curb gutter 6 x24',
    ],
    canonical: 'curb-gutter',
  },
  {
    patterns: [
      'concrete header curb 6 in',
      'concrete header curb, 6 in',
      'concrete header curb 6',
    ],
    canonical: 'header-curb',
  },
  {
    patterns: [
      'construction fence',
    ],
    canonical: 'construction-fence',
  },
  {
    patterns: [
      'on site traffic control safety fence',
      'on-site traffic control, safety fence',
    ],
    canonical: 'traffic-control',
  },
  {
    patterns: [
      'encasement of conduits',
    ],
    canonical: 'conduit-encasement',
  },
  {
    patterns: [
      'boring',
    ],
    canonical: 'boring',
  },
  {
    patterns: [
      'hand trenching',
    ],
    canonical: 'hand-trenching',
  },
  {
    patterns: [
      'furnish install 1 1 4 emt conduit',
      'furnish & install 1 1/4 emt conduit',
    ],
    canonical: 'emt-conduit-1-25in',
  },
  {
    patterns: [
      'furnish install 3 conduit pvc schedule 40',
      'furnish & install 3" conduit (pvc schedule 40)',
    ],
    canonical: 'pvc-conduit-3in',
  },
  {
    patterns: [
      'installation of conductors up to 4',
      'installation of conductors-up to #4',
    ],
    canonical: 'conductors-4awg',
  },
  {
    patterns: [
      'remove re install client provided bolt down bollards',
      'remove & re-install client provided bolt down bollards',
    ],
    canonical: 'reinstall-bollard',
  },
  {
    patterns: [
      'asphalt removal',
    ],
    canonical: 'asphalt-removal',
  },
  {
    patterns: [
      'asphalt restoration',
    ],
    canonical: 'asphalt-restoration',
  },
  {
    patterns: [
      'concrete curb gutter 6 in x 24 in removal',
      'concrete curb & gutter, 6 in x 24 in - removal',
    ],
    canonical: 'curb-gutter-removal',
  },
  {
    patterns: [
      'concrete curb gutter 6 in x 24 in restoration',
      'concrete curb & gutter, 6 in x 24 in - restoration',
    ],
    canonical: 'curb-gutter-restoration',
  },
] as const;

/**
 * Normalizes a line item description by:
 * 1. Replacing special characters (en-dash, smart quotes, etc.)
 * 2. Lowercasing
 * 3. Stripping non-alphanumeric characters (except spaces)
 * 4. Collapsing whitespace
 */
export function normalizeDescription(desc: string): string {
  let result = desc;

  // Replace en-dash, em-dash with space
  result = result.replace(/[\u2013\u2014]/g, ' ');

  // Replace smart quotes
  result = result.replace(/[\u2018\u2019\u201C\u201D]/g, '');

  // Lowercase
  result = result.toLowerCase();

  // Strip non-alphanumeric except spaces
  result = result.replace(/[^a-z0-9 ]/g, ' ');

  // Collapse whitespace
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Resolves a description to its canonical alias, if one exists.
 * Returns the canonical string or the normalized description if no alias matches.
 */
export function toCanonical(desc: string): string {
  const normalized = normalizeDescription(desc);

  for (const alias of DESCRIPTION_ALIASES) {
    for (const pattern of alias.patterns) {
      const normalizedPattern = normalizeDescription(pattern);
      if (normalized === normalizedPattern) {
        return alias.canonical;
      }
    }
  }

  return normalized;
}

/**
 * Returns true if two descriptions match after normalization and alias resolution.
 */
export function matchDescription(estimated: string, actual: string): boolean {
  const canonicalEstimated = toCanonical(estimated);
  const canonicalActual = toCanonical(actual);

  if (canonicalEstimated === canonicalActual) {
    return true;
  }

  // Fallback: check if one contains the other (for partial matches)
  const normEstimated = normalizeDescription(estimated);
  const normActual = normalizeDescription(actual);

  if (normEstimated.length > 5 && normActual.length > 5) {
    if (normEstimated.includes(normActual) || normActual.includes(normEstimated)) {
      return true;
    }
  }

  return false;
}
