<script lang="ts">
	// Learn: Population. The game's concepts, our knowledge sheet, and the player's population:
	// professions, how expensive the basic needs are, food security and half-empty buildings.
	import type { Advice } from '../advice/rules';
	import { gameName } from '../advice/texts';
	import { locale } from '../i18n/locale.svelte';
	import { POPULATION } from '../learn/population';
	import type { Snapshot } from '../snapshot';
	import AdviceList from './AdviceList.svelte';
	import GameText from './GameText.svelte';
	import { knowledge } from './knowledge.svelte';

	let {
		snapshot,
		advice,
		stateNames
	}: { snapshot: Snapshot; advice: Advice[]; stateNames: Readonly<Record<string, string>> } =
		$props();
	const t = $derived(locale.t);
	const lang = $derived(locale.current);
	const people = $derived(snapshot.people);

	const PEOPLE_ADVICE = new Set(['dear-basic-needs', 'understaffed', 'unemployment']);
	const peopleAdvice = $derived(advice.filter((a) => PEOPLE_ADVICE.has(a.id)));
	const concepts = $derived(POPULATION.concepts.filter((c) => knowledge.concept(c)));
	const total = $derived(people ? people.professions.reduce((n, p) => n + p.workforce, 0) : 0);
	const fmt = (n: number, digits = 0) =>
		n.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: digits });
	const place = (key: string) => stateNames[key] ?? gameName(key);
	const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
</script>

<h3 class="sub" data-learn-topic="population">{t.learnPopulation}</h3>

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
	{#each POPULATION.points[lang] as point, i (i)}
		<li><GameText text={point} /></li>
	{/each}
</ul>
<p class="source">
	{POPULATION.checked ? t.sheetChecked(POPULATION.checked) : t.sheetUnchecked(POPULATION.version)}
</p>

<h3 class="sub">{t.learnYourCountry(snapshot.country.name)}</h3>
<p class="text-[14px] leading-snug">
	<GameText
		text={t.peopleSummary(
			fmt(snapshot.population.standardOfLiving, 1),
			fmt(snapshot.population.literacyPct, 1),
			fmt(snapshot.population.unemployedPct, 1)
		)}
	/>
</p>

{#if people}
	<p class="label mt-2">{t.peopleProfessions}</p>
	<ul class="flex flex-col gap-0.5">
		{#each people.professions.slice(0, 8) as p (p.type)}
			<li class="flex items-center gap-2 text-[14px]" data-profession={p.type}>
				<span class="w-[98px] truncate text-ink-strong">{gameName(p.type)}</span>
				<span class="bar"><span style="width: {pct(p.workforce)}%"></span></span>
				<span class="text-ink-dim">{fmt(p.workforce)}</span>
			</li>
		{/each}
	</ul>

	<p class="label mt-2">{t.peopleNeeds}</p>
	<ul class="flex flex-col gap-0.5 text-[14px]">
		{#each people.needs as n (n.need)}
			<li data-need={n.need}>
				<span class="text-ink-strong">{n.name}</span>
				<span class={n.vsBasePct >= 25 ? 'text-bad' : n.vsBasePct >= 10 ? 'text-warn' : 'text-good'}
					>{n.vsBasePct >= 0 ? '+' : ''}{n.vsBasePct}%</span
				>
				<span class="text-ink-dim"
					>· {n.goods
						.slice(0, 3)
						.map((gd) => `${gameName(gd.good)} ${gd.vsBasePct >= 0 ? '+' : ''}${gd.vsBasePct}%`)
						.join(', ')}</span
				>
			</li>
		{/each}
	</ul>

	{#if people.foodSecurity.length > 0}
		<p class="label mt-2">Food security</p>
		<p class="text-[14px]">
			{people.foodSecurity.map((f) => `${place(f.state)} ${fmt(f.value, 2)}`).join(' · ')}
		</p>
	{/if}
{:else}
	<p class="mt-2 text-[14px] text-ink-dim">{t.peopleNoData}</p>
{/if}

{#if peopleAdvice.length > 0}
	<h3 class="sub">{t.peopleAdvice}</h3>
	<AdviceList advice={peopleAdvice} {stateNames} gameVersion={snapshot.gameVersion} />
{/if}

<style>
	.sub {
		margin: 12px 0 6px;
		font-size: 15px;
		font-weight: 600;
		color: var(--color-ink-strong);
	}
	.label {
		margin-bottom: 3px;
		font-size: 12.5px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-ink-dim);
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
		background: var(--color-concept);
	}
</style>
