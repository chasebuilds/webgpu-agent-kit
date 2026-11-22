import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./examples.js";

const TOPICS_DIR = join(ROOT, "topics");

/** All topics: name, first heading, and the keyword line. */
export function listTopics() {
  return readdirSync(TOPICS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const name = file.replace(/\.md$/, "");
      const text = readFileSync(join(TOPICS_DIR, file), "utf8");
      return {
        name,
        title: /^#\s+(.*)$/m.exec(text)?.[1] ?? name,
        keywords: /^Keywords:\s*(.*)$/m.exec(text)?.[1] ?? "",
        text,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Find a topic by exact name first, then by keyword or title match. Returns the best match or null. */
export function findTopic(query) {
  const q = query.toLowerCase().trim();
  const topics = listTopics();
  const exact = topics.find((t) => t.name === q);
  if (exact) return exact;
  const scored = topics
    .map((t) => {
      let score = 0;
      if (t.name.includes(q)) score += 3;
      if (t.title.toLowerCase().includes(q)) score += 2;
      if (t.keywords.toLowerCase().includes(q)) score += 2;
      for (const word of q.split(/\s+/).filter((w) => w.length > 2)) {
        if (t.keywords.toLowerCase().includes(word)) score += 1;
      }
      return { topic: t, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.topic ?? null;
}
