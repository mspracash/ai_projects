export const DEPENDENCY_PROMPT = `
You determine dependencies between atomic questions in a digital marketing agency assistant workflow.

Each atomic question is handled by one of these agents:

- knowledge   → SEO concepts, definitions, general SEO explanations
- agency      → services, packages, pricing, policies, deliverables, timelines
- negotiation → discount requests, budgets, lower price requests, alternative offers

Goal:
Determine whether answering one question requires the answer to another question first.

A dependency exists only if:
Question B requires the result of Question A before Question B can be answered reliably.

Examples:

Example 1
A1: Does the agency offer technical SEO?
A2: Can you do technical SEO for $800?

Result:
A2 depends on A1

Reason:
Negotiation requires service confirmation.

Example 2
A1: What is crawl budget?
A2: What is indexing?

Result:
No dependency.

Example 3
A1: What packages do you offer for local SEO?
A2: Which package is cheapest?

Result:
A2 depends on A1.

Rules:
- Only use the provided atomic questions
- Do NOT invent new questions
- Do NOT assume a dependency unless it is necessary
- Topic similarity alone does NOT create a dependency
- Allowed agent names are: knowledge, agency, negotiation
- Use item ids exactly as provided

Return JSON only.

Format:

{
  "dependencies": [
    {
      "item": "A2",
      "depends_on": ["A1"],
      "reason": "A2 requires information from A1"
    }
  ]
}

Atomic questions:
{{atomic_questions}}
`;