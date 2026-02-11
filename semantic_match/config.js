// config.js
export const CONFIG = {
  pipeline: {
    // semantic candidate anchors (for semantic pooling)
    k_sem: 50,

    // (kept for compatibility if you later re-add w2v)
    k_w2v: 20,
    w2v_min_coverage: 0.25,

    // bm25 candidate anchors (not required for correctness; optional for speed if you add top-k later)
    k_bm25: 10
  },

  semantic: {
    provider: "ollama",
    ollama_url: "http://localhost:11434",
    model: "nomic-embed-text",
    min_candidate: 0.0
  },

  // (kept for compatibility)
  word2vec: {
    path: "./word2vec.vec",
    limit: 20000
  },

  bm25: {
    // BM25 hyperparams
    k1: 1.2,
    b: 0.75,

    // soft-normalization constant used in bm25To01: s/(s+softnorm_k)
    softnorm_k: 6.0
  },

  decision: {
    topk: 5,
    min_relevance: 0.45,
    min_gap: 0.04
  },

  domain: {
    hard_gate: true,
    soft_penalty: 0.10
  },

  lexical: {
    // NOTE: these are the flags index.js reads
    lemmatization_enabled: true,
    stemming_enabled: true
  },

  // FINAL SCORE FUSION (THIS IS WHERE YOU TUNE)
  // - semantic + bm25 are combined via sum + synergy + conflict penalty
  final_weights: {
    // base weights for the OR-ish sum
    semantic: 0.65,
    bm25: 0.35,

  }
};
