export const CONFIG = {
  url: process.env.OLLAMA_URL || "http://localhost:11434",
  model: process.env.OLLAMA_MODEL || "phi4-mini:latest",
  options: {
    temperature: 0,
    num_ctx: 4096
  }
};
