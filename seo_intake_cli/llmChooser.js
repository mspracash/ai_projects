
import { ChatOllama } from "@langchain/ollama";
import { invokeJson, seoModel } from "./seoLlm.js";

const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "phi4-mini",
  temperature: 0
});

export function buildSeoChildChooserPrompt({ parentId, children, text }) {
  const cleanText = String(text ?? "").trim();

  const childrenBlock = children
    .map((c) => {
      const desc = (c.description ?? c.label ?? c.id).replace(/\s+/g, " ").trim();
      const st = c.structure ? JSON.stringify(c.structure) : "{}";
      return `- ${c.id}: ${desc} | structure=${st}`;
    })
    .join("\n");

  const childIds = children.map((c) => c.id).join(", ");

  return `
You are a very decisive SEO (organic search) hierarchical classifier for digital marketing.

Task:
At the current parent node, choose EXACTLY ONE child node that best matches the input sentence.

Parent node:
"${parentId}"

Input (single atomic sentence):
"${cleanText}"

Candidates (id: description | structure):
${childrenBlock}

Candidate ids:
${childIds}

RULES:
- Choose exactly one child id from the candidate ids.
- Classify ONLY what is explicitly observed in the sentence (symptom).
- Do NOT diagnose causes.
- Prefer the child whose description and structure best match:
  - domain
  - metric
  - direction
  - time bucket
  - scope
- Use standard SEO meaning when interpreting the sentence.
- Treat typos, casing issues, and minor wording variation as equivalent when meaning is clear.
- Prefer the most specific matching child among the candidates.
- If multiple candidates seem related, choose the closest direct match to the observed symptom.
- Do not output markdown.
- Do not output code fences.
- Do not output explanations outside JSON.

OUTPUT (STRICT JSON ONLY):
{
  "node_id": "<child id>",
  "confidence": <0.0 to 1.0>,
  "evidence": ["<1-2 short verbatim snippets from input>"]
}

CONTRACT:
- node_id must be exactly one of the candidate ids
- confidence must be between 0.0 and 1.0
- evidence should contain 1-2 short verbatim snippets when possible
- Output ONLY JSON
- First character must be {
- Last character must be }
`.trim();
}


export async function scoreChildrenWithLLM(atomicSentence, currentNodeId, children) {
  if (!children?.length) {
    return [];
  }

  const prompt = buildSeoChildChooserPrompt({
    parentId: currentNodeId,
    children,
    text: atomicSentence
  });

  const parsed = await invokeJson(seoModel, prompt);

  if (!parsed) {
    return [];
  }

  const chosenId = String(parsed.node_id || "").trim();
  const chosenConfidence = Number(parsed.confidence ?? 0);

  const merged = children.map((child) => ({
    id: child.id,
    label: child.label,
    confidence: child.id === chosenId ? chosenConfidence : 0
  }));

  merged.sort((a, b) => b.confidence - a.confidence);
  return merged;
}