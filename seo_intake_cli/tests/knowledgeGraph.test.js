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

test("KnowledgeGraph builds tree correctly", () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const children = kg.getChildren("seo");

  assert.equal(children.length, 2);
});

test("Leaf detection works", () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  assert.equal(kg.isLeaf("seo.visibility.rankings_down"), true);
  assert.equal(kg.isLeaf("seo.visibility"), false);
});

test("Path building works", () => {
  const kg = new KnowledgeGraph(
    services,
    prices,
    concernServiceMap,
    concernRelations,
    concernTree
  );

  const path = kg.getPath("seo.visibility.rankings_down");

  assert.deepEqual(path, [
    "seo",
    "seo.visibility",
    "seo.visibility.rankings_down"
  ]);
});