import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/orderSearch.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { matchesOrderSearch } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const order = { customerName: "José Billing", businessName: "Kava Market", orderNo: "ACA-20261008-0320" };

test("matches partial names and order numbers regardless of case, accents or separators", () => {
  for (const query of ["jose", "BILL", "kava", "0320", "20261008", "aca202610080320", "  Jose   Billing  "]) {
    assert.equal(matchesOrderSearch(order, query), true, query);
  }
});
test("tolerates inserted, missing, substituted and transposed characters", () => {
  for (const query of ["Billling", "Biling", "Billimg", "Bililng", "Kvaa", "aca202610080302", "20361009"]) {
    assert.equal(matchesOrderSearch(order, query), true, query);
  }
});
test("multi-word searches require every term and allow different word order", () => {
  assert.equal(matchesOrderSearch(order, "Billing Jose"), true);
  assert.equal(matchesOrderSearch(order, "Kvaa Markte"), true);
  assert.equal(matchesOrderSearch(order, "Jose 0320"), true);
  assert.equal(matchesOrderSearch(order, "Jose Smith"), false);
});
test("empty search restores orders; unrelated and short typo queries do not match", () => {
  assert.equal(matchesOrderSearch(order, "  "), true);
  assert.equal(matchesOrderSearch(order, "Williams"), false);
  assert.equal(matchesOrderSearch(order, "9999"), false);
  assert.equal(matchesOrderSearch(order, "jox"), false);
  assert.equal(matchesOrderSearch({}, "Jose"), false);
});
