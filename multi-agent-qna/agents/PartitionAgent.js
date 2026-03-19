import { BaseAgent } from "./BaseAgent.js";
import { queryLLM } from "../lib/llmClient.js";
import partitionPrompt from "../prompts/partitionPrompt.js";

export class PartitionAgent extends BaseAgent {
  constructor() {
    super({ name: "partitionAgent" });
  }

  async process(userInput) {
    if (typeof userInput !== "string" || !userInput.trim()) {
      throw new Error("Input must be a non-empty string");
    }

    const result = await queryLLM(`${partitionPrompt}

User input:
${userInput}
`);
    
    const intakeText = result?.intake_text;
    const nonIntakeText = result?.non_intake_text;

    if (typeof intakeText !== "string") {
      throw new Error("Partition response missing intake_text");
    }

    if (typeof nonIntakeText !== "string") {
      throw new Error("Partition response missing non_intake_text");
    }

    return {
      intake_text: intakeText.trim(),
      non_intake_text: nonIntakeText.trim()
    };
  }
}