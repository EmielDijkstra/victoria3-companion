<script lang="ts">
	// The explanation of one game concept, from the installed game. Stays at the bottom of the
	// panel while the list scrolls; terms inside are clickable again.
	import { locale } from '../i18n/locale.svelte';
	import GameText from './GameText.svelte';
	import { knowledge } from './knowledge.svelte';

	const t = $derived(locale.t);
	const concept = $derived(knowledge.open);

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && knowledge.open) knowledge.close();
	}
</script>

<svelte:window onkeydown={onKey} />

{#if concept}
	<aside class="card" data-concept-card aria-label={concept.name}>
		<div class="flex items-baseline justify-between gap-2">
			<h3 class="text-[16px] font-bold text-concept">{concept.name}</h3>
			<button type="button" class="close" title={t.close} onclick={() => knowledge.close()}
				>×</button
			>
		</div>
		<div class="body">
			{#each concept.description.split(/\n{2,}/) as para, i (i)}
				<p><GameText text={para} /></p>
			{/each}
		</div>
		<p class="mt-1.5 text-[12.5px] text-ink-dim">
			{t.conceptFromGame(knowledge.current?.version ?? '?')}
		</p>
	</aside>
{/if}

<style>
	.card {
		position: sticky;
		bottom: 0;
		z-index: 2;
		margin-top: 10px;
		padding: 8px 10px 9px;
		border: 1px solid var(--color-panel-edge-light);
		border-radius: 5px;
		background: linear-gradient(180deg, var(--color-panel-top), var(--color-panel-bottom));
		box-shadow: 0 -6px 14px rgba(0, 0, 0, 0.45);
	}
	.body {
		max-height: 210px;
		overflow-y: auto;
		margin-top: 4px;
		font-size: 14.5px;
		line-height: 1.35;
	}
	.body p + p {
		margin-top: 5px;
	}
	.close {
		border: 0;
		background: none;
		color: var(--color-ink-dim);
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
	}
	.close:hover {
		color: var(--color-ink-strong);
	}
</style>
