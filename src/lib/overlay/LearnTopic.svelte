<script lang="ts">
	// One Learn topic in four parts: concepts explained by the game, how it works and what is smart
	// (our knowledge sheet), what stands out in the player's country (short explanations, no tables:
	// the game shows the figures itself) and the advice for this topic.
	import type { Advice } from '../advice/rules';
	import { locale } from '../i18n/locale.svelte';
	import type { KnowledgeSheet } from '../learn/sheet';
	import AdviceList from './AdviceList.svelte';
	import GameText from './GameText.svelte';
	import { knowledge } from './knowledge.svelte';

	let {
		topic,
		title,
		sheet,
		insights,
		advice,
		country,
		gameVersion,
		stateNames
	}: {
		topic: string;
		title: string;
		sheet: KnowledgeSheet;
		insights: string[];
		/** Advice of this topic only */
		advice: Advice[];
		country: string;
		gameVersion: string;
		stateNames: Readonly<Record<string, string>>;
	} = $props();
	const t = $derived(locale.t);
	const lang = $derived(locale.current);
	const concepts = $derived(sheet.concepts.filter((c) => knowledge.concept(c)));
</script>

<h3 class="sub" data-learn-topic={topic}>{title}</h3>

{#if concepts.length > 0}
	<p class="mb-1 text-[14px] text-ink-dim">{t.learnConcepts}</p>
	<div class="mb-2 flex flex-wrap gap-1.5">
		{#each concepts as c (c)}
			<button type="button" class="chip" data-concept={c} onclick={() => knowledge.show(c)}
				>{c}</button
			>
		{/each}
	</div>
{/if}

<ul class="points">
	{#each sheet.points[lang] as point, i (i)}
		<li><GameText text={point} /></li>
	{/each}
</ul>
<p class="source">
	{sheet.checked ? t.sheetChecked(sheet.checked) : t.sheetUnchecked(sheet.version)}
</p>

<h3 class="sub">{t.learnStandsOut(country)}</h3>
{#if insights.length > 0 || advice.length > 0}
	{#if insights.length > 0}
		<ul class="points" data-insights>
			{#each insights as insight, i (i)}
				<li><GameText text={insight} /></li>
			{/each}
		</ul>
	{/if}
	{#if advice.length > 0}
		<div class="mt-2">
			<AdviceList {advice} {stateNames} {gameVersion} />
		</div>
	{/if}
{:else}
	<p class="text-[14px] text-ink-dim">{t.learnNothing}</p>
{/if}

<style>
	.sub {
		margin: 12px 0 6px;
		font-size: 15px;
		font-weight: 600;
		color: var(--color-ink-strong);
	}
	.chip {
		padding: 1px 8px;
		border: 1px solid rgba(242, 163, 75, 0.45);
		border-radius: 10px;
		background: rgba(242, 163, 75, 0.08);
		color: var(--color-concept);
		font: 500 13.5px/1.5 var(--font-serif);
		cursor: help;
	}
	.chip:hover {
		background: rgba(242, 163, 75, 0.18);
	}
	.points {
		padding-left: 18px;
		list-style: disc;
		font-size: 14.5px;
		line-height: 1.35;
	}
	.points li + li {
		margin-top: 5px;
	}
	.source {
		margin-top: 6px;
		font-size: 13px;
		color: var(--color-ink-dim);
	}
</style>
