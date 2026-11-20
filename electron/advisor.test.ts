import { describe, expect, it } from 'vitest';
import { askAdvisor, parseEnv, textFromSse } from './advisor';

const sse = (pieces: string[]) =>
	pieces
		.map((p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`)
		.join('') + 'data: [DONE]\n\n';

function streamResponse(text: string, status = 200) {
	const bytes = new TextEncoder().encode(text);
	// Split into odd-sized chunks, like a network does
	const chunks = [bytes.slice(0, 17), bytes.slice(17, 60), bytes.slice(60)];
	return new Response(
		new ReadableStream({
			start(controller) {
				for (const c of chunks) controller.enqueue(c);
				controller.close();
			}
		}),
		{ status }
	);
}

describe('parseEnv', () => {
	it('reads keys, strips quotes, skips comments', () => {
		expect(parseEnv('\uFEFF# comment\nGEMINI_API_KEY="abc"\nEMPTY=\nOTHER = x y \n')).toEqual({
			GEMINI_API_KEY: 'abc',
			EMPTY: '',
			OTHER: 'x y'
		});
	});
});

describe('textFromSse', () => {
	it('takes the text pieces and ignores done markers and junk', () => {
		expect([
			...textFromSse([
				'data: {"choices":[{"delta":{"content":"Hoi"}}]}',
				'data: [DONE]',
				': ping',
				'data: {bad'
			])
		]).toEqual(['Hoi']);
	});
});

describe('askAdvisor', () => {
	const messages = [{ role: 'user' as const, content: 'Waarom?' }];

	it('needs a key', async () => {
		expect(await askAdvisor({ apiKey: null, messages, onText: () => {} })).toBe('no-key');
	});

	it('streams the answer piece by piece, across chunk borders', async () => {
		const pieces: string[] = [];
		const result = await askAdvisor({
			apiKey: 'test',
			messages,
			onText: (p) => pieces.push(p),
			fetchImpl: async () => streamResponse(sse(['Omdat ', 'je Construction ', 'stilstaat.']))
		});
		expect(result).toBeNull();
		expect(pieces.join('')).toBe('Omdat je Construction stilstaat.');
	});

	it('retries when the model is busy, then gives up with a code', async () => {
		let calls = 0;
		const busy = await askAdvisor({
			apiKey: 'test',
			messages,
			onText: () => {},
			retryWaits: [1],
			fetchImpl: async () => {
				calls++;
				return new Response('busy', { status: 503 });
			}
		});
		expect(busy).toBe('busy');
		// One request and at most one retry: free tokens are scarce
		expect(calls).toBe(2);

		let first = true;
		const pieces: string[] = [];
		const recovered = await askAdvisor({
			apiKey: 'test',
			messages,
			onText: (p) => pieces.push(p),
			retryWaits: [1],
			fetchImpl: async () => {
				if (first) {
					first = false;
					return new Response('busy', { status: 503 });
				}
				return streamResponse(sse(['Ok.']));
			}
		});
		expect(recovered).toBeNull();
		expect(pieces).toEqual(['Ok.']);
	});

	it('never retries by itself when the free limit is reached', async () => {
		let calls = 0;
		const result = await askAdvisor({
			apiKey: 'test',
			messages,
			onText: () => {},
			retryWaits: [1, 1],
			fetchImpl: async () => {
				calls++;
				return new Response('slow down', { status: 429 });
			}
		});
		expect(result).toBe('limit');
		expect(calls).toBe(1);
	});

	it('treats a rejected key as no key', async () => {
		const result = await askAdvisor({
			apiKey: 'wrong',
			messages,
			onText: () => {},
			fetchImpl: async () => new Response('no', { status: 403 })
		});
		expect(result).toBe('no-key');
	});
});
