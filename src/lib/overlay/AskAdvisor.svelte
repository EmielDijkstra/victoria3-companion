<script lang="ts">
	// "Ask more": a small conversation with the AI advisor about one advice or Learn topic. The
	// answers stream in and carry a clear label: AI, not checked. Nothing is stored; a new save
	// (another game date) starts afresh.
	import {
		buildAdvisorMessages,
		compactFacts,
		conceptsFor,
		type AdvisorSubject,
		type ChatMessage
	} from '../advisor/prompt';
	import { locale } from '../i18n/locale.svelte';
	import type { Snapshot } from '../snapshot';
	import { advisor, answerParagraphs } from './advisor.svelte';
	import GameText from './GameText.svelte';
	import { knowledge } from './knowledge.svelte';

	let { subject, snapshot }: { subject: AdvisorSubject; snapshot: Snapshot } = $props();
	const t = $derived(locale.t);
	const lang = $derived(locale.current);

	type Turn = {
		question: string;
		answer: string;
		state: 'streaming' | 'done' | 'error';
		code?: 'no-key' | 'busy' | 'limit' | 'failed';
	};
	let open = $state(false);
	let turns = $state<Turn[]>([]);
	let input = $state('');
	let currentId: string | null = null;
	const busy = $derived(turns.at(-1)?.state === 'streaming');

	// A new save means new figures: start the conversation afresh
	let forDate = '';
	$effect(() => {
		if (snapshot.date !== forDate) {
			forDate = snapshot.date;
			if (currentId) advisor.cancel(currentId);
			turns = [];
		}
	});

	const presets = $derived(
		subject.kind === 'advice'
			? [t.askWhy, t.askWhatIf, t.askConcepts]
			: [t.askFirst, t.askSimpler, t.askConcepts]
	);

	function ask(question: string) {
		const q = question.trim();
		if (!q || busy) return;
		const history: ChatMessage[] = turns
			.filter((x) => x.state === 'done')
			.flatMap((x) => [
				{ role: 'user' as const, content: x.question },
				{ role: 'assistant' as const, content: x.answer }
			]);
		const messages = buildAdvisorMessages({
			subject,
			facts: compactFacts(snapshot),
			gameVersion: snapshot.gameVersion,
			locale: lang,
			concepts: conceptsFor(subject, knowledge.current?.concepts ?? {}),
			history,
			question: q
		});
		turns.push({ question: q, answer: '', state: 'streaming' });
		const index = turns.length - 1;
		input = '';
		currentId = advisor.ask(messages, (event) => {
			const turn = turns[index];
			if (!turn) return;
			if (event.type === 'text') turn.answer += event.text;
			else if (event.type === 'done') turn.state = 'done';
			else {
				turn.state = 'error';
				turn.code = event.code;
			}
		});
		// Typing took the keyboard from the game: give it back
		advisor.releaseFocus();
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			ask(input);
		}
	}

	const errorText = (code: Turn['code']) =>
		({
			'no-key': t.askNoKey,
			busy: t.askBusy,
			limit: t.askLimit,
			failed: t.askFailed
		})[code ?? 'failed'];
</script>

{#if advisor.available}
	{#if !open}
		<button type="button" class="ask-btn" data-ask-open onclick={() => (open = true)}
			>💬 {t.askMore}</button
		>
	{:else}
		<div class="ask" data-ask>
			{#each turns as turn, i (i)}
				<p class="question">{turn.question}</p>
				{#if turn.state === 'error'}
					<p class="error" data-ask-error={turn.code}>{errorText(turn.code)}</p>
				{:else}
					<div class="answer" data-ask-answer>
						{#each answerParagraphs(turn.answer) as para, p (p)}
							<p><GameText text={para} /></p>
						{/each}
						{#if turn.state === 'streaming' && !turn.answer}
							<p class="text-ink-dim">{t.askThinking}</p>
						{/if}
					</div>
					{#if turn.state === 'done'}
						<p class="label">{t.askLabel}</p>
					{/if}
				{/if}
			{/each}

			{#if !busy}
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					{#each presets as preset (preset)}
						<button type="button" class="preset" onclick={() => ask(preset)}>{preset}</button>
					{/each}
				</div>
				<div class="mt-1.5 flex gap-1.5">
					<input
						class="field"
						type="text"
						maxlength="400"
						placeholder={t.askPlaceholder}
						bind:value={input}
						onkeydown={onKey}
					/>
					<button type="button" class="preset" data-ask-send onclick={() => ask(input)}
						>{t.askSend}</button
					>
				</div>
			{/if}
			<button
				type="button"
				class="close"
				onclick={() => {
					if (currentId) advisor.cancel(currentId);
					open = false;
				}}>{t.askClose}</button
			>
		</div>
	{/if}
{/if}

<style>
	.ask-btn {
		display: inline-block;
		margin-top: 6px;
		padding: 2px 10px;
		border: 1px solid rgba(242, 163, 75, 0.45);
		border-radius: 4px;
		background: rgba(242, 163, 75, 0.08);
		color: var(--color-concept);
		font: 500 14px/1.5 var(--font-serif);
		cursor: pointer;
	}
	.ask-btn:hover {
		background: rgba(242, 163, 75, 0.18);
	}
	.ask {
		margin-top: 8px;
		padding: 8px 10px;
		border-left: 2px solid rgba(242, 163, 75, 0.5);
		background: rgba(0, 0, 0, 0.18);
		border-radius: 0 4px 4px 0;
	}
	.question {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-ink-strong);
	}
	.question:not(:first-child) {
		margin-top: 8px;
	}
	.answer {
		margin-top: 3px;
		font-size: 14.5px;
		line-height: 1.38;
		white-space: pre-line;
	}
	.answer p + p {
		margin-top: 5px;
	}
	.label {
		margin-top: 4px;
		font-size: 12.5px;
		color: var(--color-warn);
	}
	.error {
		margin-top: 3px;
		font-size: 14px;
		color: var(--color-bad);
	}
	.preset {
		padding: 1px 8px;
		border: 1px solid var(--color-panel-edge);
		border-radius: 10px;
		background: rgba(255, 240, 200, 0.05);
		color: var(--color-ink);
		font: 500 13.5px/1.5 var(--font-serif);
		cursor: pointer;
	}
	.preset:hover {
		background: rgba(255, 240, 200, 0.12);
	}
	.field {
		flex: 1;
		min-width: 0;
		padding: 2px 8px;
		border: 1px solid var(--color-panel-edge);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.3);
		color: var(--color-ink-strong);
		font: 14px/1.5 var(--font-serif);
	}
	.close {
		margin-top: 6px;
		border: 0;
		padding: 0;
		background: none;
		color: var(--color-ink-dim);
		font: 13px var(--font-serif);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
