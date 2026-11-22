// Writes examples/index.json, the list the demo page loads. Run after adding or editing an example.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { EXAMPLES_DIR, buildIndex, listExamples } from "../src/examples.js";

writeFileSync(join(EXAMPLES_DIR, "index.json"), buildIndex());
console.log(`wrote examples/index.json (${listExamples().length} examples)`);
