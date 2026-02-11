// tokenize.js
// Practical tokenizer for marketing intent matching.

const STOPWORDS = new Set([
  // common English
  "a","an","the","and","or","but","if","then","else",
  "is","are","am","was","were","be","been","being",
  "to","of","in","on","for","with","at","by","from","as","into","over","under",
  "this","that","these","those",
  "it","its","we","our","you","your","they","their","i","me","my",
  "do","does","did","doing","done","can","could","should","would","may","might","will","shall",
  "just","really","very","so","too","also","still","even","only","almost","basically",
  "here","there","when","where","why","how","what","which","who","whom",
  "please","thanks","thank",

  // domain structural nouns (prevent leakage)
  "site","website","web","page","pages","online","digital","business","company",

  // filler verbs (often noise in short intents)
  "get","gets","getting","got","make","makes","making","made","take","takes","taking","took"
]);

const ACRONYMS = new Map([
  ["ga4", "google analytics 4"],
  ["gtm", "google tag manager"],
  ["gsc", "google search console"],
  ["gbp", "google business profile"],
  ["gmb", "google business profile"],
  ["seo", "search engine optimization"],
  ["serp", "search results"],
  ["cpc", "cost per click"],
  ["cpa", "cost per acquisition"],
  ["roas", "return on ad spend"],
  ["roi", "return on investment"],
  ["ctr", "click through rate"],
  ["lcp", "largest contentful paint"],
  ["cls", "cumulative layout shift"],
  ["fid", "first input delay"],
  ["ttfb", "time to first byte"]
]);

function normalize(raw) {
  let t = (raw ?? "").toString().toLowerCase();
  t = t.replace(/[’‘]/g, "'");

  // expand a few common contractions
  t = t.replace(/\bcan't\b/g, "cannot");
  t = t.replace(/\bwon't\b/g, "will not");
  t = t.replace(/\bdon't\b/g, "do not");
  t = t.replace(/\bdoesn't\b/g, "does not");
  t = t.replace(/\bdidn't\b/g, "did not");
  t = t.replace(/\bisn't\b/g, "is not");
  t = t.replace(/\baren't\b/g, "are not");

  // expand acronyms as whole tokens
  t = t.replace(/\b[a-z0-9]+\b/g, (tok) => ACRONYMS.get(tok) ?? tok);

  // normalize separators
  t = t.replace(/[\/\-]/g, " ");
  // remove non-alnum
  t = t.replace(/[^a-z0-9\s]+/g, " ");
  // collapse whitespace
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function stem(tok) {
  if (tok.length <= 3) return tok;
  if (/^\d+$/.test(tok)) return tok;

  if (tok.endsWith("ies") && tok.length > 4) return tok.slice(0, -3) + "y";
  if (tok.endsWith("ing") && tok.length > 5) return tok.slice(0, -3);
  if (tok.endsWith("ed") && tok.length > 4) return tok.slice(0, -2);
  if (tok.endsWith("es") && tok.length > 4) return tok.slice(0, -2);
  if (tok.endsWith("s") && tok.length > 4) return tok.slice(0, -1);
  return tok;
}

export function tokenize(text, { keepNumbers = true, minLen = 2, doStem = true } = {}) {
  const norm = normalize(text);
  if (!norm) return [];
  const rawTokens = norm.split(" ").filter(Boolean);

  const out = [];
  for (const tok0 of rawTokens) {
    if (/^\d+$/.test(tok0)) {
      if (keepNumbers) out.push(tok0);
      continue;
    }
    if (tok0.length < minLen) continue;
    if (STOPWORDS.has(tok0)) continue;

    const tok = doStem ? stem(tok0) : tok0;
    if (STOPWORDS.has(tok)) continue;

    out.push(tok);
  }
  return out;
}
