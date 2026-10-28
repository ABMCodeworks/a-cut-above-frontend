import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import ts from "typescript";
const source = await readFile(new URL("../src/lib/saleReference.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { createSaleReference } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
test("uses native randomUUID when available", () => {
  const expected = webcrypto.randomUUID();
  assert.equal(createSaleReference({ randomUUID: () => expected, getRandomValues: () => { throw new Error("Unexpected fallback"); } }), expected);
});
test("browsers without randomUUID can prepare unique valid sale references", () => {
  const source = { getRandomValues: array => webcrypto.getRandomValues(array) };
  const references = Array.from({ length: 1000 }, () => createSaleReference(source));
  for (const reference of references) assert.match(reference, uuidV4);
  assert.equal(new Set(references).size, references.length);
});
test("fallback sets UUID version and variant bits with correct zero padding", () => {
  assert.equal(createSaleReference({ getRandomValues: array => array.fill(0) }), "00000000-0000-4000-8000-000000000000");
  assert.equal(createSaleReference({ getRandomValues: array => array.fill(255) }), "ffffffff-ffff-4fff-bfff-ffffffffffff");
});
test("missing browser cryptography explains how to recover", () => {
  assert.throws(() => createSaleReference({}), /Open this page over HTTPS/);
});
