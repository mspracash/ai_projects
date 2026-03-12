import test from "node:test";
import assert from "node:assert";

import { KnowledgeGraph } from "../knowledgeGraph.js";
import {
  services,
  prices,
  concernServiceMap,
  concernRelations,
  concernTree
} from "./fixtures.js";

test("Price items created correctly", () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const items = kg.getPriceItemsForServices(["seo_audit"]);

  assert.equal(items.length, 1);
  assert.equal(items[0].price, 500);
});

test("Total price calculation", () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const items = kg.getPriceItemsForServices([
    "seo_audit",
    "technical_audit"
  ]);

  const total = items.reduce((sum, i) => sum + i.price, 0);

  assert.equal(total, 1100);
});