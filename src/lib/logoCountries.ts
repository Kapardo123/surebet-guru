import { LogoCandidate, bareKey, sportKind, teamKey } from "@/lib/logoNames";

/*
 * National teams: a country's flag from flagcdn.com, matched by its English or
 * Polish name. No API call, works for every sport, men's and women's sides
 * and age groups ("Poland U21" and "Polska kobiety" both give the Polish flag).
 */

/** ISO 3166 code (or flagcdn's gb-eng style) -> names people write. */
const COUNTRIES: Record<string, string[]> = {
  al: ["albania"],
  dz: ["algeria", "algieria"],
  ar: ["argentina", "argentyna"],
  am: ["armenia"],
  au: ["australia"],
  at: ["austria"],
  az: ["azerbaijan", "azerbejdzan"],
  by: ["belarus", "bialorus"],
  be: ["belgium", "belgia"],
  ba: ["bosnia and herzegovina", "bosnia", "bosnia i hercegowina"],
  br: ["brazil", "brazylia"],
  bg: ["bulgaria"],
  cm: ["cameroon", "kamerun"],
  ca: ["canada", "kanada"],
  cl: ["chile"],
  cn: ["china", "chiny"],
  co: ["colombia", "kolumbia"],
  cr: ["costa rica", "kostaryka"],
  hr: ["croatia", "chorwacja"],
  cy: ["cyprus", "cypr"],
  cz: ["czech republic", "czechia", "czechy"],
  dk: ["denmark", "dania"],
  ec: ["ecuador", "ekwador"],
  eg: ["egypt", "egipt"],
  "gb-eng": ["england", "anglia"],
  ee: ["estonia"],
  fo: ["faroe islands", "wyspy owcze"],
  fi: ["finland", "finlandia"],
  fr: ["france", "francja"],
  ge: ["georgia", "gruzja"],
  de: ["germany", "niemcy"],
  gh: ["ghana"],
  gr: ["greece", "grecja"],
  hu: ["hungary", "wegry"],
  is: ["iceland", "islandia"],
  in: ["india", "indie"],
  id: ["indonesia", "indonezja"],
  ir: ["iran"],
  iq: ["iraq", "irak"],
  ie: ["republic of ireland", "ireland", "irlandia"],
  il: ["israel", "izrael"],
  it: ["italy", "wlochy"],
  ci: ["ivory coast", "cote d ivoire", "wybrzeze kosci sloniowej"],
  jm: ["jamaica", "jamajka"],
  jp: ["japan", "japonia"],
  kz: ["kazakhstan", "kazachstan"],
  xk: ["kosovo", "kosowo"],
  lv: ["latvia", "lotwa"],
  lt: ["lithuania", "litwa"],
  lu: ["luxembourg", "luksemburg"],
  mt: ["malta"],
  mx: ["mexico", "meksyk"],
  md: ["moldova", "moldawia"],
  me: ["montenegro", "czarnogora"],
  ma: ["morocco", "maroko"],
  nl: ["netherlands", "holland", "holandia"],
  nz: ["new zealand", "nowa zelandia"],
  ng: ["nigeria"],
  mk: ["north macedonia", "macedonia polnocna", "macedonia"],
  "gb-nir": ["northern ireland", "irlandia polnocna"],
  no: ["norway", "norwegia"],
  pa: ["panama"],
  py: ["paraguay", "paragwaj"],
  pe: ["peru"],
  ph: ["philippines", "filipiny"],
  pl: ["poland", "polska"],
  pt: ["portugal", "portugalia"],
  qa: ["qatar", "katar"],
  ro: ["romania", "rumunia"],
  ru: ["russia", "rosja"],
  sa: ["saudi arabia", "arabia saudyjska"],
  "gb-sct": ["scotland", "szkocja"],
  sn: ["senegal"],
  rs: ["serbia"],
  sk: ["slovakia", "slowacja"],
  si: ["slovenia", "slowenia"],
  za: ["south africa", "rpa", "republika poludniowej afryki"],
  kr: ["south korea", "korea republic", "korea poludniowa"],
  es: ["spain", "hiszpania"],
  se: ["sweden", "szwecja"],
  ch: ["switzerland", "szwajcaria"],
  tn: ["tunisia", "tunezja"],
  tr: ["turkey", "turkiye", "turcja"],
  ua: ["ukraine", "ukraina"],
  ae: ["united arab emirates", "uae", "zjednoczone emiraty arabskie"],
  us: ["united states", "usa", "stany zjednoczone"],
  uy: ["uruguay", "urugwaj"],
  uz: ["uzbekistan"],
  ve: ["venezuela", "wenezuela"],
  "gb-wls": ["wales", "walia"],
};

const BY_NAME = new Map<string, string>();
for (const [code, names] of Object.entries(COUNTRIES)) for (const n of names) BY_NAME.set(bareKey(n), code);

/** The flag code for a national team name, or null for a club. */
export const countryCode = (teamName: string): string | null => BY_NAME.get(bareKey(teamName)) ?? null;

export const getCountryFlag = (teamName: string, sport?: string | null, league?: string | null): LogoCandidate | null => {
  // US college and pro sports use state and city names ("Georgia" is a university there).
  const kind = sportKind(sport);
  if (kind === "american-football" || kind === "baseball" || /ncaa|college/.test(teamKey(league || ""))) return null;
  const code = countryCode(teamName);
  return code ? { url: `https://flagcdn.com/w160/${code}.png`, source: "Flag", teamName: teamName.trim(), score: 95 } : null;
};
