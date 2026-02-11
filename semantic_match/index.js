// index.js (Semantic PRIMARY + BM25 SECONDARY; BM25 uses lemmatization+stemming)
//
// Updated to use the new model in:
//   concerns/seo_concerns.js  ->  export const SEO_CONCERNS = { nodes: [...] }
//
// Model notes:
// - Nodes are hierarchical (have id + parent + label)
// - Leaf concerns have:
//     - anchors: [ ... ]   (>=10, 15–30 words each)
//     - gate: { required_any: [...], secondary_any: [...] }
// - Non-leaf/theme nodes may have gate/clarify_question but NO anchors
//
// Keyword gating:
// - Remove domain_gate usage completely
// - Candidate LEAF concerns must pass:
//     matchAny(inputTokens, gate.required_any) AND matchAny(inputTokens, gate.secondary_any)
// - Matching uses normalize + lemma + stem (tokenizeLex)
//
// Adds fusion:
// - Amplify when BOTH semantic and BM25 are high (synergy via sqrt(sem*bm25))
// - De-amplify when they disagree (conflict penalty via |sem-bm25|)

import readline from "node:readline";

import { CONFIG } from "./config.js";
import { SEO_CONCERNS } from "./concerns/seo_concerns.js";
import { cosine } from "./cosine.js";
import { normalizeSemantic } from "./domain_normalize.js";
import { buildSentenceEmbedder } from "./sent_embed.js";

// ------------------ Helpers ------------------
function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function help() {
  console.log(`
Commands:
  (type any sentence)   rank concerns (semantic + BM25 hybrid; fusion in CONFIG.final_weights)
  :topk <n>             set top-k
  :minrel <x>           set min relevance threshold (0..1)
  :mingap <x>           set min gap threshold (0..1)
  :k <n>                set semantic anchor candidate K (top anchors considered)
  :w <a> <b>            set base weights live: a=semantic b=bm25 (normalized to sum=1)
  :list                 list concerns + anchor counts + gate sizes
  :exit                 quit
`.trim());
}

// Add this to index.js (minimal change):
// If decision is AMBIGUOUS and top2 shares the same parent as top1,
// return the THEME (parent) with top-2 children + a short clarifier.


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

// ------------------ Build leaf concerns from model ------------------
function isLeafNode(n) {
  return Array.isArray(n?.anchors) && n.anchors.length > 0;
}

const ALL_NODES = Array.isArray(SEO_CONCERNS?.nodes) ? SEO_CONCERNS.nodes : [];
const CONCERNS = ALL_NODES.filter(isLeafNode);

function buildNodeIndex(nodes) {
  const byId = new Map();
  for (const n of nodes || []) byId.set(n.id, n);
  return byId;
}

const NODE_INDEX = buildNodeIndex(ALL_NODES);

function getParentId(nodeId) {
  const n = NODE_INDEX.get(nodeId);
  return n?.parent || null;
}

function getNodeLabel(nodeId) {
  return NODE_INDEX.get(nodeId)?.label || nodeId;
}

function collapseAmbiguousToTheme(results, decision) {
  if (!results?.length || decision?.label !== "AMBIGUOUS" || results.length < 2) return null;

  const top1 = results[0];
  const top2 = results[1];

  const p1 = getParentId(top1.id);
  const p2 = getParentId(top2.id);

  if (!p1 || p1 !== p2) return null; // only collapse siblings

  const parentNode = NODE_INDEX.get(p1);
  const themeId = p1;

  // Prefer an existing clarify_question on the theme node if present
  const clarify =
  `Both signals detected: ${getNodeLabel(top1.id)} and ${getNodeLabel(top2.id)}. We’ll treat this as ${getNodeLabel(themeId)}.`;

  return {
    label: "THEME",
    theme_id: themeId,
    theme_label: getNodeLabel(themeId),
    children: [
      { id: top1.id, label: getNodeLabel(top1.id), score: top1.score },
      { id: top2.id, label: getNodeLabel(top2.id), score: top2.score }
    ],
    clarify
  };
}

// ------------------ Keyword Gate (lemma + stem aligned) ------------------
function tokensToSet(text) {
  return new Set(tokenizeLex(text)); // uses normalize + lemma + stem
}

function preprocessConcernKeywords(concern) {
  const reqA = concern?.gate?.required_any || [];
  const reqB = concern?.gate?.secondary_any || [];

  concern._reqATokens = new Set(reqA.flatMap((k) => tokenizeLex(k)));
  concern._reqBTokens = new Set(reqB.flatMap((k) => tokenizeLex(k)));
}

function keywordGate(inputRaw, concern) {
  const inputTokens = tokensToSet(inputRaw);

  const matchedA = [];
  const matchedB = [];

  for (const t of concern._reqATokens) {
    if (inputTokens.has(t)) matchedA.push(t);
  }
  for (const t of concern._reqBTokens) {
    if (inputTokens.has(t)) matchedB.push(t);
  }

  return {
    pass: matchedA.length > 0 && matchedB.length > 0,
    matched_required_any: matchedA,
    matched_secondary_any: matchedB
  };
}

// ------------------ BM25 preprocessing: normalize + lemma + stem ------------------

// Keep domain tokens stable (do NOT lemma/stem)
const PROTECTED_TOKENS = new Set([
  "ga4", "gtm", "gsc", "lcp", "fcp", "inp", "cls", "ttfb",
  "ctr", "cpc", "cpa", "cpl", "roas", "cpm",
  "http", "https", "ssl", "dns", "url", "urls", "serp", "sitemap",
  "404", "500", "502", "503", "5xx", "4xx"
]);

function normalizeLex(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\.\-\(\)]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// very small irregular lemma map (extend as needed)
const IRREGULAR_LEMMA = new Map([
  ["people", "person"],
  ["men", "man"],
  ["women", "woman"],
  ["children", "child"],
  ["indices", "index"],
  ["indexes", "index"],
  ["queries", "query"],
  ["pages", "page"],
  ["urls", "url"],
  ["errors", "error"],
  ["metrics", "metric"],
  ["conversions", "conversion"],
  ["clicks", "click"],
  ["impressions", "impression"],
  ["sessions", "session"],
  ["leads", "lead"],
  ["customers", "customer"],
  ["campaigns", "campaign"],
  ["rankings", "ranking"],
  ["backlinks", "backlink"]
]);

function lemmatizeToken(tok) {
  if (!tok) return tok;
  if (PROTECTED_TOKENS.has(tok)) return tok;
  const irr = IRREGULAR_LEMMA.get(tok);
  if (irr) return irr;

  if (tok.length > 4 && tok.endsWith("ies")) return tok.slice(0, -3) + "y";
  if (
    tok.length > 4 &&
    (tok.endsWith("sses") || tok.endsWith("xes") || tok.endsWith("ches") || tok.endsWith("shes"))
  ) return tok.slice(0, -2);

  if (tok.length > 3 && tok.endsWith("s") && !tok.endsWith("ss")) return tok.slice(0, -1);

  if (tok.length > 5 && tok.endsWith("ing")) {
    const base = tok.slice(0, -3);
    return base.endsWith(base.slice(-1) + base.slice(-1)) ? base.slice(0, -1) : base;
  }

  if (tok.length > 4 && tok.endsWith("ed")) {
    const base = tok.slice(0, -2);
    return base.endsWith(base.slice(-1) + base.slice(-1)) ? base.slice(0, -1) : base;
  }

  return tok;
}

// Porter-lite stemmer (minimal but useful for marketing text)
function stemToken(tok) {
  if (!tok) return tok;
  if (PROTECTED_TOKENS.has(tok)) return tok;
  if (tok.length <= 3) return tok;

  let t = tok;

  const rules = [
    ["ization", "ize"],
    ["ational", "ate"],
    ["fulness", "ful"],
    ["ousness", "ous"],
    ["iveness", "ive"],
    ["tional", "tion"],
    ["biliti", "ble"],
    ["lessli", "less"],
    ["entli", "ent"],
    ["ation", "ate"],
    ["ator", "ate"],
    ["alism", "al"],
    ["aliti", "al"],
    ["ousli", "ous"],
    ["iviti", "ive"],
    ["enci", "ence"],
    ["anci", "ance"],
    ["izer", "ize"],
    ["abli", "able"],
    ["alli", "al"],
    ["eli", "e"],
    ["li", ""]
  ];

  for (const [suf, rep] of rules) {
    if (t.length > suf.length + 2 && t.endsWith(suf)) {
      t = t.slice(0, -suf.length) + rep;
      return t;
    }
  }

  if (t.length > 5 && t.endsWith("ment")) return t.slice(0, -4);
  if (t.length > 4 && t.endsWith("ness")) return t.slice(0, -4);
  if (t.length > 4 && t.endsWith("able")) return t.slice(0, -4);
  if (t.length > 4 && t.endsWith("ible")) return t.slice(0, -4);
  if (t.length > 4 && t.endsWith("tion")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("sion")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 3 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("ly")) return t.slice(0, -2);

  return t;
}

function preprocessToken(tok) {
  let t = tok;
  if (CONFIG?.lexical?.lemmatization_enabled) t = lemmatizeToken(t);
  if (CONFIG?.lexical?.stemming_enabled) t = stemToken(t);
  return t;
}

function tokenizeLex(s) {
  const t = normalizeLex(s);
  if (!t) return [];

  return t
    .split(" ")
    .filter(Boolean)
    .map(preprocessToken)
    .filter(Boolean)
    // remove single-letter junk from contractions: "don t", "isn t"
    .filter(tok => tok.length > 1 || /^[0-9]+$/.test(tok) || /^[45]xx$/.test(tok))
}


// ------------------ BM25 implementation ------------------
function buildBm25(docs, { k1 = 1.2, b = 0.75 } = {}) {
  const N = docs.length;

  const docLen = new Array(N);
  const tf = new Array(N);
  const df = new Map();

  let totalLen = 0;

  for (let i = 0; i < N; i++) {
    const tokens = tokenizeLex(docs[i].text);
    docLen[i] = tokens.length;
    totalLen += docLen[i];

    const m = new Map();
    for (const tok of tokens) m.set(tok, (m.get(tok) || 0) + 1);
    tf[i] = m;

    for (const tok of new Set(tokens)) df.set(tok, (df.get(tok) || 0) + 1);
  }

  const avgdl = N ? totalLen / N : 0;

  function idf(term) {
    const n = df.get(term) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  }

  function score(query, docIndex) {
    const qTokens = tokenizeLex(query);
    if (qTokens.length === 0) return 0;

    const freqs = tf[docIndex];
    const dl = docLen[docIndex] || 0;
    if (!dl || !avgdl) return 0;

    let s = 0;
    for (const term of qTokens) {
      const f = freqs.get(term) || 0;
      if (!f) continue;
      const termIdf = idf(term);
      const denom = f + k1 * (1 - b + b * (dl / avgdl));
      s += termIdf * ((f * (k1 + 1)) / denom);
    }
    return s;
  }

  return { score, docs, avgdl, k1, b };
}

// BM25 raw score -> [0,1]
function bm25To01(s) {
  const k = CONFIG?.bm25?.softnorm_k ?? 6.0;
  return clamp01(s / (s + k));
}

// ------------------ Build anchor docs (LEAF only) ------------------
function buildAnchorDocs() {
  const docs = [];
  for (const c of CONCERNS) {
    for (const a of c.anchors) docs.push({ concernId: c.id, text: a });
  }
  return docs;
}

const anchorDocs = buildAnchorDocs();
const anchorSemTexts = anchorDocs.map((d) => normalizeSemantic(d.text));

const bm25 = buildBm25(
  anchorDocs.map((d, i) => ({ id: i, text: d.text, meta: d })),
  { k1: CONFIG?.bm25?.k1 ?? 1.2, b: CONFIG?.bm25?.b ?? 0.75 }
);

// Semantic MAX pool
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

// Best BM25 per concern
function bestBm25ByConcern(query, anchorDocs, concerns) {
  const best = new Map();
  for (let i = 0; i < anchorDocs.length; i++) {
    const sRaw = bm25.score(query, i);
    if (sRaw <= 0) continue;
    const cid = anchorDocs[i].concernId;
    const cur = best.get(cid);
    if (!cur || sRaw > cur.score) best.set(cid, { score: sRaw, idx: i });
  }
  for (const c of concerns) if (!best.has(c.id)) best.set(c.id, { score: 0, idx: -1 });
  return best;
}

// Filtered-out tokens BM25 query
function buildBm25QueryFromFilteredOut(inputRaw, qSemText) {
  const rawTokens = new Set(tokenizeLex(inputRaw));
  const semTokens = new Set(tokenizeLex(qSemText));

  const removed = [];
  for (const t of rawTokens) if (!semTokens.has(t)) removed.push(t);

  // If the "filtered out" query is too short / too lossy, just use the normalized raw input.
  if (removed.length < 3) return normalizeLex(inputRaw);

  return removed.join(" ");
}


// ------------------ Fusion (synergy + conflict penalty) ------------------
function normalizeWeights2(a, b) {
  const x = Number(a);
  const y = Number(b);
  const sum = (Number.isFinite(x) ? x : 0) + (Number.isFinite(y) ? y : 0);
  if (sum <= 0) return { a: 1, b: 0 };
  return { a: x / sum, b: y / sum };
}

function normalizeBaseWeights() {
  const n = normalizeWeights2(W_SEM, W_BM25);
  W_SEM = n.a;
  W_BM25 = n.b;
}

function fusedScore(sem01, bm2501) {
  // base blend
  let s = W_SEM * sem01 + W_BM25 * bm2501;

  // synergy (only helps when both are high)
  const alpha = CONFIG?.fusion?.alpha ?? 0.20; // 0..1
  const synergy = Math.sqrt(sem01 * bm2501);

  // conflict penalty (hurts when they disagree)
  const beta = CONFIG?.fusion?.beta ?? 0.15; // 0..1
  const conflict = Math.abs(sem01 - bm2501);

  s = s + alpha * synergy - beta * conflict;
  return clamp01(s);
}

// ------------------ Preprocess gates ------------------
for (const c of CONCERNS) preprocessConcernKeywords(c);

// ------------------ Startup ------------------
console.log("Concern Ranker (SEO model; Semantic PRIMARY + BM25 SECONDARY; Keyword gates; BM25 lemma+stem + fusion)");
console.log(`Nodes in model: ${ALL_NODES.length}`);
console.log(`Leaf Concerns:  ${CONCERNS.length}`);
console.log(`Anchors:        ${anchorDocs.length}`);

let TOPK = CONFIG?.decision?.topk ?? 5;
let MIN_RELEVANCE = CONFIG?.decision?.min_relevance ?? 0.45;
let MIN_GAP = CONFIG?.decision?.min_gap ?? 0.05;

let K = CONFIG?.pipeline?.k_sem ?? 200;
const MIN_SEM_CAND = CONFIG?.semantic?.min_candidate ?? 0.0;

// Base weights (editable live)
let W_SEM = CONFIG?.final_weights?.semantic ?? 0.85;
let W_BM25 = CONFIG?.final_weights?.bm25 ?? 0.15;
normalizeBaseWeights();

console.log(`Semantic provider: ${CONFIG.semantic.provider} url=${CONFIG.semantic.ollama_url} model=${CONFIG.semantic.model}`);
console.log(`K anchors: ${K} (0 = all)  min_sem_candidate=${MIN_SEM_CAND}`);
console.log(`BM25: k1=${bm25.k1} b=${bm25.b} softnorm_k=${CONFIG?.bm25?.softnorm_k ?? 6.0}`);
console.log(`Lexical: lemma=${!!CONFIG?.lexical?.lemmatization_enabled} stem=${!!CONFIG?.lexical?.stemming_enabled}`);
console.log(`Weights: semantic=${W_SEM.toFixed(2)} bm25=${W_BM25.toFixed(2)} `);
console.log(`Fusion: alpha=${CONFIG?.fusion?.alpha ?? 0.20} beta=${CONFIG?.fusion?.beta ?? 0.15}`);
help();

// Sentence embedder (Ollama / Nomic)
const sentEmbedder = await buildSentenceEmbedder({
  ollamaUrl: CONFIG.semantic.ollama_url,
  model: CONFIG.semantic.model
});

// Precompute anchor embeddings
console.log("\nEmbedding all anchors (Nomic via Ollama)...\n");
const anchorVecs = [];
for (const t of anchorSemTexts) anchorVecs.push(await sentEmbedder.embed(t));
console.log("Ready.\n");

function listConcerns() {
  for (const c of CONCERNS) {
    const a = Array.isArray(c?.gate?.required_any) ? c.gate.required_any.length : 0;
    const b = Array.isArray(c?.gate?.secondary_any) ? c.gate.secondary_any.length : 0;
    console.log(`${c.id}  |  anchors=${c.anchors.length}  |  gate.required_any=${a}  gate.secondary_any=${b}`);
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

    if (inputRaw.startsWith(":k ")) {
      const n = Number(inputRaw.slice(3).trim());
      if (Number.isFinite(n) && n >= 0) K = Math.floor(n);
      console.log("K (anchors) =", K);
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

    if (inputRaw.startsWith(":w ")) {
      const parts = inputRaw.slice(3).trim().split(/\s+/);
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0) {
        W_SEM = a; W_BM25 = b; normalizeBaseWeights();
        console.log(`base weights set: semantic=${W_SEM.toFixed(2)} bm25=${W_BM25.toFixed(2)} (normalized)`);
      } else {
        console.log("Usage: :w <semantic> <bm25>   (both >= 0)");
      }
      return rl.prompt();
    }

    // Semantic normalization for embeddings
    const qSemText = normalizeSemantic(inputRaw);

    // BM25 query from tokens filtered out by normalizeSemantic()
    const qBm25Text = buildBm25QueryFromFilteredOut(inputRaw, qSemText);

    // ------------------ Keyword gating (model gate) ------------------
    const gateInfoById = new Map();
    const gated = [];

    for (const c of CONCERNS) {
      const g = keywordGate(inputRaw, c);
      gateInfoById.set(c.id, g);
      if (g.pass) gated.push(c);
    }

    // If NOTHING passes gate, fall back to all concerns (so system still returns something)
    const candidateConcerns = gated.length ? gated : CONCERNS;
    const usedFallback = gated.length === 0;

    // Embed query
    const qVec = await sentEmbedder.embed(qSemText);

    // Semantic anchor scoring
    const semScoresAll = anchorVecs.map((v) => clamp01(cosine(qVec, v)));

    // Optional semantic top-K before pooling
    let semAnchorScores = semScoresAll;
    if (K > 0 && K < semScoresAll.length) {
      const top = semScoresAll
        .map((s, i) => ({ i, s }))
        .filter((x) => x.s >= MIN_SEM_CAND)
        .sort((a, b) => b.s - a.s)
        .slice(0, K);

      semAnchorScores = new Array(semScoresAll.length).fill(0);
      for (const x of top) semAnchorScores[x.i] = x.s;
    }

    // Pool per concern (leaf)
    const bestSem = maxPoolToConcerns(semAnchorScores, anchorDocs, CONCERNS);
    const bestBm25 = bestBm25ByConcern(qBm25Text, anchorDocs, CONCERNS);

    // Build results
    const resultsAll = candidateConcerns.map((c) => {
      const pickSem = bestSem.get(c.id);
      const semScore = clamp01(pickSem?.score ?? 0);
      const idxSem = pickSem?.idx ?? -1;

      const pickB = bestBm25.get(c.id);
      const bm25Raw = pickB?.score ?? 0;
      const bm25Score01 = bm25To01(bm25Raw);
      const idxB = pickB?.idx ?? -1;

      const score = fusedScore(semScore, bm25Score01);

      return {
        id: c.id,
        score,
        sem: semScore,
        bm25: bm25Score01,
        sem_anchor: idxSem >= 0 ? anchorDocs[idxSem].text : "",
        bm25_anchor: idxB >= 0 ? anchorDocs[idxB].text : "",
        bm25_query: qBm25Text
      };
    });

    const results = resultsAll.sort((a, b) => b.score - a.score).slice(0, TOPK);
    const decision = decide(results, MIN_RELEVANCE, MIN_GAP);

    console.log(`\nInput: ${inputRaw}`);
    console.log(`SemText: ${qSemText}`);
    console.log(`BM25Query(filtered): ${qBm25Text || "(empty)"}`);
    console.log(`KeywordGate: candidates=${candidateConcerns.length}/${CONCERNS.length} ${usedFallback ? "(fallback=ALL)" : ""}`);
    console.log(`Weights: semantic=${W_SEM.toFixed(2)} bm25=${W_BM25.toFixed(2)}`);
    const themeCollapse = collapseAmbiguousToTheme(results, decision);

    if (themeCollapse) {
      console.log(`Decision: THEME (collapsed from AMBIGUOUS: siblings under ${themeCollapse.theme_id})`);
      console.log(`Theme: ${themeCollapse.theme_id}  (${themeCollapse.theme_label})`);
      console.log(
        `Children: ` +
        `${themeCollapse.children[0].score.toFixed(4)} ${themeCollapse.children[0].id}, ` +
        `${themeCollapse.children[1].score.toFixed(4)} ${themeCollapse.children[1].id}`
      );
      console.log(`Clarifier: ${themeCollapse.clarify}`);
    } else {
      console.log(`Decision: ${decision.label} (${decision.reason})`);
    }

    console.log(`Gap: ${(decision.gap ?? 0).toFixed(4)}\n`);

    for (const r of results) {
      const g = gateInfoById.get(r.id) || { pass: true, matched_required_any: [], matched_secondary_any: [] };
      console.log(
        `${r.score.toFixed(4)}  ${r.id}\n` +
        `   gate_pass: ${g.pass}\n` +
        `   gateA_match(tokens): ${g.matched_required_any.slice(0, 10).join(", ")}${g.matched_required_any.length > 10 ? " ..." : ""}\n` +
        `   gateB_match(tokens): ${g.matched_secondary_any.slice(0, 10).join(", ")}${g.matched_secondary_any.length > 10 ? " ..." : ""}\n` +
        `   sem_score:   ${r.sem.toFixed(4)}\n` +
        `   sem_anchor:  ${r.sem_anchor}\n` +
        `   bm25_score:  ${r.bm25.toFixed(4)}\n` +
        `   bm25_anchor: ${r.bm25_anchor}`
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
