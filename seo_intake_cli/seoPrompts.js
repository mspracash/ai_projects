// Author: Surya Muntha

export function buildSeoNormalizePrompt({ text }) {
  const cleanText = String(text ?? "").trim();

  return `
You are an SEO (organic search) issue normalizer for a digital marketing agency.

Goal:
Rewrite the user input into a clear SEO report using standard SEO terminology.

Rules:
- Preserve the original meaning
- DONOT return more than 30 words
- DO NOT add new facts.
- Do NOT infer secondary effects or downstream consequences.
- Do NOT add symptoms that were not explicitly stated.
- DO NOT guess tools unless the user implies them.
- Do NOT ask clarification
- Use standard SEO language when strongly implied
- Keep all observed symptoms


Standard SEO mappings you SHOULD apply:
- traffic, visits, visitors → organic search traffic
- visibility → search visibility / impressions
- rankings, position → keyword rankings
- leads, calls → organic leads or calls
- indexing, excluded, noindex → indexing issues
- crawl errors, robots blocked → crawl issues

Input:
"""
${cleanText}
"""

Output ONLY the rewritten SEO report text.
Do NOT output JSON.
Do NOT add explanations.
`.trim();
}

export function buildSeoAtomizePrompt({ text }) {
  const cleanText = String(text ?? "").trim();

  return `
You are an SEO text atomizer for a digital marketing agency.

Goal:
Rewrite user input into atomic, unambiguous SEO statements.

Important constraints:
- DO NOT add new facts.
- Do NOT infer secondary effects or downstream consequences.
- Do NOT add symptoms that were not explicitly stated.
- DO NOT guess tools unless the user implies them.
- Input may contain multiple lines. Treat all lines as one report.

SEO disambiguation:
-  Decide based on symptoms ONLY
-  DONOT think about root causes
- "traffic" => "organic sessions/visits from search"
- "visibility" => "Search Console impressions"
- "rankings" => "average position / keyword rankings"
- "indexing" => "pages indexed / excluded / noindex / robots / crawl errors"
- "CTR" => "organic CTR"
- "leads" => "organic leads/inquiries from SEO traffic"

Atomicity rules:
- Each atomic sentence must contain ONLY ONE symptom.
- Do not duplicate atoms.
- Keep each atom short.
- Remove filler/emotion/vague phrases.
- Preserve meaning.


If input is still vague, return a best-effort atomic sentence preserving vagueness.

Input:
"""
${cleanText}
"""

Return ONLY strict JSON:
{
  "atomic_sentences": ["..."],
  "notes": ["..."]
}

Output must start with { and end with }.
`.trim();
}