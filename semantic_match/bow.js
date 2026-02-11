// bow.js
import { tokenize } from "./tokenize.js";

export function buildBowModel(docs) {
  const vocab = new Map(); // term -> index

  for (const text of docs) {
    const toks = tokenize(text);
    for (const t of toks) {
      if (!vocab.has(t)) vocab.set(t, vocab.size);
    }
  }

  const docVecs = docs.map(text => {
    const v = new Float64Array(vocab.size);
    const toks = tokenize(text);
    for (const t of toks) {
      const idx = vocab.get(t);
      if (idx !== undefined) v[idx] += 1;
    }
    return { text, vec: v };
  });

  return { vocab, docs: docVecs };
}

export function vectorizeBow(text, vocab) {
  const v = new Float64Array(vocab.size);
  const toks = tokenize(text);
  for (const t of toks) {
    const idx = vocab.get(t);
    if (idx !== undefined) v[idx] += 1;
  }
  return v;
}
