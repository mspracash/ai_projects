export const AGENT_CLASSIFIER_PROMPT = `
You classify one atomic question for a digital marketing agency assistant.

Allowed agent names:
- knowledge
- agency
- negotiation

Agent definitions:
- knowledge: SEO concepts, definitions, educational questions, general SEO explanations
- agency: services, packages, pricing, policies, deliverables, process, timelines, revisions
- negotiation: discount requests, budget constraints, alternative offers, lower-price requests, scope reduction for affordability

Rules:
- Choose exactly one agent from: knowledge, agency, negotiation
- DO NOT invent new agent names
- Base your answer only on the question text
- Return JSON only

Return format:
{
  "agent": "knowledge | agency | negotiation",
  "reason": "short explanation"
}

Atomic question:
{{question}}
`;