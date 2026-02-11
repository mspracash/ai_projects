// word2vec.js
// Minimal Word2Vec loader + sentence-to-vector (average of word vectors)
//
// Supports "word2vec text" formats:
// 1) With header:   "<vocabSize> <dim>\nword v1 v2 ...\n..."
// 2) Without header: "word v1 v2 ...\n..."
// Also supports .vec files like fastText CC vectors.
//
// Usage:
//   import { buildWord2VecModel, sentToW2VVec } from "./word2vec.js";
//   const w2v = buildWord2VecModel({ path: "./word2vec.vec", limit: 200000 });
//   await w2v.load();
//   const vec = sentToW2VVec("customer lead drop", w2v);

import fs from "node:fs";
import readline from "node:readline";

function isNumeric(x) {
  if (x === null || x === undefined) return false;
  const n = Number(x);
  return Number.isFinite(n);
}

function zeros(dim) {
  const a = new Float32Array(dim);
  a.fill(0);
  return a;
}

function addInPlace(dst, src) {
  for (let i = 0; i < dst.length; i++) dst[i] += src[i];
}

function scaleInPlace(dst, s) {
  for (let i = 0; i < dst.length; i++) dst[i] *= s;
}

function l2norm(vec) {
  let ss = 0;
  for (let i = 0; i < vec.length; i++) ss += vec[i] * vec[i];
  return Math.sqrt(ss);
}

function normalizeL2(vec) {
  const n = l2norm(vec);
  if (!Number.isFinite(n) || n <= 0) return vec;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / n;
  return out;
}

function parseVector(parts, dim) {
  if (parts.length < dim + 1) return null;
  const v = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    const x = Number(parts[i + 1]);
    if (!Number.isFinite(x)) return null;
    v[i] = x;
  }
  return v;
}

export function buildWord2VecModel({ path, limit = 0 } = {}) {
  if (!path) throw new Error("buildWord2VecModel: missing `path`");

  return {
    path,
    limit: Number(limit ?? 0),
    dim: 0,
    vectors: new Map(), // token -> Float32Array(dim)

    async load() {
      if (!fs.existsSync(this.path)) {
        throw new Error(`Word2Vec file not found: ${this.path}`);
      }

      const rl = readline.createInterface({
        input: fs.createReadStream(this.path, { encoding: "utf8" }),
        crlfDelay: Infinity
      });

      let lineNo = 0;
      let loaded = 0;

      // Header detection
      // If first non-empty line is two integers: vocab dim, treat as header.
      let headerSeen = false;

      for await (const lineRaw of rl) {
        const line = lineRaw.trim();
        if (!line) continue;

        lineNo++;

        // First meaningful line: maybe header
        if (!headerSeen) {
          const parts = line.split(/\s+/);
          if (parts.length === 2 && isNumeric(parts[0]) && isNumeric(parts[1])) {
            const dim = Number(parts[1]);
            if (!Number.isFinite(dim) || dim <= 0) {
              throw new Error(`Invalid header dim at line 1: "${line}"`);
            }
            this.dim = dim;
            headerSeen = true;
            continue; // header line consumed
          } else {
            // no header: infer dim from this line
            // format: word + dim floats
            // dim = parts.length - 1
            const inferredDim = parts.length - 1;
            if (inferredDim <= 0) {
              throw new Error(`Cannot infer vector dim from line: "${line}"`);
            }
            this.dim = inferredDim;
            headerSeen = true;
            // fallthrough to parse this same line as a vector line
          }
        }

        const parts = line.split(/\s+/);
        const word = parts[0];

        // Safety: skip weird tokens
        if (!word) continue;

        // If dim mismatches, skip line
        if (parts.length !== this.dim + 1) continue;

        const vec = parseVector(parts, this.dim);
        if (!vec) continue;

        // Store L2-normalized vectors (helps cosine stability)
        this.vectors.set(word, normalizeL2(vec));

        loaded++;
        if (this.limit > 0 && loaded >= this.limit) break;
      }

      if (!this.dim) throw new Error("Word2Vec load failed: dim not detected");
      if (!this.vectors.size) throw new Error("Word2Vec load failed: no vectors loaded");

      return this;
    }
  };
}

// Average of token vectors (already normalized), then L2-normalize final sentence vector.
// Returns Float32Array(dim) (all zeros if no tokens found).
export function sentToW2VVec(text, w2vModel) {
  const dim = w2vModel?.dim ?? 0;
  if (!dim) throw new Error("sentToW2VVec: w2vModel.dim is not set (did you load the model?)");

  const toks = (text ?? "")
    .split(/\s+/)
    .filter(Boolean);

  if (!toks.length) return zeros(dim);

  const sum = zeros(dim);
  let hits = 0;

  for (const t of toks) {
    const v = w2vModel.vectors.get(t);
    if (!v) continue;
    addInPlace(sum, v);
    hits++;
  }

  if (hits === 0) return zeros(dim);

  scaleInPlace(sum, 1 / hits);
  return normalizeL2(sum);
}
