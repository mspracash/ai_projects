// index.js (Semantic PRIMARY + BM25 SECONDARY)
// + Stopword stripping
// + Proper lemmatizer (wink-lemmatizer)
// + Semantic Canonicalization for BM25 synonyms (built with NO STEM; pairwise cosine clustering)
// + BM25 stemming ENABLED (and applied carefully in the correct order)
//
// Model notes:
// - Nodes are hierarchical (have id + parent + label)
// - Leaf concerns have anchors
// - Gates disabled: all leaf concerns considered
//
// CRITICAL ORDERING (BM25):
//   normalize → lemma → stopword strip → canonicalize → stem → final filters
//
// CRITICAL ORDERING (Canonical map build):
//   normalize → lemma → stopword strip → final filters   (NO STEM)
//
// CRITICAL ORDERING ("neutral tokenizer" used only for normalizeSemantic delta):
//   normalize → lemma → minimal filters   (NO stopwords/canon/stem)

import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";

import stopwordPkg from "stopword"; // robust across versions
import Snowball from "snowball-stemmers";
import lemmatizer from "wink-lemmatizer";

import { CONFIG } from "./config.js";
import { SEO_CONCERNS } from "./concerns/seo_concerns.js";
import { cosine } from "./cosine.js";
import { normalizeSemantic } from "./domain_normalize.js";
import { buildSentenceEmbedder } from "./sent_embed.js";

const stemmer = Snowball.newStemmer("english");

// ------------------ Stopword compatibility ------------------
// "stopword" package exports vary by version; normalize.
const removeStopwords =
  stopwordPkg?.removeStopwords ||
  stopwordPkg?.default?.removeStopwords ||
  stopwordPkg?.default ||
  stopwordPkg;

const ENG_STOPWORDS =
  stopwordPkg?.eng ||
  stopwordPkg?.default?.eng ||
  stopwordPkg?.english ||
  stopwordPkg?.default?.english ||
  [];

// ------------------ Helpers ------------------
function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function help() {
  console.log(
    `
Commands:
  (type any sentence)   rank concerns (semantic + BM25 hybrid; fusion in CONFIG.final_weights)
  :topk <n>             set top-k
  :minrel <x>           set min relevance threshold (0..1)
  :mingap <x>           set min gap threshold (0..1)
  :k <n>                set semantic anchor candidate K (top anchors considered)
  :w <a> <b>            set base weights live: a=semantic b=bm25 (normalized to sum=1)
  :list                 list concerns + anchor counts
  :exit                 quit
`.trim()
  );
}

function decide(results, MIN_RELEVANCE, MIN_GAP) {
  if (!results?.length) return { label: "NO_CONCERNS", reason: "no results" };
  if (results.length === 1) return { label: "CONCERN", gap: 1, reason: "single result" };

  const top1 = results[0];
  const top2 = results[1];
  const gap = (top1?.score ?? 0) - (top2?.score ?? 0);

  if ((top1?.score ?? 0) < MIN_RELEVANCE) {
    return {
      label: "NON_CONCERN",
      gap,
      reason: `top1 < min_relevance (${(top1?.score ?? 0).toFixed(4)} < ${MIN_RELEVANCE})`,
    };
  }
  if (gap < MIN_GAP) {
    return {
      label: "AMBIGUOUS",
      gap,
      reason: `gap < min_gap (${gap.toFixed(4)} < ${MIN_GAP})`,
    };
  }
  return { label: "CONCERN", gap, reason: "passes thresholds" };
}

// ------------------ Build leaf concerns from model ------------------
function isLeafNode(n) {
  return Array.isArray(n?.anchors) && n.anchors.length > 0;
}

const ALL_NODES = Array.isArray(SEO_CONCERNS?.nodes) ? SEO_CONCERNS.nodes : [];
const LEAF_CONCERNS = ALL_NODES.filter(isLeafNode);

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

  if (!p1 || p1 !== p2) return null;

  const themeId = p1;
  const themeNode = NODE_INDEX.get(themeId);

  const clarify =
    (themeNode?.clarify_question && String(themeNode.clarify_question)) ||
    `Both signals detected: ${getNodeLabel(top1.id)} and ${getNodeLabel(top2.id)}. We’ll treat this as ${getNodeLabel(
      themeId
    )}.`;

  return {
    label: "THEME",
    theme_id: themeId,
    theme_label: getNodeLabel(themeId),
    children: [
      { id: top1.id, label: getNodeLabel(top1.id), score: top1.score },
      { id: top2.id, label: getNodeLabel(top2.id), score: top2.score },
    ],
    clarify,
  };
}

// ------------------ Lexical config ------------------

// Keep domain tokens stable (do NOT lemma/canonicalize/stem)
const PROTECTED_TOKENS = new Set([
  "ga4",
  "gtm",
  "gsc",
  "lcp",
  "fcp",
  "inp",
  "cls",
  "ttfb",
  "ctr",
  "cpc",
  "cpa",
  "cpl",
  "roas",
  "cpm",
  "http",
  "https",
  "ssl",
  "dns",
  "url",
  "urls",
  "serp",
  "sitemap",
  "404",
  "500",
  "502",
  "503",
  "5xx",
  "4xx",
]);

// Short but meaningful tokens we want to keep
const KEEP_SHORT = new Set(["no", "not"]);

// Stopwords: strip common words but KEEP negation
const STOPWORDS = Array.isArray(ENG_STOPWORDS) ? ENG_STOPWORDS.filter((w) => w !== "no" && w !== "not") : [];
function stripStopwords(tokens) {
  if (typeof removeStopwords !== "function") return tokens; // safety fallback
  return removeStopwords(tokens, STOPWORDS);
}

function normalizeLex(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\.\-\(\)]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lemmatizeToken(tok) {
  if (!tok) return tok;
  if (PROTECTED_TOKENS.has(tok)) return tok;

  // wink-lemmatizer: try noun → verb → adjective fallback
  let t = lemmatizer.noun(tok);
  if (t === tok) t = lemmatizer.verb(tok);
  if (t === tok) t = lemmatizer.adjective(tok);
  return t;
}

function keepToken(tok) {
  // keep >=3, or negation, or numbers, or status buckets like 4xx/5xx
  return tok.length >= 3 || KEEP_SHORT.has(tok) || /^[0-9]+$/.test(tok) || /^[45]xx$/.test(tok);
}

// ------------------ Semantic Canonicalization (NO STEM during build; pairwise comparisons) ------------------

const SEMCAN = {
  enabled: !!CONFIG?.lexical?.semantic_canonical_enabled,
  threshold: CONFIG?.lexical?.semantic_canonical_threshold ?? 0.82,
  min_df: CONFIG?.lexical?.semantic_canonical_min_df ?? 1,
  cache_path: CONFIG?.lexical?.semantic_canonical_cache_path ?? "./.cache/seo_token_canon.json",
};

// runtime canonical map (token -> canonical token) in LEMMA SPACE (no stems)
let CANON_MAP = null;

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function tryLoadCanonMap(cachePath) {
  try {
    if (!cachePath || !fs.existsSync(cachePath)) return null;
    const j = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (!j || !j.map || typeof j.map !== "object") return null;
    return new Map(Object.entries(j.map));
  } catch {
    return null;
  }
}

function saveCanonMap(cachePath, canonMap, meta = {}) {
  try {
    if (!cachePath) return;
    ensureDir(cachePath);
    const obj = { meta, map: Object.fromEntries(canonMap.entries()) };
    fs.writeFileSync(cachePath, JSON.stringify(obj, null, 2), "utf8");
  } catch {
    // ignore cache write errors
  }
}

// Canon build tokenization: normalize → lemma → stopwords → keepToken  (NO STEM)
function tokenizeLexForCanonical(s) {
  const t = normalizeLex(s);
  if (!t) return [];

  let tokens = t
    .split(" ")
    .filter(Boolean)
    .map((tok) => (CONFIG?.lexical?.lemmatization_enabled ? lemmatizeToken(tok) : tok))
    .filter(Boolean);

  tokens = stripStopwords(tokens);
  tokens = tokens.filter(keepToken);
  tokens = tokens.filter((tok) => !PROTECTED_TOKENS.has(tok));

  return tokens;
}

function buildTokenDfFromAnchors(anchorDocs_) {
  const df = new Map();
  for (const d of anchorDocs_) {
    const toks = tokenizeLexForCanonical(d.text);
    for (const tok of new Set(toks)) df.set(tok, (df.get(tok) || 0) + 1);
  }
  return df;
}

function buildCanonicalVocab(anchorDocs_, { minDf }) {
  const df = buildTokenDfFromAnchors(anchorDocs_);
  const items = [];

  for (const [tok, n] of df.entries()) {
    if (!tok) continue;
    if (n < (minDf ?? 1)) continue;
    items.push({ tok, df: n });
  }

  items.sort((a, b) => b.df - a.df);

  // NO CAP: cover all words in anchors after filtering
  const vocab = items.map((x) => x.tok);
  const dfMap = new Map(items.map((x) => [x.tok, x.df]));
  return { vocab, dfMap };
}

function chooseCanonical(cluster, dfMap) {
  // prefer highest df; tie-break shorter token
  let best = cluster[0];
  let bestDf = dfMap.get(best) || 0;

  for (const t of cluster) {
    const d = dfMap.get(t) || 0;
    if (d > bestDf) {
      best = t;
      bestDf = d;
    } else if (d === bestDf && t.length < best.length) {
      best = t;
    }
  }
  return best;
}

async function buildSemanticCanonicalMap(sentEmbedder_, anchorDocs_, opts) {
  const { threshold, minDf, cachePath } = opts;

  const cached = tryLoadCanonMap(cachePath);
  if (cached) return cached;

  const { vocab, dfMap } = buildCanonicalVocab(anchorDocs_, { minDf });

  // embed tokens (lemma-space, no stems)
  const vecs = new Map();
  for (const tok of vocab) vecs.set(tok, await sentEmbedder_.embed(tok));

  // pairwise greedy clustering (O(n^2))
  const used = new Set();
  const canonMap = new Map();

  for (let i = 0; i < vocab.length; i++) {
    const t1 = vocab[i];
    if (used.has(t1)) continue;

    const cluster = [t1];
    used.add(t1);

    const v1 = vecs.get(t1);

    for (let j = i + 1; j < vocab.length; j++) {
      const t2 = vocab[j];
      if (used.has(t2)) continue;

      const v2 = vecs.get(t2);
      const sim = clamp01(cosine(v1, v2));
      if (sim >= threshold) {
        cluster.push(t2);
        used.add(t2);
      }
    }

    const canon = chooseCanonical(cluster, dfMap);
    for (const t of cluster) canonMap.set(t, canon);
  }

  saveCanonMap(cachePath, canonMap, {
    threshold,
    minDf,
    vocabSize: vocab.length,
    createdAt: new Date().toISOString(),
  });

  return canonMap;
}

// ------------------ BM25 tokenization (STEMMING ENABLED; correct order) ------------------
//
// normalize → lemma → stopword strip → canonicalize → stem → keepToken
//
// Notes:
// - Canonical map is in lemma-space; apply BEFORE stemming.
// - Stopword stripping must happen BEFORE stemming (otherwise stopwords may not match).
//
function tokenizeLex(s) {
  const t = normalizeLex(s);
  if (!t) return [];

  // 1) lemma
  let tokens = t
    .split(" ")
    .filter(Boolean)
    .map((tok) => (CONFIG?.lexical?.lemmatization_enabled ? lemmatizeToken(tok) : tok))
    .filter(Boolean);

  // 2) stopwords
  tokens = stripStopwords(tokens);

  // 3) keepToken pre-filter
  tokens = tokens.filter(keepToken);

  // 4) canonicalize (lemma-space)
  if (SEMCAN.enabled && CANON_MAP) {
    tokens = tokens.map((tok) => {
      if (!tok) return tok;
      if (PROTECTED_TOKENS.has(tok)) return tok;
      if (KEEP_SHORT.has(tok)) return tok;
      return CANON_MAP.get(tok) || tok;
    });
  }

  // 5) stem (BM25 only)
  if (CONFIG?.lexical?.stemming_enabled) {
    tokens = tokens.map((tok) => {
      if (!tok) return tok;
      if (PROTECTED_TOKENS.has(tok)) return tok;
      if (KEEP_SHORT.has(tok)) return tok;
      return stemmer.stem(tok);
    });
  }

  // 6) final keepToken
  tokens = tokens.filter(Boolean).filter(keepToken);

  return tokens;
}

// "Neutral" tokenizer used ONLY for buildBm25QueryFromFilteredOut()
// Purpose: isolate the effect of normalizeSemantic() without stopwords/canon/stem.
function tokenizeLexNeutral(s) {
  const t = normalizeLex(s);
  if (!t) return [];

  let tokens = t
    .split(" ")
    .filter(Boolean)
    .map((tok) => (CONFIG?.lexical?.lemmatization_enabled ? lemmatizeToken(tok) : tok))
    .filter(Boolean);

  // minimal filters only
  tokens = tokens.filter(keepToken);

  return tokens;
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
  for (const c of LEAF_CONCERNS) {
    for (const a of c.anchors) docs.push({ concernId: c.id, text: a });
  }
  return docs;
}

// Semantic MAX pool
function maxPoolToConcerns(anchorScores, anchorDocs_, concerns) {
  const best = new Map();
  for (let i = 0; i < anchorScores.length; i++) {
    const cid = anchorDocs_[i].concernId;
    const s = anchorScores[i];
    const cur = best.get(cid);
    if (!cur || s > cur.score) best.set(cid, { score: s, idx: i });
  }
  for (const c of concerns) if (!best.has(c.id)) best.set(c.id, { score: 0, idx: -1 });
  return best;
}

// Best BM25 per concern
function bestBm25ByConcern(bm25_, query, anchorDocs_, concerns) {
  const best = new Map();
  for (let i = 0; i < anchorDocs_.length; i++) {
    const sRaw = bm25_.score(query, i);
    if (sRaw <= 0) continue;
    const cid = anchorDocs_[i].concernId;
    const cur = best.get(cid);
    if (!cur || sRaw > cur.score) best.set(cid, { score: sRaw, idx: i });
  }
  for (const c of concerns) if (!best.has(c.id)) best.set(c.id, { score: 0, idx: -1 });
  return best;
}

// Filtered-out tokens BM25 query (tokens removed by normalizeSemantic)
function buildBm25QueryFromFilteredOut(inputRaw, qSemText) {
  const rawTokens = new Set(tokenizeLexNeutral(inputRaw));
  const semTokens = new Set(tokenizeLexNeutral(qSemText));

  const removed = [];
  for (const t of rawTokens) if (!semTokens.has(t)) removed.push(t);

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

let W_SEM = CONFIG?.final_weights?.semantic ?? 0.85;
let W_BM25 = CONFIG?.final_weights?.bm25 ?? 0.15;

function normalizeBaseWeights() {
  const n = normalizeWeights2(W_SEM, W_BM25);
  W_SEM = n.a;
  W_BM25 = n.b;
}
normalizeBaseWeights();

function fusedScore(sem01, bm2501) {
  let s = W_SEM * sem01 + W_BM25 * bm2501;

  const alpha = CONFIG?.fusion?.alpha ?? 0.2;
  const synergy = Math.sqrt(sem01 * bm2501);

  const beta = CONFIG?.fusion?.beta ?? 0.15;
  const conflict = Math.abs(sem01 - bm2501);

  s = s + alpha * synergy - beta * conflict;
  return clamp01(s);
}

// ------------------ LLM final adjudication (phi4-mini) ------------------
async function ollamaChatJSON({ baseUrl, model, system, user, options, timeoutMs = 20000 }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${String(baseUrl || "").replace(/\/$/, "")}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        options: options ?? {},
        format: "json",
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Ollama chat error: ${res.status} ${msg}`);
    }

    const data = await res.json();
    const raw = data?.message?.content ?? "";
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`LLM returned non-JSON: ${String(raw).slice(0, 200)}`);
    }
  } finally {
    clearTimeout(t);
  }
}

function buildCandidatePacket(results, nodeIndex) {
  return results.map((r) => ({
    id: r.id,
    label: nodeIndex.get(r.id)?.label ?? r.id,
    score: Number(r.score.toFixed(4)),
    sem: Number(r.sem.toFixed(4)),
    bm25: Number(r.bm25.toFixed(4)),
    sem_anchor: r.sem_anchor,
    bm25_anchor: r.bm25_anchor,
  }));
}

function validateLLMChoice(out, allowIds) {
  if (!out || typeof out !== "object") return { ok: false, reason: "no object" };

  const decision = String(out.decision ?? "").toUpperCase();
  const rationale = String(out.rationale ?? "").trim();

  const wc = rationale ? rationale.split(/\s+/).filter(Boolean).length : 0;
  if (wc < 5 || wc > 20) return { ok: false, reason: "bad rationale length" };

  // enforce quotes exist in rationale (simple + cheap)
  if (!/["'“”]/.test(rationale)) return { ok: false, reason: "rationale must quote 1-2 exact input phrases" };

  if (decision === "CONCERN") {
    const id = String(out.final_id ?? "");
    if (!id || !allowIds.has(id)) return { ok: false, reason: "invalid final_id" };
    return { ok: true, kind: "CONCERN", id, rationale };
  }

  if (decision === "AMBIGUOUS") {
    return { ok: true, kind: "AMBIGUOUS", rationale };
  }

  return { ok: false, reason: "bad decision" };
}

async function llmFinalPick({ inputRaw, semText, resultsTopK, nodeIndex, config }) {
  const llm = config?.llm_final;
  if (!llm?.enabled) return { kind: "SKIP" };

  const candidates = buildCandidatePacket(resultsTopK, nodeIndex); // leaf only
  const allowIds = new Set(candidates.map((c) => c.id));

  const system = `
You are a strict SEO concern adjudicator (digital marketing / organic search).

Pick the single best matching LEAF concern from the candidate IDs provided.
Use ONLY those IDs. Do not invent IDs. Output JSON only. No extra text.

Rules:
- If a clear match exists: decision="CONCERN" and set final_id.
- If unclear: decision="AMBIGUOUS" and set final_id="".
- Respect contrast/negation (but, despite, unchanged, stable, even though etc).
- rationale is REQUIRED (5-20 words) and must quote 1-2 exact input phrases.

JSON:
{"decision":"CONCERN|AMBIGUOUS","final_id":"<candidate_id_or_empty>","rationale":"<5-20 words, must quote 1-2 exact input phrases>"}
`.trim();

  const user = JSON.stringify(
    {
      input: inputRaw,
      sem_text: semText,
      candidates,
      allow_ids: Array.from(allowIds),
      hint: "Use contrast/negation correctly (e.g., 'rankings unchanged' should not select 'rankings_dropped').",
    },
    null,
    2
  );

  const out = await ollamaChatJSON({
    baseUrl: llm.ollama_url,
    model: llm.model,
    system,
    user,
    timeoutMs: llm.timeout_ms ?? 20000,
    options: {
      temperature: llm.temperature ?? 0,
      top_p: llm.top_p ?? 1,
      top_k: llm.top_k ?? 0,
      num_predict: llm.num_predict ?? 220,
    },
  });

  const validated = validateLLMChoice(out, allowIds);
  if (!validated.ok) return { kind: "INVALID", reason: validated.reason, raw: out };
  return validated;
}

// ------------------ Startup ------------------
console.log(
  "Concern Ranker (SEO model; Semantic PRIMARY + BM25 SECONDARY; Gates disabled; BM25 stem ENABLED + stopwords + lemma + semcanon + fusion)"
);
console.log(`Nodes in model: ${ALL_NODES.length}`);
console.log(`Leaf Concerns:  ${LEAF_CONCERNS.length}`);

const anchorDocs = buildAnchorDocs();
const anchorSemTexts = anchorDocs.map((d) => normalizeSemantic(d.text));
console.log(`Anchors:        ${anchorDocs.length}`);

let TOPK = CONFIG?.decision?.topk ?? 5;
let MIN_RELEVANCE = CONFIG?.decision?.min_relevance ?? 0.45;
let MIN_GAP = CONFIG?.decision?.min_gap ?? 0.05;
let STRONG_GAP = CONFIG?.decision?.strong_gap ?? 0.12;

let K = CONFIG?.pipeline?.k_sem ?? 200;
const MIN_SEM_CAND = CONFIG?.semantic?.min_candidate ?? 0.0;

console.log(`Semantic provider: ${CONFIG.semantic.provider} url=${CONFIG.semantic.ollama_url} model=${CONFIG.semantic.model}`);

// Sentence embedder (Ollama)
const sentEmbedder = await buildSentenceEmbedder({
  ollamaUrl: CONFIG.semantic.ollama_url,
  model: CONFIG.semantic.model,
});

// Canon map (NO STEM build), cached
console.log(
  `Lexical flags: lemma=${!!CONFIG?.lexical?.lemmatization_enabled} stem(BM25)=${!!CONFIG?.lexical?.stemming_enabled} stopwords=true semcanon=${SEMCAN.enabled}`
);

if (SEMCAN.enabled) {
  console.log(`SemCanon: threshold=${SEMCAN.threshold} min_df=${SEMCAN.min_df} cache=${SEMCAN.cache_path}`);
  console.log("\nBuilding semantic canonicalization map (NO STEM; pairwise comparisons)...\n");
  CANON_MAP = await buildSemanticCanonicalMap(sentEmbedder, anchorDocs, {
    threshold: SEMCAN.threshold,
    minDf: SEMCAN.min_df,
    cachePath: SEMCAN.cache_path,
  });
  console.log(`Canonical map ready. entries=${CANON_MAP.size}\n`);
} else {
  console.log("\nSemantic canonicalization: disabled\n");
}

// Build BM25 AFTER CANON_MAP is ready
const bm25 = buildBm25(
  anchorDocs.map((d, i) => ({ id: i, text: d.text, meta: d })),
  { k1: CONFIG?.bm25?.k1 ?? 1.2, b: CONFIG?.bm25?.b ?? 0.75 }
);

normalizeBaseWeights();

console.log(`K anchors: ${K} (0 = all)  min_sem_candidate=${MIN_SEM_CAND}`);
console.log(`BM25: k1=${bm25.k1} b=${bm25.b} softnorm_k=${CONFIG?.bm25?.softnorm_k ?? 6.0}`);
console.log(`Weights: semantic=${W_SEM.toFixed(2)} bm25=${W_BM25.toFixed(2)} `);
console.log(`Fusion: alpha=${CONFIG?.fusion?.alpha ?? 0.2} beta=${CONFIG?.fusion?.beta ?? 0.15}`);
console.log(`Decision: min_gap=${MIN_GAP} strong_gap=${STRONG_GAP}`);
help();

// Precompute anchor embeddings
console.log("\nEmbedding all anchors (Nomic via Ollama)...\n");
const anchorVecs = [];
for (const t of anchorSemTexts) anchorVecs.push(await sentEmbedder.embed(t));
console.log("Ready.\n");

function listConcerns() {
  for (const c of LEAF_CONCERNS) console.log(`${c.id}  |  anchors=${c.anchors.length}`);
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
        W_SEM = a;
        W_BM25 = b;
        normalizeBaseWeights();
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

    // Gates disabled => consider all leaf concerns
    const candidateConcerns = LEAF_CONCERNS;

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
    const bestSem = maxPoolToConcerns(semAnchorScores, anchorDocs, LEAF_CONCERNS);
    const bestBm25 = bestBm25ByConcern(bm25, qBm25Text, anchorDocs, LEAF_CONCERNS);

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
        bm25_query: qBm25Text,
      };
    });

    const results = resultsAll.slice().sort((a, b) => b.score - a.score).slice(0, TOPK);
    const decision = decide(results, MIN_RELEVANCE, MIN_GAP);

    const top1 = results[0];
    const top2 = results[1];
    const gap = (top1?.score ?? 0) - (top2?.score ?? 0);

    const strongDeterministic = results.length >= 2 && gap >= STRONG_GAP;

    const shouldCallLLM =
      !!CONFIG?.llm_final?.enabled &&
      !strongDeterministic &&
      decision.label !== "NON_CONCERN";

    let llmPick = null;
    if (shouldCallLLM) {
      try {
        const rerankK = CONFIG?.llm_final?.rerank_topk ?? TOPK;
        const topForLLM = resultsAll.slice().sort((a, b) => b.score - a.score).slice(0, rerankK);

        llmPick = await llmFinalPick({
          inputRaw,
          semText: qSemText,
          resultsTopK: topForLLM,
          nodeIndex: NODE_INDEX,
          config: CONFIG,
        });
      } catch (e) {
        llmPick = { kind: "ERROR", reason: e?.message ?? String(e) };
      }
    }

    console.log(`\nInput: ${inputRaw}`);
    console.log(`SemText: ${qSemText}`);
    console.log(`BM25Query(filtered): ${qBm25Text || "(empty)"}`);
    console.log(`KeywordGate: disabled (candidates=${candidateConcerns.length}/${LEAF_CONCERNS.length})`);
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

    console.log(`Gap: ${(decision.gap ?? 0).toFixed(4)}  strong_gap=${STRONG_GAP.toFixed(4)}  strong=${strongDeterministic}\n`);

    if (CONFIG?.llm_final?.enabled) {
      if (strongDeterministic) {
        console.log(`LLM Final: SKIPPED (strong deterministic gap)\n`);
      } else if (llmPick) {
        if (llmPick?.kind === "CONCERN") {
          console.log(`LLM Final: CONCERN -> ${llmPick.id} (${getNodeLabel(llmPick.id)})  reason=${llmPick.rationale || ""}\n`);
        } else if (llmPick?.kind === "AMBIGUOUS") {
          console.log(`LLM Final: AMBIGUOUS  reason=${llmPick.rationale || ""}\n`);
        } else if (llmPick?.kind === "INVALID") {
          console.log(`LLM Final: INVALID (${llmPick.reason})\n`);
        } else if (llmPick?.kind === "ERROR") {
          console.log(`LLM Final: ERROR (${llmPick.reason})\n`);
        } else {
          console.log(`LLM Final: SKIP\n`);
        }
      }
    }

    // FINAL selection: apply llmPick if present
    let finalLabel = decision.label;
    let finalId = results[0]?.id ?? null;

    if (llmPick?.kind === "CONCERN") {
      finalLabel = "CONCERN";
      finalId = llmPick.id;
    } else if (llmPick?.kind === "AMBIGUOUS") {
      finalLabel = "AMBIGUOUS";
      finalId = null;
    }

    console.log(`FINAL: ${finalLabel}${finalId ? " -> " + finalId : ""}\n`);

    for (const r of results) {
      console.log(
        `${r.score.toFixed(4)}  ${r.id}\n` +
          `   gate_pass:   (disabled)\n` +
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
