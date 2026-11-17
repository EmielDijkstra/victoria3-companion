<script lang="ts">
	import type { Advice } from '../advice/rules';
	import { adviceText, LEVEL_LABEL } from '../advice/texts';
	import { locale } from '../i18n/locale.svelte';
	import GameText from './GameText.svelte';

	let {
		advice,
		stateNames = {}
	}: { advice: Advice[]; stateNames?: Readonly<Record<string, string>> } = $props();
	const t = $derived(locale.t);
	const lang = $derived(locale.current);
</script>

{#if advice.length === 0}
	<p class="text-[15px] leading-snug text-ink-dim">{t.noAdvice}</p>
{:else}
	<ol class="flex flex-col">
		{#each advice as item, i (item.id + i)}
			{@const text = adviceText(item, lang, stateNames)}
			<li class="advice" data-advice={item.id}>
				<div class="grid grid-cols-[26px_1fr] items-start gap-2">
					<span class="rank {item.level}">{i + 1}</span>
					<div>
						<div class="text-[12.5px] tracking-wider text-ink-dim uppercase">
							{LEVEL_LABEL[lang][item.level]}
						</div>
						<div class="text-[17px] leading-tight font-bold text-ink-strong">{text.title}</div>
					</div>
				</div>
				<div class="mt-1.5 ml-[34px] flex flex-col gap-1.5">
					<p class="text-[15px] leading-snug"><GameText text={text.why} /></p>
					{#if text.caveat}
						<p class="text-[15px] leading-snug text-ink-dim">
							<span class="font-semibold text-warn">{t.caveatPrefix}</span>
							<GameText text={text.caveat} />
						</p>
					{/if}
					{#if text.how.length > 0}
						<details>
							<summary>{t.howTo}</summary>
							<ol class="mt-1.5 list-decimal pl-5 text-[15px] leading-snug">
								{#each text.how as step, s (s)}
									<li><GameText text={step} /></li>
								{/each}
							</ol>
						</details>
					{/if}
				</div>
			</li>
		{/each}
	</ol>
{/if}

<style>
	.advice {
		border-top: 1px solid rgba(255, 240, 200, 0.08);
		padding-top: 10px;
		margin-top: 10px;
	}
	.advice:first-child {
		border-top: 0;
		margin-top: 0;
		padding-top: 0;
	}

	.rank {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		margin-top: 2px;
		border-radius: 50%;
		font-size: 14px;
		font-weight: 700;
		color: #1d1a15;
	}
	.rank.urgent {
		background: var(--color-bad);
	}
	.rank.warn {
		background: var(--color-warn);
	}
	.rank.smart {
		background: var(--color-concept);
	}
	.rank.patience {
		background: var(--color-good);
	}
	.rank.consider {
		background: var(--color-ink-dim);
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
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		filter: brightness(1.12);
	}
</style>
