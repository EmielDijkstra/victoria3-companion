<script lang="ts">
	// Learn: Trade. Three layers: the game's own concepts, our knowledge sheet (strategy), and
	// what it means for the player's country, with the trade advice.
	import { isSubsidy, type Advice } from '../advice/rules';
	import { gameName, money } from '../advice/texts';
	import { locale } from '../i18n/locale.svelte';
	import { TRADE } from '../learn/trade';
	import type { Snapshot, TradedGood } from '../snapshot';
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
	const trade = $derived(snapshot.trade);

	const TRADE_ADVICE = new Set([
		'trade-capacity-full',
		'subsidized-export',
		'import-what-you-make'
	]);
	const tradeAdvice = $derived(advice.filter((a) => TRADE_ADVICE.has(a.id)));
	const concepts = $derived(TRADE.concepts.filter((c) => knowledge.concept(c)));
	const imports = $derived(trade ? trade.goods.filter((g) => g.net < 0).slice(0, 5) : []);
	const exports = $derived(
		trade
			? trade.goods
					.filter((g) => g.net > 0)
					.reverse()
					.slice(0, 5)
			: []
	);
	const place = (key: string) => stateNames[key] ?? gameName(key);
	const fmt = (n: number) => n.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-GB');
	const policy = (p: string) => (p ? gameName(p) : '–');
	const pct = (used: number, capacity: number) =>
		Math.min(100, Math.round((used / capacity) * 100));
</script>

{#snippet goodRow(g: TradedGood)}
	<tr>
		<td class="text-ink-strong">{gameName(g.good)}</td>
		<td class="num">{g.net > 0 ? '+' : ''}{fmt(g.net)}</td>
		<td class="num">{fmt(g.localPrice)}</td>
		<td class="num text-ink-dim">{g.worldPrice ? fmt(g.worldPrice) : '–'}</td>
	</tr>
{/snippet}

<h3 class="sub" data-learn-topic="trade">{t.learnTrade}</h3>

<!-- 1. Concepts, explained by the game itself -->
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

<!-- 2. How it works and what is smart (knowledge sheet) -->
<ul class="points">
	{#each TRADE.points[lang] as point, i (i)}
		<li><GameText text={point} /></li>
	{/each}
</ul>
<p class="source">
	{TRADE.checked ? t.sheetChecked(TRADE.checked) : t.sheetUnchecked(TRADE.version)}
</p>

<!-- 3. Your country -->
{#if trade}
	<h3 class="sub">{t.learnYourCountry(snapshot.country.name)}</h3>
	{#if trade.states.length > 0}
		<p class="label">Trade Capacity</p>
		<ul class="mb-2 flex flex-col gap-1">
			{#each trade.states as s (s.state)}
				<li class="flex items-center gap-2 text-[14px]" data-trade-capacity={s.state}>
					<span class="w-[108px] truncate text-ink-strong">{place(s.state)}</span>
					<span class="bar" class:full={s.used >= s.capacity * 0.95}
						><span style="width: {pct(s.used, s.capacity)}%"></span></span
					>
					<span class="text-ink-dim">{fmt(s.used)}/{fmt(s.capacity)}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if imports.length > 0 || exports.length > 0}
		<table class="goods">
			<thead>
				<tr>
					<th></th>
					<th class="num">{t.tradeVolume}</th>
					<th class="num">{t.tradePriceHere}</th>
					<th class="num">{t.tradePriceWorld}</th>
				</tr>
			</thead>
			{#if imports.length > 0}
				<tbody>
					<tr><td colspan="4" class="group">{t.tradeImports}</td></tr>
					{#each imports as g (g.good)}{@render goodRow(g)}{/each}
				</tbody>
			{/if}
			{#if exports.length > 0}
				<tbody>
					<tr><td colspan="4" class="group">{t.tradeExports}</td></tr>
					{#each exports as g (g.good)}{@render goodRow(g)}{/each}
				</tbody>
			{/if}
		</table>
	{/if}

	{@const subsidies = trade.goods.filter(
		(g) => isSubsidy(g.importPolicy) || isSubsidy(g.exportPolicy)
	)}
	{#if subsidies.length > 0}
		<p class="label mt-2">Subventions</p>
		<p class="text-[14px] leading-snug">
			{subsidies
				.map(
					(g) =>
						`${gameName(g.good)}: ${isSubsidy(g.importPolicy) ? `import ${policy(g.importPolicy)}` : `export ${policy(g.exportPolicy)}`}`
				)
				.join(' · ')}
		</p>
	{/if}

	<p class="mt-2 text-[14px] leading-snug text-ink-dim">
		{t.tradeCenters(
			trade.tradeCenters.levels,
			money(trade.tradeCenters.revenue, lang),
			money(trade.tradeCenters.tariffs, lang)
		)}
		{#if trade.partners.length > 0}
			{t.tradePartners(trade.partners.join(', '))}
		{/if}
	</p>
{:else}
	<p class="mt-2 text-[14px] text-ink-dim">{t.tradeNoData}</p>
{/if}

<!-- Trade advice -->
{#if tradeAdvice.length > 0}
	<h3 class="sub">{t.learnAdvice}</h3>
	<AdviceList advice={tradeAdvice} {stateNames} gameVersion={snapshot.gameVersion} />
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
	.bar {
		position: relative;
		flex: none;
		width: 90px;
		height: 7px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.35);
		box-shadow: inset 0 0 0 1px rgba(255, 240, 200, 0.12);
		overflow: hidden;
	}
	.bar > span {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--color-good);
	}
	.bar.full > span {
		background: var(--color-warn);
	}
	.goods {
		width: 100%;
		font-size: 14px;
		border-collapse: collapse;
	}
	.goods th {
		font-weight: 500;
		font-size: 12.5px;
		color: var(--color-ink-dim);
		text-align: left;
	}
	.goods td,
	.goods th {
		padding: 1px 4px 1px 0;
	}
	.goods .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.goods .group {
		padding-top: 6px;
		font-size: 12.5px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-ink-dim);
	}
</style>
