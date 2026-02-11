// domain_normalize.js
// Three normalization pipelines:
//
// 1) normalizeSemantic: lowercase + punctuation cleanup (NO lemma/stem)
// 2) normalizeW2V:      lowercase + punctuation cleanup + lemmatize (NO stem)  [avoid OOV stems]
// 3) normalizeLexical:  lowercase + punctuation cleanup + lemmatize + optional stem [BM25]
//
// Deps:
//   npm i wink-lemmatizer natural

import lemmatizer from "wink-lemmatizer";
import natural from "natural";

const stemmer = natural.PorterStemmer;

const PROTECT = new Set([
  "ga4", "gtm", "gsc", "gbp", "ppc", "seo", "sem", "cro",
  "cpc", "cpa", "roas", "ctr", "cvr", "aov", "ltv",
  "meta", "facebook", "instagram", "tiktok", "linkedin",
  "google", "bing", "youtube",
  "shopify", "wordpress", "wix", "squarespace",
  "api", "ui", "ux",
  "ads"
]);

function tokenize(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lemmaToken(t) {
  if (PROTECT.has(t)) return t;
  if (/^\d+$/.test(t)) return t;

  const n = lemmatizer.noun(t);
  if (n !== t) return n;

  const v = lemmatizer.verb(t);
  if (v !== t) return v;

  const a = lemmatizer.adjective(t);
  if (a !== t) return a;

  return t;
}

function stemToken(t) {
  if (PROTECT.has(t)) return t;
  if (/^\d+$/.test(t)) return t;
  return stemmer.stem(t);
}

export function normalizeSemantic(text) {
  return tokenize(text).join(" ");
}

export function normalizeW2V(text) {
  const toks = tokenize(text);
  return toks.map(lemmaToken).join(" ");
}

export function normalizeLexical(text, { stemEnabled = true } = {}) {
  const toks = tokenize(text);
  const out = toks.map((tok) => {
    const lem = lemmaToken(tok);
    if (!stemEnabled) return lem;

    // stem only if lemma didn't already change token
    if (lem !== tok) return lem;
    return stemToken(lem);
  });
  return out.join(" ");
}
