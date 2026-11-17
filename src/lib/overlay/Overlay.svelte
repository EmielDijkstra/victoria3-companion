<script lang="ts">
	import { onMount } from 'svelte';
	import Emblem from './Emblem.svelte';
	import { InteractionSync } from './interaction';

	type View = 'collapsed' | 'expanded' | 'hidden';

	let view = $state<View>('collapsed');
	let root: HTMLDivElement;
	let clickThrough = $state(false);

	const bridge = typeof window !== 'undefined' ? window.overlayBridge : undefined;
	const interaction = new InteractionSync((interactive) => bridge?.setInteractive(interactive));

	// The Electron window follows the size of the tip or panel.
	function reportSize() {
		if (!bridge || !root) return;
		requestAnimationFrame(() => {
			const rect = root.getBoundingClientRect();
			// + margin for the shadow
			bridge.resize(Math.ceil(rect.width) + 8, Math.ceil(root.scrollHeight) + 8);
		});
	}

	function setView(next: View) {
		view = next;
		if (next === 'hidden') {
			interaction.setHovering(false);
			bridge?.hide();
		}
		reportSize();
	}

	// Drag on the handle: in Electron the window moves; in the browser nothing happens.
	function startDrag(event: PointerEvent) {
		if (!bridge) return;
		event.preventDefault();
		event.stopPropagation();
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		let last = { x: event.screenX, y: event.screenY };
		const move = (e: PointerEvent) => {
			bridge.moveBy(e.screenX - last.x, e.screenY - last.y);
			last = { x: e.screenX, y: e.screenY };
		};
		const up = () => {
			handle.removeEventListener('pointermove', move);
			handle.removeEventListener('pointerup', up);
			bridge.dragEnd();
		};
		handle.addEventListener('pointermove', move);
		handle.addEventListener('pointerup', up);
	}

	onMount(() => {
		if (!bridge) return;
		const observer = new ResizeObserver(reportSize);
		observer.observe(root);
		bridge.onState(({ fullyClickThrough, shown }) => {
			clickThrough = fullyClickThrough;
			if (shown && view === 'hidden') setView('collapsed');
			// Alt+C or Alt+V changed the window: re-send whether the mouse is over us.
			interaction.reset();
		});
		reportSize();
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={root}
	class="overlay absolute top-1 left-1 w-[330px] select-none"
	class:opacity-80={clickThrough}
	class:hidden={view === 'hidden'}
	role="complementary"
	aria-label="Victoria 3 Companion"
	onmouseenter={() => interaction.setHovering(true)}
	onmousemove={() => interaction.setHovering(true)}
	onmouseleave={() => interaction.setHovering(false)}
>
	{#if view === 'collapsed'}
		<!-- The tip: small, out of the way, click to open -->
		<div
			class="panel grid cursor-pointer grid-cols-[14px_30px_1fr_auto] items-center gap-2 rounded-full py-1.5 pr-2 pl-1.5"
			role="button"
			tabindex="0"
			title="Klik om te openen"
			onclick={() => setView('expanded')}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && setView('expanded')}
		>
			<span class="handle" role="presentation" title="Verslepen" onpointerdown={startDrag}></span>
			<Emblem size={30} />
			<span class="min-w-0">
				<span class="block text-[12.5px] leading-none tracking-wider text-ink-dim uppercase"
					>Companion</span
				>
				<span class="block truncate text-base font-semibold text-ink-strong">Nog geen advies</span>
			</span>
			<button
				type="button"
				class="icon-btn"
				title="Wegklikken (Alt+V haalt terug)"
				onclick={(e) => {
					e.stopPropagation();
					setView('hidden');
				}}>×</button
			>
		</div>
	{:else if view === 'expanded'}
		<section class="panel flex flex-col rounded-[7px] px-4 pt-3.5 pb-4">
			<header class="flex items-center gap-3">
				<span
					class="handle min-h-10 self-stretch"
					role="presentation"
					title="Verslepen"
					onpointerdown={startDrag}
				></span>
				<Emblem size={42} />
				<div>
					<div class="text-[22px] leading-tight font-bold text-ink-strong">
						Victoria 3 Companion
					</div>
					<div class="text-[15px] text-ink-dim">Klaar om mee te kijken</div>
				</div>
				<div class="ml-auto flex gap-0.5 self-start">
					<button
						type="button"
						class="icon-btn"
						title="Inklappen tot tipje"
						onclick={() => setView('collapsed')}>–</button
					>
					<button
						type="button"
						class="icon-btn"
						title="Wegklikken (Alt+V haalt terug)"
						onclick={() => setView('hidden')}>×</button
					>
				</div>
			</header>

			<div class="band">Nog geen advies</div>
			<p class="text-base leading-snug">
				Zodra er een <span class="text-concept">autosave</span> is, lees ik je spel in en geef ik hier
				advies: wat je nu het beste kunt doen, waarom, en hoe je het in het spel doet.
			</p>
			<p class="mt-2 text-[15px] text-ink-dim">
				Tip: zet in het spel <span class="text-concept">Autosave Interval</span> op
				<b class="text-ink-strong">Every month</b>.
			</p>

			<p
				class="mt-3 border-t border-[rgba(255,240,200,0.1)] pt-2 text-[13.5px] leading-snug text-ink-dim"
			>
				Sleep aan ⠿ om te verplaatsen · – inklappen · × wegklikken · Alt+V terughalen · Alt+C alles
				doorklikbaar
			</p>
		</section>
	{/if}
</div>

<style>
	.panel {
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
			linear-gradient(180deg, var(--color-panel-top), var(--color-panel-bottom));
		border: 1px solid var(--color-panel-edge);
		box-shadow:
			inset 0 0 0 1px rgba(255, 240, 200, 0.06),
			inset 0 1px 0 rgba(255, 240, 200, 0.12),
			0 4px 12px rgba(0, 0, 0, 0.5);
	}

	.band {
		margin: 12px -6px 10px;
		padding: 2px 8px;
		font-size: 16px;
		font-weight: 500;
		color: var(--color-ink-strong);
		background: linear-gradient(
			90deg,
			var(--color-band) 0%,
			rgba(91, 39, 48, 0.55) 55%,
			transparent
		);
	}

	.handle {
		width: 14px;
		align-self: stretch;
		cursor: grab;
		border-radius: 3px;
		opacity: 0.7;
		background: radial-gradient(circle, var(--color-ink-dim) 1.2px, transparent 1.6px) 0 0 / 7px 7px;
	}
	.handle:active {
		cursor: grabbing;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 1px solid transparent;
		border-radius: 4px;
		background: none;
		color: var(--color-ink-dim);
		font: 600 17px/1 var(--font-serif);
		cursor: pointer;
	}
	.icon-btn:hover {
		color: var(--color-ink-strong);
		border-color: var(--color-panel-edge);
		background: rgba(255, 255, 255, 0.05);
	}
</style>
