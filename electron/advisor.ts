// The AI advisor in the main process: the API key never reaches the page. Gemini through its
// OpenAI-compatible endpoint, streamed, with a short retry when the model is busy (spike S5).
import { readFileSync } from 'node:fs';
import type { ChatMessage } from '../src/lib/advisor/prompt';

export type AdvisorError = 'no-key' | 'busy' | 'limit' | 'failed';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_MODEL = 'gemini-3.6-flash';

/** KEY=value lines; quotes around the value are removed. Comments and empty lines are skipped. */
export function parseEnv(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
	}
	return out;
}

/** First non-empty value: the process environment, then the given .env files in order. */
export function readSetting(name: string, envFiles: string[]): string | null {
	if (process.env[name]) return process.env[name] ?? null;
	for (const file of envFiles) {
		try {
			const value = parseEnv(readFileSync(file, 'utf8'))[name];
			if (value) return value;
		} catch {
			// file missing: try the next one
		}
	}
	return null;
}

/** Text pieces from a server-sent-events stream of the chat endpoint. */
export function* textFromSse(lines: string[]): Generator<string> {
	for (const line of lines) {
		if (!line.startsWith('data:')) continue;
		const data = line.slice(5).trim();
		if (!data || data === '[DONE]') continue;
		try {
			const json = JSON.parse(data);
			const piece = json?.choices?.[0]?.delta?.content;
			if (typeof piece === 'string' && piece) yield piece;
		} catch {
			// a partial or unknown line: ignore
		}
	}
}

export interface AskOptions {
	apiKey: string | null;
	model?: string;
	messages: ChatMessage[];
	onText: (piece: string) => void;
	signal?: AbortSignal;
	fetchImpl?: typeof fetch;
	/** Waits before a retry when the model is busy (ms); short, the player is waiting */
	retryWaits?: number[];
}

/** Streams the answer; resolves with null when done, or with an error code. */
export async function askAdvisor(opts: AskOptions): Promise<AdvisorError | null> {
	if (!opts.apiKey) return 'no-key';
	const doFetch = opts.fetchImpl ?? fetch;
	// Free tokens are scarce: at most one retry, and only when the model was busy or unreachable
	const waits = opts.retryWaits ?? [4000];
	const body = JSON.stringify({
		model: opts.model ?? DEFAULT_MODEL,
		stream: true,
		messages: opts.messages
	});
	for (let attempt = 0; ; attempt++) {
		let res: Response;
		try {
			res = await doFetch(`${BASE_URL}/chat/completions`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
				body,
				signal: opts.signal
			});
		} catch {
			if (opts.signal?.aborted) return null;
			if (attempt < waits.length) {
				await new Promise((r) => setTimeout(r, waits[attempt]));
				continue;
			}
			return 'failed';
		}
		// Over the free limit: never retry by itself, the player decides when to ask again
		if (res.status === 429) return 'limit';
		if (res.status === 503) {
			if (attempt < waits.length) {
				await new Promise((r) => setTimeout(r, waits[attempt]));
				continue;
			}
			return 'busy';
		}
		if (res.status === 401 || res.status === 403) return 'no-key';
		if (!res.ok || !res.body) return 'failed';

		const decoder = new TextDecoder();
		let buffer = '';
		try {
			for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
				buffer += decoder.decode(chunk, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const piece of textFromSse(lines)) opts.onText(piece);
			}
			for (const piece of textFromSse([buffer])) opts.onText(piece);
		} catch {
			return opts.signal?.aborted ? null : 'failed';
		}
		return null;
	}
}
