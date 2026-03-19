const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const MODEL = process.env.MODEL || "phi4-mini";

function stripMarkdownFences(text) {
  const trimmed = text.trim();

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return trimmed;
}

function safeJsonParse(text) {
  const cleaned = stripMarkdownFences(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse LLM JSON: ${cleaned}`);
  }
}

export async function queryLLM(prompt, options = {}) {
  const model = options.model || MODEL;
  const responseFormat = options.responseFormat || "json";

  const body = {
    model,
    prompt,
    stream: false
  };

  if (responseFormat === "json") {
    body.format = "json";
  }

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.response?.trim();

  if (!text) {
    throw new Error("LLM returned empty response");
  }

  if (responseFormat === "text") {
    return stripMarkdownFences(text);
  }

  return safeJsonParse(text);
}