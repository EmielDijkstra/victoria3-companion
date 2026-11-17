// Spike S5 (#4): answer the test questions with a free model through an
// OpenAI-compatible endpoint (Gemini, Groq, OpenRouter or a local Ollama).
// Same facts, rule findings and instructions as ai.mjs.
//
// Usage:
//   node free-llm.mjs --list-models [--provider=gemini]
//   node free-llm.mjs <facts.json> <outDir> --model=<model> [--provider=gemini]
// Key in .env (repo root): GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY (Ollama needs none).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { rules } from "./rules.mjs";
import { SYSTEM, buildFactsBlock } from "./prompt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "..", "..", ".env"), quiet: true });

const PROVIDERS = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY" },
  ollama: { baseUrl: "http://localhost:11434/v1", keyEnv: null },
};

const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const providerName = opt("provider") ?? "gemini";
const provider = PROVIDERS[providerName];
if (!provider) {
  console.error(`Onbekende provider: ${providerName}. Kies uit: ${Object.keys(PROVIDERS).join(", ")}`);
  process.exit(1);
}
const apiKey = provider.keyEnv ? process.env[provider.keyEnv] : "ollama";
if (!apiKey) {
  console.error(`Geen ${provider.keyEnv} gevonden in .env (in de hoofdmap van de repo).`);
  process.exit(1);
}
const headers = { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (args.includes("--list-models")) {
  const res = await fetch(`${provider.baseUrl}/models`, { headers });
  if (!res.ok) {
    console.error(`Fout ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const { data } = await res.json();
  for (const m of data) console.log(m.id);
  process.exit(0);
}

const [factsPath, outDir] = args.filter((a) => !a.startsWith("--"));
const model = opt("model");
if (!factsPath || !outDir || !model) {
  console.error("Gebruik: node free-llm.mjs <facts.json> <outDir> --model=<model> [--provider=gemini]");
  process.exit(1);
}

const facts = JSON.parse(readFileSync(factsPath, "utf8"));
const questions = JSON.parse(readFileSync(path.join(here, "questions.json"), "utf8"));
const factsBlock = buildFactsBlock(facts, rules(facts));

mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "free-results.json");
const results = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : [];

for (const q of questions) {
  if (results.some((r) => r.model === model && r.question_id === q.id && r.answer)) continue; // resume
  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `${factsBlock}\n\nVRAAG: ${q.question}` },
    ],
  };
  let attempt = 0;
  let data;
  const started = Date.now();
  while (true) {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body) });
    if (res.status === 429 && attempt < 4) {
      // Free tiers: wait for the per-minute limit to reset.
      const wait = Number(res.headers.get("retry-after")) * 1000 || 30000 * (attempt + 1);
      console.log(`${q.id}: limiet bereikt, ${Math.round(wait / 1000)}s wachten…`);
      await sleep(wait);
      attempt++;
      continue;
    }
    if (!res.ok) {
      console.error(`${q.id}: fout ${res.status}: ${(await res.text()).slice(0, 400)}`);
      break;
    }
    data = await res.json();
    break;
  }
  if (!data) continue;
  const answer = data.choices?.[0]?.message?.content?.trim() ?? "";
  const result = {
    provider: providerName, model, question_id: q.id, question: q.question,
    finish_reason: data.choices?.[0]?.finish_reason, seconds: Math.round((Date.now() - started) / 100) / 10,
    usage: data.usage ?? null, cost_usd: 0, answer,
  };
  results.push(result);
  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`${model} ${q.id}: ${result.seconds}s, ${data.usage?.completion_tokens ?? "?"} output tokens`);
  await sleep(4000); // stay well under free per-minute limits
}
console.log(`Klaar: ${results.filter((r) => r.model === model).length} antwoorden van ${model} in ${outFile}`);
