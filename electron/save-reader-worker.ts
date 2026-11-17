// Worker thread: convert a save with Rakaly and summarize it, so the overlay stays responsive.
// Input: { savePath, rakalyPath, fileName }. Output: { ok: true, summary } or { ok: false, message }.
import { spawn } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';
import type { GoodDefinition } from './game-data';
import { summarizeSave } from './save-summary';
import { buildSnapshot } from './snapshot';

interface Input {
	savePath: string;
	rakalyPath: string;
	fileName: string;
	goods: GoodDefinition[] | null;
}

function runRakalyJson(rakalyPath: string, savePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(rakalyPath, ['json', savePath], { windowsHide: true });
		const chunks: Buffer[] = [];
		let stderr = '';
		child.stdout.on('data', (c: Buffer) => chunks.push(c));
		child.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
			else reject(new Error(stderr.trim() || `Rakaly exited with code ${code}`));
		});
	});
}

async function main() {
	const { savePath, rakalyPath, fileName, goods } = workerData as Input;
	const started = Date.now();
	try {
		const json = await runRakalyJson(rakalyPath, savePath);
		const save = JSON.parse(json);
		const snapshot = buildSnapshot(save, goods);
		const summary = summarizeSave(save, {
			fileName,
			readAt: new Date().toISOString(),
			durationMs: Date.now() - started
		});
		parentPort?.postMessage({ ok: true, summary, snapshot });
	} catch (error) {
		parentPort?.postMessage({
			ok: false,
			message: error instanceof Error ? error.message : String(error)
		});
	}
}

main();
