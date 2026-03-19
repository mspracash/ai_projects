import { BaseAgent } from "./BaseAgent.js";
import { queryLLM } from "../lib/llmClient.js";
import nonIntakePrompt from "../prompts/nonIntakePrompt.js";

export class NonIntakeAgent extends BaseAgent {
  constructor() {
    super({ name: "nonIntakeAgent" });
  }

  async process(userInput) {
    if (typeof userInput !== "string" || !userInput.trim()) {
      throw new Error("Input must be a non-empty string");
    }

    const result = await queryLLM(`${nonIntakePrompt}

User message:
${userInput}
`);

    const responseText = result?.response_text;

    if (typeof responseText !== "string" || !responseText.trim()) {
      throw new Error("Non-intake response missing response_text");
    }

    return {
      response_text: responseText.trim()
    };
  }
}