import { SYSTEM_PROMPT } from "./prompt.js";
import { ollamaChat } from "./ollama.js";
import { validateNoNegations } from "./validate-negation.js";
import { CONFIG } from "./config.js";

export async function normalize(text) {
  const res = await ollamaChat({
    system: SYSTEM_PROMPT,
    user: `Clean and normalize the following digital marketing message:\n\n<<<\n${text}\n>>>`,
    model: CONFIG.model,
    url: CONFIG.url,
    options: CONFIG.options
  });

  const output = res.message?.content?.trim() || "";

  if (!output) throw new Error("Empty model response");

  validateNoNegations(output);

  return output;
}
