// sent_embed.js
// Ollama-based sentence embeddings (Nomic)
// Requires Ollama running, e.g. http://localhost:11434
//
// Usage:
//   const embedder = await buildSentenceEmbedder({ ollamaUrl, model });
//   const vec = await embedder.embed("text");

function ensureFetch() {
  if (typeof fetch === "function") return;
  throw new Error(
    "Global fetch is not available. Use Node 18+ or install node-fetch and adapt sent_embed.js."
  );
}

async function ollamaEmbed({ ollamaUrl, model, text }) {
  ensureFetch();

  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text })
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Ollama embeddings error: ${res.status} ${msg}`);
  }

  const json = await res.json();
  if (!json?.embedding || !Array.isArray(json.embedding)) {
    throw new Error("Ollama embeddings response missing `embedding` array.");
  }
  return json.embedding;
}

export async function buildSentenceEmbedder({ ollamaUrl, model }) {
  if (!ollamaUrl) throw new Error("buildSentenceEmbedder: missing ollamaUrl");
  if (!model) throw new Error("buildSentenceEmbedder: missing model");

  // tiny connectivity check
  await ollamaEmbed({ ollamaUrl, model, text: "ping" });

  return {
    provider: "ollama",
    modelName: model,
    embed: async (text) => ollamaEmbed({ ollamaUrl, model, text })
  };
}
