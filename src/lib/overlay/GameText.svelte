<script lang="ts">
	// Text with game terms highlighted in orange, as in the game's own tooltips.
	import { splitGameTerms } from './game-terms';

	let { text }: { text: string } = $props();
	const parts = $derived(splitGameTerms(text));
</script>

{#each parts as part, i (i)}{#if part.term}<span class="text-concept">{part.text}</span
		>{:else}{part.text}{/if}{/each}
