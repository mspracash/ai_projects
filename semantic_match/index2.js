// index.js (3-stage cascade, using Nomic sentence embeddings via Ollama)
// Stage0: Nomic sentence embeddings -> top K_sem anchors
// Stage1: Word2Vec rerank/filter -> top K_w2v anchors (lemma only)
// Stage2: BM25 rerank final -> pool to concerns + decision (lemma + optional stem)

import readline from "node:readline";

import { CONFIG } from "./config.js";
import { CONCERNS } from "./concerns.js";
import { cosine } from "./cosine.js";
import { normalizeSemantic, normalizeW2V, normalizeLexical } from "./domain_normalize.js";

import { buildBm25Model, bm25Score } from "./bm25.js";
import { detectDomains } from "./domain_gate.js";
import { buildSentenceEmbedder } from "./sent_embed.js";

import { buildWord2VecModel, sentToW2VVec } from "./word2vec.js";

// ------------------ Helpers ------------------
function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function bm25SoftNorm(s, k) {
  if (!Number.isFinite(s) || s <= 0) return 0;
  return clamp01(s / (s + k));
}

function l2norm(vec) {
  let s = 0;
  for (const v of vec) s += v * v;
  return Math.sqrt(s);
}

function tokenCoverageW2V(text, w2vModel) {
  const toks = (text ?? "").split(/\s+/).filter(Boolean);
  if (!toks.length) return 0;
  let hit = 0;
  for (const t of toks) if (w2vModel.vectors.has(t)) hit++;
  return hit / toks.length;
}

function help() {
  console.log(`
Commands:
  (type any sentence)   rank concerns
  :topk <n>             set top-k (session only)
  :minrel <x>           set min relevance threshold (0..1) (session only)
  :mingap <x>           set min gap threshold (0..1) (session only)
  :ksem <n>             set K_sem (session only)
  :kw2v <n>             set K_w2v (session only)
  :kbm25 <n>            set K_bm25 (session only)
  :list                 list concerns + anchor counts
  :exit                 quit
`.trim());
}

function decide(results, MIN_RELEVANCE, MIN_GAP) {
  if (!results?.length) return { label: "NO_CONCERNS", reason: "no results" };
  if (results.length === 1) return { label: "CONCERN", gap: 1, reason: "single result" };

  const top1 = results[0];
  const top2 = results[1];
  const gap = top1.score - top2.score;

  if (top1.score < MIN_RELEVANCE) {
    return {
      label: "NON_CONCERN",
      gap,
      reason: `top1 < min_relevance (${top1.score.toFixed(4)} < ${MIN_RELEVANCE})`
    };
  }
  if (gap < MIN_GAP) {
    return {
      label: "AMBIGUOUS",
      gap,
      reason: `gap < min_gap (${gap.toFixed(4)} < ${MIN_GAP})`
    };
  }
  return { label: "CONCERN", gap, reason: "passes thresholds" };
}

// MAX pool anchors -> concerns (Map concernId -> {score, idx})
function maxPoolToConcerns(anchorScores, anchorDocs, concerns) {
  const best = new Map();
  for (let i = 0; i < anchorScores.length; i++) {
    const cid = anchorDocs[i].concernId;
    const s = anchorScores[i];
    const cur = best.get(cid);
    if (!cur || s > cur.score) best.set(cid, { score: s, idx: i });
  }
  for (const c of concerns) if (!best.has(c.id)) best.set(c.id, { score: 0, idx: -1 });
  return best;
}

function toDomainsArray(c) {
  if (Array.isArray(c.domains) && c.domains.length) return c.domains;
  if (typeof c.domain === "string" && c.domain.trim()) return [c.domain.trim()];
  return [];
}

function intersects(arr, set) {
  for (const x of arr) if (set.has(x)) return true;
  return false;
}

// ------------------ Build anchors ------------------
function buildAnchorDocs() {
  const docs = [];
  for (const c of CONCERNS) {
    for (const a of c.anchors) docs.push({ concernId: c.id, text: a });
  }
  return docs;
}

const anchorDocs = buildAnchorDocs();

// Three parallel normalizations
const anchorSemTexts = anchorDocs.map(d => normalizeSemantic(d.text)); // for Nomic sentence embeddings
const anchorW2VTexts = anchorDocs.map(d => normalizeW2V(d.text));      // lemmatize only
const anchorLexTexts = anchorDocs.map(d =>
  normalizeLexical(d.text, { stemEnabled: CONFIG.lexical.stem_enabled })
);

// BM25 built on lexical-normalized anchors
const bm25Model = buildBm25Model(anchorLexTexts);

// ------------------ Startup ------------------
console.log("3-stage Concern Ranker (Nomic + Word2Vec + BM25)");
console.log("Stage0: Nomic sentence embeddings (candidate gen) [semantic normalization]");
console.log("Stage1: Word2Vec rerank/filter                   [lemmatize only]");
console.log("Stage2: BM25 rerank final                        [lemmatize + optional stem]");
console.log(`Concerns: ${CONCERNS.length}`);
console.log(`Anchors:  ${anchorDocs.length}`);

let TOPK = CONFIG.decision.topk;
let MIN_RELEVANCE = CONFIG.decision.min_relevance;
let MIN_GAP = CONFIG.decision.min_gap;

let K_SEM = CONFIG.pipeline.k_sem;
let K_W2V = CONFIG.pipeline.k_w2v;
let K_BM25 = CONFIG.pipeline.k_bm25;

const MIN_SEM_CAND = CONFIG.semantic.min_candidate;
const BM25_K = CONFIG.bm25.softnorm_k;

const DOMAIN_HARD_GATE = CONFIG.domain.hard_gate;
const DOMAIN_SOFT_PENALTY = CONFIG.domain.soft_penalty;

const W_FINAL_BM25 = CONFIG.final_weights.bm25;
const W_FINAL_W2V = CONFIG.final_weights.w2v;

console.log(`Semantic provider: ${CONFIG.semantic.provider} url=${CONFIG.semantic.ollama_url} model=${CONFIG.semantic.model}`);
console.log(`Word2Vec path:  ${CONFIG.word2vec.path}`);
console.log(`Ks: sem=${K_SEM} w2v=${K_W2V} bm25=${K_BM25}`);
console.log(`W2V min coverage: ${CONFIG.pipeline.w2v_min_coverage}`);
console.log(`Final weights: bm25=${W_FINAL_BM25} w2v=${W_FINAL_W2V}`);
console.log(`BM25 softnorm: s/(s+${BM25_K})`);
console.log(`Lexical stemming: ${CONFIG.lexical.stem_enabled ? "ON" : "OFF"}`);
help();

// -------- Sentence embedder (Ollama / Nomic) --------
const sentEmbedder = await buildSentenceEmbedder({
  ollamaUrl: CONFIG.semantic.ollama_url,
  model: CONFIG.semantic.model
});

// -------- Word2Vec model --------
const w2vModel = buildWord2VecModel({
  path: CONFIG.word2vec.path,
  limit: CONFIG.word2vec.limit
});
console.log("\nLoading Word2Vec vectors...\n");
await w2vModel.load();
console.log(`Word2Vec loaded. dim=${w2vModel.dim} vocab=${w2vModel.vectors.size}\n`);

// -------- Precompute anchor vectors --------
console.log("Embedding anchors (Nomic sentence embeddings via Ollama)...\n");
const anchorSentVecs = [];
for (const t of anchorSemTexts) anchorSentVecs.push(await sentEmbedder.embed(t));

console.log("Vectorizing anchors (word2vec avg)...\n");
const anchorW2VVecs = anchorW2VTexts.map(t => sentToW2VVec(t, w2vModel));

console.log("Ready.\n");

function listConcerns() {
  for (const c of CONCERNS) {
    const dom = toDomainsArray(c);
    console.log(`${c.id}  |  anchors=${c.anchors.length}  |  domains=${dom.join(",")}`);
  }
}

// ------------------ CLI Loop ------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
rl.prompt();

rl.on("line", async (line) => {
  const inputRaw = line.trim();
  if (!inputRaw) return rl.prompt();

  try {
    if (inputRaw === ":exit") return rl.close();

    if (inputRaw === ":list") {
      listConcerns();
      return rl.prompt();
    }

    if (inputRaw.startsWith(":topk ")) {
      const n = Number(inputRaw.slice(6).trim());
      if (Number.isFinite(n) && n > 0) TOPK = Math.floor(n);
      console.log("topk =", TOPK);
      return rl.prompt();
    }

    if (inputRaw.startsWith(":ksem ")) {
      const n = Number(inputRaw.slice(6).trim());
      if (Number.isFinite(n) && n > 0) K_SEM = Math.floor(n);
      console.log("ksem =", K_SEM);
      return rl.prompt();
    }

    if (inputRaw.startsWith(":kw2v ")) {
      const n = Number(inputRaw.slice(6).trim());
      if (Number.isFinite(n) && n > 0) K_W2V = Math.floor(n);
      console.log("kw2v =", K_W2V);
      return rl.prompt();
    }

    if (inputRaw.startsWith(":kbm25 ")) {
      const n = Number(inputRaw.slice(7).trim());
      if (Number.isFinite(n) && n > 0) K_BM25 = Math.floor(n);
      console.log("kbm25 =", K_BM25);
      return rl.prompt();
    }

    if (inputRaw.startsWith(":minrel ")) {
      const x = Number(inputRaw.slice(8).trim());
      if (Number.isFinite(x) && x >= 0 && x <= 1) MIN_RELEVANCE = x;
      console.log("min_relevance =", MIN_RELEVANCE);
      return rl.prompt();
    }

    if (inputRaw.startsWith(":mingap ")) {
      const x = Number(inputRaw.slice(8).trim());
      if (Number.isFinite(x) && x >= 0 && x <= 1) MIN_GAP = x;
      console.log("min_gap =", MIN_GAP);
      return rl.prompt();
    }

    // Three normalized views of query
    const qSemText = normalizeSemantic(inputRaw);
    const qW2VText = normalizeW2V(inputRaw);
    const qLexText = normalizeLexical(inputRaw, { stemEnabled: CONFIG.lexical.stem_enabled });

    // Domain detection (semantic-normalized)
    const detected = detectDomains(qSemText);
    const allowedDomains = new Set(
      Object.entries(detected)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    );
    const anyDomainDetected = allowedDomains.size > 0;

    // Candidate concerns via domain hard gate
    let candidateConcerns = CONCERNS;
    if (anyDomainDetected && DOMAIN_HARD_GATE) {
      const filtered = CONCERNS.filter(c => {
        const doms = toDomainsArray(c);
        return doms.length === 0 || intersects(doms, allowedDomains);
      });
      candidateConcerns = filtered.length ? filtered : CONCERNS;
    }

    // ---------------- Stage 0: Sentence embeddings -> top K_SEM anchors ----------------
    const qSent = await sentEmbedder.embed(qSemText);
    const semScores = anchorSentVecs.map(v => clamp01(cosine(qSent, v)));

    let semIdx = semScores
      .map((s, i) => ({ i, s }))
      .filter(x => x.s >= MIN_SEM_CAND)
      .sort((a, b) => b.s - a.s)
      .slice(0, Math.max(1, Math.min(K_SEM, semScores.length)));

    if (!semIdx.length) {
      semIdx = semScores
        .map((s, i) => ({ i, s }))
        .sort((a, b) => b.s - a.s)
        .slice(0, Math.max(1, Math.min(K_SEM, semScores.length)));
    }

    // ---------------- Stage 1: Word2Vec rerank/filter within candidates ----------------
    const cov = tokenCoverageW2V(qW2VText, w2vModel);
    const useW2V = cov >= CONFIG.pipeline.w2v_min_coverage;

    const qW2VVec = useW2V ? sentToW2VVec(qW2VText, w2vModel) : null;

    let w2vIdx = semIdx;
    const w2vScoresSparse = new Map();

    if (useW2V && qW2VVec && l2norm(qW2VVec) > 0) {
      const scored = semIdx.map(({ i, s: sem }) => {
        const w2v = clamp01(cosine(qW2VVec, anchorW2VVecs[i]));
        w2vScoresSparse.set(i, w2v);

        // reorder slightly: preserve semantic ordering, nudge with w2v
        const mix = 0.70 * sem + 0.30 * w2v;
        return { i, sem, w2v, mix };
      });

      w2vIdx = scored
        .sort((a, b) => b.mix - a.mix)
        .slice(0, Math.max(1, Math.min(K_W2V, scored.length)))
        .map(x => ({ i: x.i, s: x.sem }));
    } else {
      // just truncate semantic list
      w2vIdx = semIdx.slice(0, Math.max(1, Math.min(K_W2V, semIdx.length)));
    }

    // ---------------- Stage 2: BM25 rerank final within shortlist ----------------
    const bmCandidates = w2vIdx
      .slice(0, Math.max(1, Math.min(K_BM25, w2vIdx.length)))
      .map(({ i, s: sem }) => {
        const bm25 = bm25SoftNorm(bm25Score(qLexText, i, bm25Model), BM25_K);
        const w2v = useW2V
          ? (w2vScoresSparse.get(i) ?? clamp01(cosine(qW2VVec, anchorW2VVecs[i])))
          : 0;

        const finalAnchorScore = clamp01(W_FINAL_BM25 * bm25 + W_FINAL_W2V * w2v);
        return { i, sem, w2v, bm25, finalAnchorScore };
      })
      .sort((a, b) => b.finalAnchorScore - a.finalAnchorScore);

    // Build arrays for pooling (only shortlisted anchors non-zero)
    const anchorFinal = new Array(anchorDocs.length).fill(0);
    const anchorSem = new Array(anchorDocs.length).fill(0);
    const anchorW2V = new Array(anchorDocs.length).fill(0);
    const anchorBm25 = new Array(anchorDocs.length).fill(0);

    for (const c of bmCandidates) {
      anchorFinal[c.i] = c.finalAnchorScore;
      anchorSem[c.i] = c.sem;
      anchorW2V[c.i] = c.w2v;
      anchorBm25[c.i] = c.bm25;
    }

    const bestFinal = maxPoolToConcerns(anchorFinal, anchorDocs, CONCERNS);
    const bestSem = maxPoolToConcerns(anchorSem, anchorDocs, CONCERNS);
    const bestW2V = maxPoolToConcerns(anchorW2V, anchorDocs, CONCERNS);
    const bestBm = maxPoolToConcerns(anchorBm25, anchorDocs, CONCERNS);

    // Concern results (+ soft domain penalty)
    let resultsAll = candidateConcerns.map((c) => {
      const f = bestFinal.get(c.id);
      const s = bestSem.get(c.id);
      const w = bestW2V.get(c.id);
      const b = bestBm.get(c.id);

      let score = clamp01(f?.score ?? 0);

      if (anyDomainDetected) {
        const doms = toDomainsArray(c);
        const has = doms.length === 0 ? true : intersects(doms, allowedDomains);
        if (!has) score = clamp01(score * DOMAIN_SOFT_PENALTY);
      }

      const semPickIdx = s?.idx ?? -1;
      const bmPickIdx = b?.idx ?? -1;

      return {
        id: c.id,
        score,
        parts: {
          sem: clamp01(s?.score ?? 0),
          w2v: clamp01(w?.score ?? 0),
          bm25: clamp01(b?.score ?? 0),
          w2v_used: useW2V
        },
        matched_sem: semPickIdx >= 0 ? anchorDocs[semPickIdx].text : "",
        matched_bm25: bmPickIdx >= 0 ? anchorDocs[bmPickIdx].text : ""
      };
    });

    const results = resultsAll.sort((a, b) => b.score - a.score).slice(0, TOPK);
    const decision = decide(results, MIN_RELEVANCE, MIN_GAP);

    console.log(`\nInput: ${inputRaw}`);
    console.log(`SemText: ${qSemText}`);
    console.log(`W2VText: ${qW2VText}  (coverage=${cov.toFixed(2)} used=${useW2V})`);
    console.log(`LexText: ${qLexText}`);
    console.log(`Domains: ${anyDomainDetected ? Array.from(allowedDomains).join(", ") : "(none detected)"}`);
    console.log(`Candidates: sem=${semIdx.length} -> w2v=${w2vIdx.length} -> bm25=${bmCandidates.length}`);
    console.log(`Decision: ${decision.label} (${decision.reason})`);
    console.log(`Gap: ${(decision.gap ?? 0).toFixed(4)}\n`);

    for (const r of results) {
      const p = r.parts;
      console.log(
        `${r.score.toFixed(4)}  ${r.id}\n` +
        `   sem_anchor:  ${r.matched_sem}\n` +
        `   bm25_anchor: ${r.matched_bm25}\n` +
        `   parts: sem=${p.sem.toFixed(4)} w2v=${p.w2v.toFixed(4)} bm25=${p.bm25.toFixed(4)} (w2v_used=${p.w2v_used})`
      );
    }
    console.log("");
  } catch (e) {
    console.error("Error:", e?.message ?? e);
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("bye");
  process.exit(0);
});
