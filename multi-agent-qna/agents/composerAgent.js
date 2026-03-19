import { BaseAgent } from "./BaseAgent.js";

export class ComposerAgent extends BaseAgent {
  constructor() {
    super({ name: "composer" });
    this.current = null;
  }

  startRun(originalInput = "") {
    this.current = {
      originalInput,
      outputs: [],
      byItemId: new Map(),
      finalText: ""
    };
  }

  async consumeLoop(outputQueue) {
    while (true) {
      const event = await outputQueue.pop();

      if (event === null) {
        break;
      }

      if (!this.current) {
        this.startRun("");
      }

      this.current.outputs.push(event);
      this.current.byItemId.set(event.item_id, event);
      this.current.finalText = this.composeText();
    }
  }

  composeText() {
    if (!this.current) {
      return "No composed result is available.";
    }

    const lines = [];

    if (this.current.originalInput) {
      lines.push(`Request: ${this.current.originalInput}`);
      lines.push("");
    }

    for (const output of this.current.outputs) {
      lines.push(`[${output.agent}] ${output.question || output.type}`);

      if (output.answer) {
        lines.push(output.answer);
      }

      if (output.error) {
        lines.push(`Error: ${output.error}`);
      }

      lines.push("");
    }

    return lines.join("\n").trim();
  }

  async handleFinal() {
    if (!this.current || !this.current.finalText) {
      return "No composed result is available.";
    }

    return this.current.finalText;
  }

  reset() {
    this.current = null;
  }
}