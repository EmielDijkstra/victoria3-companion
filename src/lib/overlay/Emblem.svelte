<script lang="ts">
	// Own emblem: scales on a burgundy shield with a gold rim (no game assets).
	let { size = 42 }: { size?: number } = $props();
	const id = Math.random().toString(36).slice(2, 8);
</script>

<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" class="flex-none">
	<defs>
		<radialGradient id="eg-{id}" cx="50%" cy="40%" r="60%">
			<stop offset="0" stop-color="#7a2f38" />
			<stop offset="1" stop-color="#3e1419" />
		</radialGradient>
		<linearGradient id="gold-{id}" x1="0" x2="0" y1="0" y2="1">
			<stop offset="0" stop-color="#f0d39a" />
			<stop offset="1" stop-color="#9c7438" />
		</linearGradient>
	</defs>
	<circle cx="24" cy="24" r="22" fill="url(#eg-{id})" stroke="url(#gold-{id})" stroke-width="3" />
	<path
		d="M24 12 v24 M14 18 h20 M14 18 l-4 9 h8 z M34 18 l-4 9 h8 z"
		stroke="url(#gold-{id})"
		stroke-width="2.4"
		fill="none"
		stroke-linejoin="round"
	/>
	<rect x="18" y="35" width="12" height="3" rx="1" fill="url(#gold-{id})" />
</svg>
