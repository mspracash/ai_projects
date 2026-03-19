import { BaseAgent } from "./BaseAgent.js";
import { queryLLM } from "../lib/llmClient.js";
import knowledgePrompt from "../prompts/knowledgePrompt.js";

export class KnowledgeAgent extends BaseAgent {
  constructor() {
    super({ name: "knowledgeAgent" });
  }

  async process(msg) {
    const question = msg?.payload?.text ?? "";

    if (!question.trim()) {
      return {
        item_id: msg.item_id,
        type: "knowledge",
        question,
        answer: "I could not find a valid knowledge question to answer."
      };
    }

    const prompt = knowledgePrompt(question);
    const llmResult = await queryLLM(prompt);

    return {
      item_id: msg.item_id,
      type: "knowledge",
      question,
      answer:
        llmResult?.answer?.trim() ||
        "I could not generate a reliable answer for that question."
    };
  }
}