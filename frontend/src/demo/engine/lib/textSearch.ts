/**
 * Product search the way the API's MongoDB text index answers it (`{ $text: { $search: q } }` on title + description,
 * language English): words are compared by their stem ("phones" finds "phone"), common words are ignored, any one word is
 * enough, "a quoted phrase" must appear as written, and -word leaves out products that have it.
 */

const STOP_WORDS = new Set(
  (
    'a about above after again against all am an and any are aren\'t as at be because been before being below between both ' +
    'but by can\'t cannot could couldn\'t did didn\'t do does doesn\'t doing don\'t down during each few for from further had ' +
    'hadn\'t has hasn\'t have haven\'t having he he\'d he\'ll he\'s her here here\'s hers herself him himself his how how\'s i ' +
    'i\'d i\'ll i\'m i\'ve if in into is isn\'t it it\'s its itself let\'s me more most mustn\'t my myself no nor not of off on ' +
    'once only or other ought our ours ourselves out over own same shan\'t she she\'d she\'ll she\'s should shouldn\'t so some ' +
    'such than that that\'s the their theirs them themselves then there there\'s these they they\'d they\'ll they\'re they\'ve ' +
    'this those through to too under until up very was wasn\'t we we\'d we\'ll we\'re we\'ve were weren\'t what what\'s when ' +
    'when\'s where where\'s which while who who\'s whom why why\'s with won\'t would wouldn\'t you you\'d you\'ll you\'re ' +
    'you\'ve your yours yourself yourselves'
  ).split(' ')
);

// ---------- The Snowball English (Porter2) stemmer, which MongoDB's English text index uses.

const VOWELS = 'aeiouy';
const isVowel = (c: string | undefined) => c !== undefined && VOWELS.includes(c);
const EXCEPTIONS: Record<string, string> = {
  skis: 'ski', skies: 'sky', dying: 'die', lying: 'lie', tying: 'tie', idly: 'idl', gently: 'gentl', ugly: 'ugli',
  early: 'earli', only: 'onli', singly: 'singl', sky: 'sky', news: 'news', howe: 'howe', atlas: 'atlas', cosmos: 'cosmos',
  bias: 'bias', andes: 'andes',
};
const AFTER_STEP_1A = new Set(['inning', 'outing', 'canning', 'herring', 'earring', 'proceed', 'exceed', 'succeed']);

/** Where the region after the first non-vowel following a vowel starts, from `from` on. */
function regionAfter(word: string, from: number): number {
  for (let i = from + 1; i < word.length; i++) {
    if (!isVowel(word[i]) && isVowel(word[i - 1])) return i + 1;
  }
  return word.length;
}

function endsShortSyllable(word: string): boolean {
  const n = word.length;
  if (n === 2) return isVowel(word[0]) && !isVowel(word[1]);
  return n >= 3 && !isVowel(word[n - 3]) && isVowel(word[n - 2]) && !isVowel(word[n - 1]) && !'wxY'.includes(word[n - 1]);
}

export function stem(input: string): string {
  let word = input.toLowerCase();
  if (word.length <= 2) return word;
  if (word.startsWith("'")) word = word.slice(1);
  if (EXCEPTIONS[word]) return EXCEPTIONS[word];

  // y as a consonant (initial, or after a vowel) is written Y while stemming.
  if (word[0] === 'y') word = `Y${word.slice(1)}`;
  for (let i = 1; i < word.length; i++) if (word[i] === 'y' && isVowel(word[i - 1])) word = `${word.slice(0, i)}Y${word.slice(i + 1)}`;

  const special = ['gener', 'commun', 'arsen'].find((p) => word.startsWith(p));
  const r1 = special ? special.length : regionAfter(word, 0);
  const r2 = regionAfter(word, r1);
  const inR1 = (suffix: string) => word.length - suffix.length >= r1;
  const inR2 = (suffix: string) => word.length - suffix.length >= r2;
  const replace = (suffix: string, by: string) => {
    word = word.slice(0, word.length - suffix.length) + by;
  };
  const longest = (suffixes: string[]) => suffixes.filter((s) => word.endsWith(s)).sort((a, b) => b.length - a.length)[0];

  // Step 0
  const s0 = longest(["'s'", "'s", "'"]);
  if (s0) replace(s0, '');

  // Step 1a
  const s1a = longest(['sses', 'ied', 'ies', 'us', 'ss', 's']);
  if (s1a === 'sses') replace('sses', 'ss');
  else if (s1a === 'ied' || s1a === 'ies') replace(s1a, word.length - 3 > 1 ? 'i' : 'ie');
  else if (s1a === 's' && /[aeiouy]/.test(word.slice(0, -2))) replace('s', '');
  if (AFTER_STEP_1A.has(word)) return word;

  // Step 1b
  const s1b = longest(['eed', 'eedly', 'ed', 'edly', 'ing', 'ingly']);
  if (s1b === 'eed' || s1b === 'eedly') {
    if (inR1(s1b)) replace(s1b, 'ee');
  } else if (s1b && /[aeiouy]/.test(word.slice(0, -s1b.length))) {
    replace(s1b, '');
    if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) word += 'e';
    else if (/(bb|dd|ff|gg|mm|nn|pp|rr|tt)$/.test(word)) word = word.slice(0, -1);
    else if (endsShortSyllable(word) && r1 >= word.length) word += 'e';
  }

  // Step 1c
  if (word.length > 2 && /[yY]$/.test(word) && !isVowel(word[word.length - 2])) replace(word[word.length - 1], 'i');

  // Step 2
  const step2: Record<string, string> = {
    tional: 'tion', enci: 'ence', anci: 'ance', abli: 'able', entli: 'ent', izer: 'ize', ization: 'ize', ational: 'ate',
    ation: 'ate', ator: 'ate', alism: 'al', aliti: 'al', alli: 'al', fulness: 'ful', ousli: 'ous', ousness: 'ous',
    iveness: 'ive', iviti: 'ive', biliti: 'ble', bli: 'ble', ogi: 'og', fulli: 'ful', lessli: 'less', li: '',
  };
  const s2 = longest(Object.keys(step2));
  if (s2 && inR1(s2)) {
    if (s2 === 'ogi') {
      if (word.endsWith('logi')) replace('ogi', 'og');
    } else if (s2 === 'li') {
      if ('cdeghkmnrt'.includes(word[word.length - 3])) replace('li', '');
    } else {
      replace(s2, step2[s2]);
    }
  }

  // Step 3
  const step3: Record<string, string> = {
    tional: 'tion', ational: 'ate', alize: 'al', icate: 'ic', iciti: 'ic', ical: 'ic', ful: '', ness: '', ative: '',
  };
  const s3 = longest(Object.keys(step3));
  if (s3 && inR1(s3) && (s3 !== 'ative' || inR2(s3))) replace(s3, step3[s3]);

  // Step 4
  const s4 = longest([
    'al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement', 'ment', 'ent', 'ism', 'ate', 'iti', 'ous', 'ive',
    'ize', 'ion',
  ]);
  if (s4 && inR2(s4)) {
    if (s4 !== 'ion' || /[st]$/.test(word.slice(0, -3))) replace(s4, '');
  }

  // Step 5
  if (word.endsWith('e')) {
    const stemPart = word.slice(0, -1);
    if (inR2('e') || (inR1('e') && !endsShortSyllable(stemPart))) word = stemPart;
  } else if (word.endsWith('l') && inR2('l') && word.endsWith('ll')) {
    word = word.slice(0, -1);
  }

  return word.replace(/Y/g, 'y');
}

// ---------- Matching

// Accents don't matter (Mongo's text index is diacritic-insensitive). Written as a property class so it stays ASCII in the
// bundle — the minifier turns \u escapes in a regex into the characters themselves.
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const words = (text: string) => fold(text).split(/[^\p{L}\p{N}']+/u).filter(Boolean);

export interface TextQuery {
  terms: string[];
  phrases: string[];
  excluded: string[];
}

export function parseTextQuery(q: string): TextQuery {
  const phrases: string[] = [];
  const rest = q.replace(/"([^"]*)"/g, (_match, phrase: string) => {
    if (phrase.trim()) phrases.push(fold(phrase.trim()));
    return ' ';
  });
  const terms: string[] = [];
  const excluded: string[] = [];
  for (const token of rest.split(/\s+/).filter(Boolean)) {
    const negated = token.startsWith('-') && token.length > 1;
    for (const word of words(negated ? token.slice(1) : token)) {
      if (STOP_WORDS.has(word)) continue;
      (negated ? excluded : terms).push(stem(word));
    }
  }
  return { terms, phrases, excluded };
}

// A document's stems, worked out once per version of its text (documents are edited in place).
const stemCache = new WeakMap<object, { text: string; stems: Set<string> }>();

/** Whether a document's fields match the search — the fields being the ones the text index covers. */
export function matchesText(doc: object, fields: string[], query: TextQuery): boolean {
  if (query.terms.length === 0 && query.phrases.length === 0) return false;
  const values = fields.map((f) => (doc as Record<string, unknown>)[f]).filter((v): v is string => typeof v === 'string');
  const joined = values.join('\n');

  let cached = stemCache.get(doc);
  if (!cached || cached.text !== joined) {
    cached = { text: joined, stems: new Set(values.flatMap(words).filter((w) => !STOP_WORDS.has(w)).map(stem)) };
    stemCache.set(doc, cached);
  }
  const { stems } = cached;

  if (query.excluded.some((s) => stems.has(s))) return false;
  if (query.phrases.length > 0) {
    const text = fold(joined);
    if (!query.phrases.every((p) => text.includes(p))) return false;
    // With a phrase the other words only rank the results; on their own they must match.
    return true;
  }
  return query.terms.some((s) => stems.has(s));
}
