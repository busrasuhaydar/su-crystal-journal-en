// Names and flags of the countries that have holiday data.
export const COUNTRY_NAMES: Record<string, string> = {
  TR: 'Turkey', US: 'United States', AD: 'Andorra', AL: 'Albania', AT: 'Austria', AX: 'Åland Islands',
  BA: 'Bosnia and Herzegovina', BE: 'Belgium', BG: 'Bulgaria', BY: 'Belarus', CH: 'Switzerland', CY: 'Cyprus', CZ: 'Czechia',
  DE: 'Germany', DK: 'Denmark', EE: 'Estonia', ES: 'Spain', FI: 'Finland', FO: 'Faroe Islands', FR: 'France',
  GB: 'United Kingdom', GG: 'Guernsey', GI: 'Gibraltar', GR: 'Greece', HR: 'Croatia', HU: 'Hungary',
  IE: 'Ireland', IM: 'Isle of Man', IS: 'Iceland', IT: 'Italy', JE: 'Jersey', LI: 'Liechtenstein', LT: 'Lithuania',
  LU: 'Luxembourg', LV: 'Latvia', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MK: 'North Macedonia', MT: 'Malta',
  NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RS: 'Serbia', RU: 'Russia', SE: 'Sweden',
  SI: 'Slovenia', SJ: 'Svalbard', SK: 'Slovakia', SM: 'San Marino', UA: 'Ukraine', VA: 'Vatican City',
};
export const countryName = (cc: string) => COUNTRY_NAMES[cc] ?? cc;
export const flag = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
export const ALL_COUNTRIES = Object.keys(COUNTRY_NAMES).sort((a, b) =>
  a === 'TR' ? -1 : b === 'TR' ? 1 : countryName(a).localeCompare(countryName(b), 'en'));
