import test from "node:test";
import assert from "node:assert";

import { buildRootGraph } from "../workflow.js";
import { initialState } from "../state.js";
import { KnowledgeGraph } from "../knowledgeGraph.js";
import {
  services,
  prices,
  concernServiceMap,
  concernRelations,
  concernTree
} from "./fixtures.js";

function createPromptsMock(responses) {
  let index = 0;
  return async () => responses[index++] || {};
}

function noop() {}

test("rootGraph runs through intake, discovery, mapping, pricing, summary", async () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const promptsMock = createPromptsMock([
    {
      contactName: "Surya",
      phone: "123",
      email: "a@b.com",
      businessName: "QuestBud",
      businessAddress: "NJ",
      businessDescription: "SEO company"
    },
    {
      concern: "rankings dropped"
    },
    {
      concern: "done"
    }
  ]);

  const app = buildRootGraph({
    knowledgeGraph: kg,
    promptsImpl: promptsMock,
    normalizeSeoConcernImpl: async () => "Keyword rankings dropped.",
    atomizeConcernImpl: async () => ({
      atomic_sentences: ["Keyword rankings have dropped."],
      notes: []
    }),
    resolveConcernWithTreeImpl: async () => ({
      resolvedConcernId: "seo.visibility.rankings_down",
      path: ["seo", "seo.visibility", "seo.visibility.rankings_down"],
      scoringTrace: []
    }),
    printIntakeSummaryImpl: noop,
    printDiscoverySummaryImpl: noop,
    printServiceSummaryImpl: noop
  });

  const result = await app.invoke(initialState);

  assert.equal(result.contactName, "Surya");
  assert.deepEqual(result.resolvedConcernIds, ["seo.visibility.rankings_down"]);
  assert.deepEqual(result.matchedServiceIds, ["seo_audit"]);
  assert.equal(result.totalCost, 500);
  assert.equal(result.phase, "done");
});