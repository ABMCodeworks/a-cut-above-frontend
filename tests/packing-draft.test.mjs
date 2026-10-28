import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/lib/packingDraft.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { reconcilePackingDraft } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const item = (id, productId, qty = 2, unit = "kg") => ({ id, productId, qty, unit });
const state = (id, values, packed = true) => ({ itemId: id, packed, weights: values.map(value => ({ value, unit: "g" })) });
test("edits remap IDs, retain entered weights, and discard removed products", () => {
  assert.deepEqual(reconcilePackingDraft([item("a", "mince"), item("b", "steak")], [item("c", "mince", 1)], { a: state("a", [450, 550]), b: state("b", [600, 700]) }, { c: state("c", [undefined], false) }), { c: state("c", [450]) });
});
test("increasing quantity keeps weights and requires packing additional packs", () => {
  const result = reconcilePackingDraft([item("a", "mince", 1)], [item("c", "mince"), item("d", "steak", 1)], { a: state("a", [450]) }, { c: state("c", [undefined, undefined], false), d: state("d", [undefined], false) });
  assert.deepEqual(result.c, state("c", [450, undefined], false));
  assert.deepEqual(result.d, state("d", [undefined], false));
});
test("incomplete weights survive; changed units reset the draft", () => {
  const draft = { a: state("a", [450, undefined], false) };
  assert.deepEqual(reconcilePackingDraft([item("a", "mince")], [item("c", "mince")], draft, { c: state("c", [undefined, undefined], false) }).c, state("c", [450, undefined], false));
  const defaults = { c: state("c", [], false) };
  assert.deepEqual(reconcilePackingDraft([item("a", "mince")], [item("c", "mince", 2, "pack")], draft, defaults), defaults);
});
