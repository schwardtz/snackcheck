/** ISO 3166-1 alpha-2 codes; names come from the browser so they match the phone's language. */
const CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ')

const CODE_SET = new Set(CODES)

const displayNames = (() => {
  try {
    return new Intl.DisplayNames([...navigator.languages, 'en'], { type: 'region' })
  } catch {
    return undefined
  }
})()

export function isCountryCode(code: unknown): code is string {
  return typeof code === 'string' && CODE_SET.has(code)
}

export function countryName(code: string): string {
  return displayNames?.of(code) ?? code
}

/** Flag emoji from regional indicator symbols, e.g. "JP" → 🇯🇵. */
export function countryFlag(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

/** All countries sorted by their localized name. */
export const COUNTRIES: { code: string; name: string }[] = CODES.map((code) => ({ code, name: countryName(code) })).sort(
  (a, b) => a.name.localeCompare(b.name),
)
