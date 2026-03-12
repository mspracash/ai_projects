import test from "node:test";
import assert from "node:assert";

import { extractJson } from "../seoLlm.js";

test("extractJson parses fenced JSON", () => {
  const text = `
\`\`\`json
{ "a": 1 }
\`\`\`
`;

  const result = extractJson(text);

  assert.equal(result.a, 1);
});

test("extractJson parses raw JSON", () => {
  const text = `{ "b": 2 }`;

  const result = extractJson(text);

  assert.equal(result.b, 2);
});

test("extractJson returns null for invalid JSON", () => {
  const text = "not json";

  const result = extractJson(text);

  assert.equal(result, null);
});