// Spike S5 (#4): answer the test questions with Claude, using the same facts and
// the findings of the fixed rules. Measures tokens and cost per question.
//
// Usage: node ai.mjs <facts.json> <outDir> [--dry-run] [--models=claude-opus-5-5,claude-sonnet-5-5]
// Needs ANTHROPIC_API_KEY in .env (repo root) unless --dry-run.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { rules } from "./rules.mjs";
import { SYSTEM, buildFactsBlock } from "./prompt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "..", "..", ".env"), quiet: true });

const args = process.argv.slice(2);
const [factsPath, outDir] = args.filter((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const models = (args.find((a) => a.startsWith("--models="))?.split("=")[1] ?? "claude-opus-5-5,claude-sonnet-5-5").split(",");
if (!factsPath || !outDir) {
  console.error("Gebruik: node ai.mjs <facts.json> <outDir> [--dry-run] [--models=...]");
  process.exit(1);
}

// $ per million tokens (Claude API, cached 2026-11-03). Cache write = 1.25 × input.
const PRICES = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
};

const facts = JSON.parse(readFileSync(factsPath, "utf8"));
const questions = JSON.parse(readFileSync(path.join(here, "questions.json"), "utf8"));
const findings = rules(facts);

const factsBlock = buildFactsBlock(facts, findings); // shared with free-llm.mjs

console.log(`Feiten + bevindingen: ${factsBlock.length.toLocaleString("nl-NL")} tekens (~${Math.round(factsBlock.length / 3.2).toLocaleString("nl-NL")} tokens), ${questions.length} vragen, modellen: ${models.join(", ")}`);
if (dryRun) {
  console.log("Dry run: er wordt niets naar de API gestuurd.");
  process.exit(0);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Geen ANTHROPIC_API_KEY gevonden in .env (in de hoofdmap van de repo).");
  process.exit(1);
}

const client = new Anthropic();
mkdirSync(outDir, { recursive: true });
const results = [];

for (const model of models) {
  for (const q of questions) {
    const started = Date.now();
    let response;
    try {
      response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default", // re-run on a fallback model if the request is declined
        output_config: { effort: "high" },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: factsBlock, cache_control: { type: "ephemeral" } },
              { type: "text", text: `VRAAG: ${q.question}` },
            ],
          },
        ],
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("De API-sleutel wordt niet geaccepteerd. Controleer ANTHROPIC_API_KEY in .env.");
        process.exit(1);
      }
      if (error instanceof Anthropic.RateLimitError) console.error(`${model} ${q.id}: rate limit, overgeslagen`);
      else if (error instanceof Anthropic.APIError) console.error(`${model} ${q.id}: API-fout ${error.status}: ${error.message}`);
      else throw error;
      continue;
    }

    const seconds = (Date.now() - started) / 1000;
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const u = response.usage;
    const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
    const cost =
      ((u.input_tokens ?? 0) * p.input +
        (u.cache_creation_input_tokens ?? 0) * p.input * 1.25 +
        (u.cache_read_input_tokens ?? 0) * p.cacheRead +
        (u.output_tokens ?? 0) * p.output) / 1e6;
    const result = {
      model, served_by: response.model, question_id: q.id, question: q.question,
      stop_reason: response.stop_reason, seconds: Math.round(seconds * 10) / 10,
      usage: { input: u.input_tokens, cache_write: u.cache_creation_input_tokens, cache_read: u.cache_read_input_tokens, output: u.output_tokens },
      cost_usd: Math.round(cost * 10000) / 10000,
      answer: response.stop_reason === "refusal" ? "(geweigerd)" : text,
    };
    results.push(result);
    console.log(`${model} ${q.id}: ${result.seconds}s, $${result.cost_usd}, ${u.output_tokens} output tokens${response.model !== model ? `, beantwoord door ${response.model}` : ""}`);
    writeFileSync(path.join(outDir, "ai-results.json"), JSON.stringify(results, null, 2));
  }
}

const total = results.reduce((s, r) => s + r.cost_usd, 0);
console.log(`Klaar: ${results.length} antwoorden, totaal $${total.toFixed(3)}`);
