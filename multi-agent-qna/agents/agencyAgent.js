import { BaseAgent } from "./BaseAgent.js";
import { runSeoAgencySearch } from "../lib/pythonBridge.js";
import { NO_RESULTS_MESSAGE } from "../utils/constants.js";

function summarizeTopResults(results = [], maxItems = 3) {
  if (!Array.isArray(results) || results.length === 0) {
    return NO_RESULTS_MESSAGE;
  }

  return results
    .slice(0, maxItems)
    .map((r, index) => {
      const title = r.title || r.doc_id || `Result ${index + 1}`;
      const section = r.section_title ? ` (${r.section_title})` : "";
      const text = r.text || "";
      return `${index + 1}. ${title}${section}\n${text}`;
    })
    .join("\n\n");
}

export class AgencyAgent extends BaseAgent {
  constructor() {
    super({ name: "agencyAgent" });
  }

  async process(msg) {
    const question = msg?.payload?.text ?? "";

    if (!question.trim()) {
      return {
        item_id: msg?.item_id,
        type: "agency",
        question,
        results: [],
        answer: "No agency question was provided."
      };
    }

    try {
      const rawResults = await runSeoAgencySearch({ query: question, k: 5 });
      const results = Array.isArray(rawResults) ? rawResults : [];

      return {
        item_id: msg.item_id,
        type: "agency",
        question,
        results,
        answer: summarizeTopResults(results)
      };
    } catch (error) {
      return {
        item_id: msg?.item_id,
        type: "agency",
        question,
        results: [],
        answer: "I ran into an error while looking up agency guidance.",
        error: error?.message ?? String(error)
      };
    }
  }
}