import test from "node:test";
import assert from "node:assert";

import { resolveConcernWithTree } from "../concernResolver.js";

test("Resolver returns leaf node", async () => {

  const fakeKG = {
    isLeaf: (id) => id === "seo.visibility.rankings_down",
    getChildren: (id) => {
      if (id === "seo") {
        return [{ id: "seo.visibility" }];
      }

      if (id === "seo.visibility") {
        return [{ id: "seo.visibility.rankings_down" }];
      }

      return [];
    },
    getPath: () => ["seo","seo.visibility","seo.visibility.rankings_down"]
  };

  const fakeScore = async () => [
    { id: "seo.visibility", confidence: 1 }
  ];

  const result = await resolveConcernWithTree(
    "rankings dropped",
    fakeKG,
    fakeScore
  );

  assert.equal(result.resolvedConcernId, "seo.visibility.rankings_down");
});