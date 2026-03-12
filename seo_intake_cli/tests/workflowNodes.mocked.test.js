import test from "node:test";
import assert from "node:assert";
import { KnowledgeGraph } from "../knowledgeGraph.js";
import { createWorkflowNodes } from "../workFlowNodes.js";

import {
  services,
  prices,
  concernServiceMap,
  concernRelations,
  concernTree
} from "./fixtures.js";

function noop() {}

test("normalizeConcernNode stores normalized text", async () => {
  const nodes = createWorkflowNodes({
    normalizeSeoConcernImpl: async (text) => `Normalized: ${text}`,
    printIntakeSummaryImpl: noop,
    printDiscoverySummaryImpl: noop,
    printServiceSummaryImpl: noop
  });

  const result = await nodes.normalizeConcernNode({
    currentConcern: "rankings dropped"
  });

  assert.equal(result.normalizedConcern, "Normalized: rankings dropped");
});

test("atomizeConcernNode stores multiple atomic concerns", async () => {
  const nodes = createWorkflowNodes({
    atomizeConcernImpl: async () => ({
      atomic_sentences: [
        "Keyword rankings have dropped.",
        "Organic search traffic has decreased."
      ],
      notes: []
    }),
    printIntakeSummaryImpl: noop,
    printDiscoverySummaryImpl: noop,
    printServiceSummaryImpl: noop
  });

  const result = await nodes.atomizeConcernNode({
    normalizedConcern: "Keyword rankings dropped and organic search traffic reduced."
  });

  assert.deepEqual(result.currentAtomicConcerns, [
    "Keyword rankings have dropped.",
    "Organic search traffic has decreased."
  ]);
});

test("resolveAtomicConcernsNode appends resolved concern ids", async () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const nodes = createWorkflowNodes({
    resolveConcernWithTreeImpl: async (atomicConcern) => {
      if (atomicConcern.includes("rankings")) {
        return {
          resolvedConcernId: "seo.visibility.rankings_down",
          path: ["seo", "seo.visibility", "seo.visibility.rankings_down"],
          scoringTrace: []
        };
      }

      return {
        resolvedConcernId: "seo.technical.general_technical_issue",
        path: ["seo", "seo.technical", "seo.technical.general_technical_issue"],
        scoringTrace: []
      };
    },
    printIntakeSummaryImpl: noop,
    printDiscoverySummaryImpl: noop,
    printServiceSummaryImpl: noop
  });

  const result = await nodes.resolveAtomicConcernsNode(
    {
      currentConcern: "rankings dropped and server errors",
      currentAtomicConcerns: [
        "Keyword rankings have dropped.",
        "5xx server errors detected."
      ],
      concernMessages: [],
      atomicConcernCandidates: [],
      resolvedConcernIds: []
    },
    { knowledgeGraph: kg }
  );

  assert.deepEqual(result.concernMessages, [
    "rankings dropped and server errors"
  ]);

  assert.deepEqual(result.atomicConcernCandidates, [
    "Keyword rankings have dropped.",
    "5xx server errors detected."
  ]);

  assert.deepEqual(result.resolvedConcernIds.sort(), [
    "seo.technical.general_technical_issue",
    "seo.visibility.rankings_down"
  ].sort());
});

test("resolveAtomicConcernsNode dedupes repeated concern ids", async () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const nodes = createWorkflowNodes({
    resolveConcernWithTreeImpl: async () => ({
      resolvedConcernId: "seo.visibility.rankings_down",
      path: ["seo", "seo.visibility", "seo.visibility.rankings_down"],
      scoringTrace: []
    }),
    printIntakeSummaryImpl: noop,
    printDiscoverySummaryImpl: noop,
    printServiceSummaryImpl: noop
  });

  const result = await nodes.resolveAtomicConcernsNode(
    {
      currentConcern: "rankings dropped again",
      currentAtomicConcerns: [
        "Keyword rankings have dropped.",
        "Keyword rankings have dropped."
      ],
      concernMessages: [],
      atomicConcernCandidates: [],
      resolvedConcernIds: []
    },
    { knowledgeGraph: kg }
  );

  assert.deepEqual(result.resolvedConcernIds, [
    "seo.visibility.rankings_down"
  ]);
});