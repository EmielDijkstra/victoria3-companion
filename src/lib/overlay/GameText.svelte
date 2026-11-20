<script lang="ts">
	// Text with game terms highlighted in orange, as in the game's own tooltips. A term the
	// installed game explains is a button that opens its concept card.
	import { splitGameTerms } from './game-terms';
	import { knowledge } from './knowledge.svelte';

	let { text }: { text: string } = $props();
	const parts = $derived(splitGameTerms(text, knowledge.names));
</script>

{#each parts as part, i (i)}{#if part.term && knowledge.concept(part.text)}<button
			type="button"
			class="concept-link"
			data-concept={part.text}
			onclick={() => knowledge.show(part.text)}>{part.text}</button
		>{:else if part.term}<span class="text-concept">{part.text}</span>{:else}{part.text}{/if}{/each}

<style>
	.concept-link {
		display: inline;
		border: 0;
		padding: 0;
		background: none;
		font: inherit;
		color: var(--color-concept);
		text-decoration: underline dotted;
		text-underline-offset: 3px;
		cursor: help;
	}
	.concept-link:hover {
		filter: brightness(1.15);
	}
</style>
