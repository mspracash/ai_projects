import { BaseAgent } from "./BaseAgent.js";
import { queryLLM } from "../lib/llmClient.js";

import normalizationPrompt from "../prompts/normalizationPrompt.js";
import atomizationPrompt from "../prompts/atomizationPrompt.js";
import classificationPrompt from "../prompts/classificationPrompt.js";

const VALID_TYPES = new Set(["agency", "knowledge", "negotiation"]);

export class IntakeAgent extends BaseAgent {
  constructor() {
    super({ name: "intakeAgent" });
  }

  buildBusItems(questions) {
    return questions.map((question, index) => ({
      item_id: `Q${index + 1}`,
      text: question,
      status: "new",
      assigned_agent: null,
      result: null,
      error: null
    }));
  }

  validateQuestions(questions) {
    if (!Array.isArray(questions)) {
      throw new Error("Atomization response missing atomic_questions array");
    }

    for (const question of questions) {
      if (typeof question !== "string" || !question.trim()) {
        throw new Error(`Invalid atomic question: ${JSON.stringify(question)}`);
      }
    }
  }

  validateType(type) {
    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      throw new Error(`Invalid classification type: ${type}`);
    }
  }

  async normalize(intakeText) {
    const result = await queryLLM(`${normalizationPrompt}

User input:
${intakeText}
`);

    const normalizedText =
      typeof result?.normalized_text === "string"
        ? result.normalized_text.trim()
        : "";

    return normalizedText;
  }

  async atomize(normalizedText) {
    const result = await queryLLM(`${atomizationPrompt}

Input text:
${normalizedText}
`);

    const questions = result?.atomic_questions;
    this.validateQuestions(questions);

    const normalizeQuestion = (q) => q.trim().replace(/\s+/g, " ").toLowerCase();

    const unique = [];
    const seen = new Set();

    for (const q of questions) {
      const key = normalizeQuestion(q);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(q.trim());
      }
    }

    return unique;
  }

  async classifyOne(item) {
    const result = await queryLLM(`${classificationPrompt}

Question:
${item.text}
`);

    const type = result?.type;
    this.validateType(type);

    return {
      ...item,
      type
    };
  }

  async classifyItems(items) {
    const classifiedItems = [];

    for (const item of items) {
      const classifiedItem = await this.classifyOne(item);
      classifiedItems.push(classifiedItem);
    }

    return classifiedItems;
  }

  async process(intakeText) {
    if (typeof intakeText !== "string" || !intakeText.trim()) {
      throw new Error("Intake text must be a non-empty string");
    }

    const normalizedText = await this.normalize(intakeText);

    if (!normalizedText) {
      return {
        normalized_text: "",
        items: []
      };
    }

    const questions = await this.atomize(normalizedText);
    const items = this.buildBusItems(questions);
    const classifiedItems = await this.classifyItems(items);

    return {
      normalized_text: normalizedText,
      items: classifiedItems
    };
  }
}