<script lang="ts">
	// What the game itself asks of the player right now (active journal entries), with the
	// official tutorial steps from the installed game.
	import type { JournalText } from '../knowledge';
	import type { JournalProgress } from '../snapshot';
	import { locale } from '../i18n/locale.svelte';
	import GameText from './GameText.svelte';
	import { knowledge } from './knowledge.svelte';

	let { journal }: { journal: JournalProgress[] } = $props();
	const t = $derived(locale.t);
	const lang = $derived(locale.current);

	type Goal = JournalProgress & { text: JournalText };
	const goals = $derived.by(() => {
		const texts = knowledge.current?.journal ?? {};
		const known: Goal[] = journal
			.filter((j) => texts[j.type])
			.map((j) => ({ ...j, text: texts[j.type] }));
		const withHelp = (g: Goal) => g.text.how.length + g.text.why.length > 0;
		return {
			// Goals with an explanation first, then goals with progress
			main: [...known.filter(withHelp), ...known.filter((g) => !withHelp(g) && g.goal > 0)],
			rest: known.filter((g) => !withHelp(g) && g.goal <= 0)
		};
	});

	const compact = (n: number) =>
		n.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-GB', {
			notation: 'compact',
			maximumFractionDigits: 2
		});
	const pct = (g: JournalProgress) =>
		Math.max(0, Math.min(100, Math.round((g.value / g.goal) * 100)));
	const paragraphs = (text: string) => text.split(/\n{2,}/);
</script>

{#if goals.main.length > 0 || goals.rest.length > 0}
	<p class="mb-2 text-[14px] leading-snug text-ink-dim">{t.goalsIntro}</p>
	<ol class="flex flex-col">
		{#each goals.main as goal (goal.type)}
			<li class="goal" data-goal={goal.type}>
				<div class="text-[16.5px] leading-tight font-bold text-ink-strong">
					<GameText text={goal.text.name} />
				</div>
				{#if goal.goal > 0}
					<div class="mt-1.5 flex items-center gap-2 text-[13.5px] text-ink-dim">
						<span class="bar" aria-hidden="true"><span style="width: {pct(goal)}%"></span></span>
						<span data-goal-progress
							>{compact(goal.value)} / {compact(goal.goal)} ({pct(goal)}%)</span
						>
					</div>
				{/if}
				{#if goal.text.how.length > 0 || goal.text.why.length > 0}
					<div class="mt-1.5 flex flex-wrap gap-1.5">
						{#if goal.text.how.length > 0}
							<details class="w-full">
								<summary>{t.howTo}</summary>
								<ol class="steps">
									{#each goal.text.how as step, s (s)}
										<li>
											{#each paragraphs(step) as para, p (p)}
												<p><GameText text={para} /></p>
											{/each}
										</li>
									{/each}
								</ol>
								<p class="source">{t.goalFromGame(knowledge.current?.version ?? '?')}</p>
							</details>
						{/if}
						{#if goal.text.why.length > 0}
							<details class="w-full">
								<summary>{t.goalWhy}</summary>
								{#each goal.text.why as page, s (s)}
									{#each paragraphs(page) as para, p (p)}
										<p class="mt-1.5 text-[14.5px] leading-snug"><GameText text={para} /></p>
									{/each}
								{/each}
								<p class="source">{t.goalFromGame(knowledge.current?.version ?? '?')}</p>
							</details>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
	{#if goals.rest.length > 0}
		<details class="mt-2 text-[14px] text-ink-dim">
			<summary class="plain">{t.moreGoals(goals.rest.length)}</summary>
			<ul class="mt-1 list-disc pl-5">
				{#each goals.rest as goal (goal.type)}
					<li>{goal.text.name}</li>
				{/each}
			</ul>
		</details>
	{/if}
{/if}

<style>
	.goal {
		border-top: 1px solid rgba(255, 240, 200, 0.08);
		padding-top: 10px;
		margin-top: 10px;
	}
	.goal:first-child {
		border-top: 0;
		margin-top: 0;
		padding-top: 0;
	}

	.bar {
		position: relative;
		flex: none;
		width: 110px;
		height: 7px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.35);
		box-shadow: inset 0 0 0 1px rgba(255, 240, 200, 0.12);
		overflow: hidden;
	}
	.bar > span {
		position: absolute;
		inset: 0 auto 0 0;
		background: linear-gradient(180deg, var(--color-good), #6f9a4f);
	}

	.steps {
		margin-top: 6px;
		padding-left: 20px;
		list-style: decimal;
		font-size: 14.5px;
		line-height: 1.35;
	}
	.steps li + li {
		margin-top: 6px;
	}
	.steps p + p {
		margin-top: 4px;
	}

	.source {
		margin-top: 6px;
		font-size: 13px;
		color: var(--color-ink-dim);
	}

	summary {
		display: inline-block;
		list-style: none;
		cursor: pointer;
		padding: 2px 10px;
		border: 1px solid var(--color-button-edge);
		border-radius: 4px;
		background: linear-gradient(180deg, var(--color-button-top), var(--color-button-bottom));
		color: #f1f4e4;
		font: 500 14.5px/1.5 var(--font-serif);
	}
	summary.plain {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: underline;
	}
	summary::-webkit-details-marker {
		display: none;
	}
</style>
