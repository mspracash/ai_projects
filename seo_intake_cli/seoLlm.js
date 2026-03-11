import { ChatOllama } from "@langchain/ollama";

export const seoModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "phi4-mini",
  temperature: 0
});

export function extractJson(text) {
  const raw = String(text || "").trim();

  const withoutFences = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const match = withoutFences.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function invokeJson(model, prompt) {
  const response = await model.invoke(prompt);
  const text = String(response?.content || "").trim();
  console.log(text);
  return extractJson(text);
}