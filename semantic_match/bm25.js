// bm25.js
import { tokenize } from "./tokenize.js";

export function buildBm25Model(docs) {
  const tokenized = docs.map(d => tokenize(d));
  const N = tokenized.length;

  const df = new Map(); // term->df
  const docLens = new Float64Array(N);

  let avgdl = 0;
  for (let i = 0; i < N; i++) {
    const toks = tokenized[i];
    docLens[i] = toks.length;
    avgdl += toks.length;

    const uniq = new Set(toks);
    for (const t of uniq) df.set(t, (df.get(t) ?? 0) + 1);
  }
  avgdl = N ? avgdl / N : 0;

  // idf(term)
  const idf = new Map();
  for (const [term, dfi] of df.entries()) {
    // standard BM25 idf with smoothing
    const val = Math.log(1 + (N - dfi + 0.5) / (dfi + 0.5));
    idf.set(term, val);
  }

  // per-doc term frequencies
  const tfs = tokenized.map(toks => {
    const m = new Map();
    for (const t of toks) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });

  return { tokenized, idf, tfs, docLens, avgdl };
}

export function bm25Score(queryText, docIndex, model, { k1 = 1.5, b = 0.75 } = {}) {
  const qToks = tokenize(queryText);
  if (!qToks.length) return 0;

  const tfDoc = model.tfs[docIndex];
  const dl = model.docLens[docIndex] ?? 0;
  const avgdl = model.avgdl || 1;

  let score = 0;
  const seen = new Set();
  for (const term of qToks) {
    if (seen.has(term)) continue;
    seen.add(term);

    const tf = tfDoc.get(term) ?? 0;
    if (!tf) continue;

    const idf = model.idf.get(term) ?? 0;
    const denom = tf + k1 * (1 - b + b * (dl / avgdl));
    score += idf * (tf * (k1 + 1)) / denom;
  }
  return score;
}
