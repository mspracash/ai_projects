// tfidf.js
import { tokenize } from "./tokenize.js";

export function buildTfidfModel(docs) {
  const vocab = new Map(); // term->index
  const df = new Map();    // term->doc freq

  const tokenizedDocs = docs.map(text => {
    const toks = tokenize(text);
    const uniq = new Set(toks);
    for (const t of uniq) df.set(t, (df.get(t) ?? 0) + 1);
    for (const t of toks) if (!vocab.has(t)) vocab.set(t, vocab.size);
    return toks;
  });

  const N = docs.length;
  const idf = new Float64Array(vocab.size);
  for (const [term, idx] of vocab.entries()) {
    const dfi = df.get(term) ?? 0;
    // smooth idf
    idf[idx] = Math.log((N + 1) / (dfi + 1)) + 1;
  }

  const docVecs = tokenizedDocs.map((toks, i) => {
    const v = new Float64Array(vocab.size);
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);

    for (const [term, count] of tf.entries()) {
      const idx = vocab.get(term);
      if (idx !== undefined) v[idx] = count * idf[idx];
    }
    return { text: docs[i], vec: v };
  });

  return { vocab, idf, docs: docVecs };
}

export function vectorizeTfidf(text, vocab, idf) {
  const v = new Float64Array(vocab.size);
  const toks = tokenize(text);
  const tf = new Map();
  for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);

  for (const [term, count] of tf.entries()) {
    const idx = vocab.get(term);
    if (idx !== undefined) v[idx] = count * idf[idx];
  }
  return v;
}
