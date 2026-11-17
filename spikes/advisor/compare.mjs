// Spike S5 (#4): put the rules' answer and each model's answer side by side per question.
// Usage: node compare.mjs <facts.json> <results.json> [more results.json …] > comparison.md
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rules } from "./rules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [factsPath, ...resultFiles] = process.argv.slice(2);
const facts = JSON.parse(readFileSync(factsPath, "utf8"));
const questions = JSON.parse(readFileSync(path.join(here, "questions.json"), "utf8"));
const findings = rules(facts);
const results = resultFiles.flatMap((f) => JSON.parse(readFileSync(f, "utf8")));
const models = [...new Set(results.map((r) => r.model))];

const quote = (text) => text.split("\n").map((l) => `> ${l}`).join("\n");
const out = [];

for (const q of questions) {
  out.push(`### ${q.id.toUpperCase()}. ${q.question}\n`);
  const relevant = findings.filter((a) => a.topic.includes(q.topic));
  out.push("**Vaste regels**\n");
  if (relevant.length === 0) {
    out.push(quote("_Geen regel die deze vraag beantwoordt._") + "\n");
  } else {
    const text = relevant
      .map((a, i) => `${i + 1}. **${a.title}.** ${a.why}${a.caveat ? ` _Let op: ${a.caveat}_` : ""}`)
      .join("\n");
    out.push(quote(text) + "\n");
  }
  for (const m of models) {
    const r = results.find((x) => x.model === m && x.question_id === q.id);
    out.push(`**${m}**${r ? ` (${r.seconds}s${r.usage?.completion_tokens ? `, ${r.usage.completion_tokens} output tokens` : ""})` : ""}\n`);
    out.push(quote(r?.answer || "_Geen antwoord._") + "\n");
  }
  out.push("**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_\n");
}

process.stdout.write(out.join("\n"));
