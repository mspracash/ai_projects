import { BaseAgent } from "./BaseAgent.js";
import { runSeoAgencySearch } from "../lib/pythonBridge.js";

function buildNegotiationAnswer(question, results = []) {
    if (!Array.isArray(results) || !results.length) {
        return "I could not find negotiation or pricing guidance for this request.";
    }

    const top = results[0];
    const lines = [];

    lines.push(`Negotiation context for: ${question}`);
    lines.push("");
    lines.push(`Best supporting source: ${top.title || top.doc_id || "Unknown source"}`);

    if (top.section_title) {
        lines.push(`Section: ${top.section_title}`);
    }

    if (top.text) {
        lines.push("");
        lines.push(top.text);
    }

    return lines.join("\n");
}

export class NegotiationAgent extends BaseAgent {
    constructor() {
        super({ name: "negotiationAgent" });
    }

    async process(msg) {
        const question = msg?.payload?.text ?? "";

        if (!question.trim()) {
            return {
                item_id: msg?.item_id,
                type: "negotiation",
                question,
                results: [],
                answer: "No negotiation question was provided."
            };
        }

        try {
            const rawResults = await runSeoAgencySearch({ query: question, k: 5 });
            const results = Array.isArray(rawResults) ? rawResults : [];

            return {
                item_id: msg?.item_id,
                type: "negotiation",
                question,
                results,
                answer: buildNegotiationAnswer(question, results)
            };
        } catch (error) {
            return {
                item_id: msg?.item_id,
                type: "negotiation",
                question,
                results: [],
                answer: "I ran into an error while looking up negotiation guidance.",
                error: error?.message ?? String(error)
            };
        }
    }
}