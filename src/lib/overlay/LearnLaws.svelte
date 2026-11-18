<script lang="ts">
	// Learn: Laws. The game's concepts, our knowledge sheet, and per law group the unlocked
	// alternatives with clearly more support than the current law, with who is for and against.
	import type { Advice } from '../advice/rules';
	import { locale } from '../i18n/locale.svelte';
	import { LAWS } from '../learn/laws';
	import type { LawOption, Snapshot } from '../snapshot';
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

	const lawAdvice = $derived(advice.filter((a) => a.id === 'law-with-support'));
	const concepts = $derived(LAWS.concepts.filter((c) => knowledge.concept(c)));
	// Alternatives with more support than the current law, largest difference first
	const chances = $derived(
		(snapshot.laws ?? [])
			.flatMap((g) =>
				g.options
					.filter((o) => o.support > g.activeSupport + 0.1)
					.map((o) => ({ g, o, gain: o.support - g.activeSupport }))
			)
			.sort((a, b) => b.gain - a.gain)
			.slice(0, 6)
	);
	const fmt = (n: number) =>
		n.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-GB', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	const sides = (o: LawOption) => ({
		for: o.stances.filter((s) => s.stance === 'approve' || s.stance === 'strongly_approve'),
		against: o.stances.filter(
			(s) => s.stance === 'disapprove' || s.stance === 'strongly_disapprove'
		)
	});
	const who = (list: LawOption['stances']) =>
		list
			.map(
				(s) =>
					`${s.name}${s.stance.startsWith('strongly') ? ' ++' : ''} (${s.cloutPct.toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-GB')}%)`
			)
			.join(', ');
</script>

<h3 class="sub" data-learn-topic="laws">{t.learnLaws}</h3>

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
	{#each LAWS.points[lang] as point, i (i)}
		<li><GameText text={point} /></li>
	{/each}
</ul>
<p class="source">
	{LAWS.checked ? t.sheetChecked(LAWS.checked) : t.sheetUnchecked(LAWS.version)}
</p>

<h3 class="sub">{t.learnYourCountry(snapshot.country.name)}</h3>
{#if !snapshot.laws}
	<p class="text-[14px] text-ink-dim">{t.lawsNoData}</p>
{:else if chances.length === 0}
	<p class="text-[14px] text-ink-dim">{t.lawsNone}</p>
{:else}
	<p class="mb-1.5 text-[14px] leading-snug text-ink-dim">{t.lawsIntro}</p>
	<ol class="flex flex-col">
		{#each chances as { g, o } (o.law)}
			{@const side = sides(o)}
			<li class="law" data-law={o.law}>
				<div class="text-[15.5px] font-bold text-ink-strong">{o.name}</div>
				<div class="text-[13.5px] text-ink-dim">
					{g.name} · {t.lawsNow(g.activeName)} · {t.lawsSupport(
						fmt(o.support),
						fmt(g.activeSupport)
					)}
				</div>
				{#if side.for.length > 0}
					<p class="mt-0.5 text-[14px] leading-snug">
						<span class="text-good">{t.lawsFor}</span>
						{who(side.for)}
					</p>
				{/if}
				{#if side.against.length > 0}
					<p class="text-[14px] leading-snug">
						<span class="text-bad">{t.lawsAgainst}</span>
						{who(side.against)}
					</p>
				{/if}
				{#if knowledge.current?.laws?.[o.law]}
					<p class="mt-0.5 text-[13.5px] leading-snug text-ink-dim italic">
						{knowledge.current.laws[o.law]}
					</p>
				{/if}
				{#if o.conditions}
					<p class="text-[13px] text-ink-dim">{t.lawsConditions}</p>
				{/if}
			</li>
		{/each}
	</ol>
{/if}

{#if lawAdvice.length > 0}
	<h3 class="sub">{t.lawsAdvice}</h3>
	<AdviceList advice={lawAdvice} {stateNames} gameVersion={snapshot.gameVersion} />
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
	.law {
		border-top: 1px solid rgba(255, 240, 200, 0.08);
		padding-top: 7px;
		margin-top: 7px;
	}
	.law:first-child {
		border-top: 0;
		margin-top: 0;
		padding-top: 0;
	}
</style>
