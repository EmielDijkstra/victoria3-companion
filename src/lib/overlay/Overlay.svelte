<script lang="ts">
	import { onMount } from 'svelte';
	import Emblem from './Emblem.svelte';
	import { InteractionSync } from './interaction';
	import type { AppStatus, PathKind } from '../status';
	import {
		formatClock,
		formatGameDate,
		formatGameDateShort,
		intervalLabel,
		suggestMonthlyAutosave
	} from '../format';

	let status = $state<AppStatus | null>(null);
	const save = $derived(status?.save);
	const summary = $derived(
		save?.state === 'ready' ? save.summary : save?.state === 'error' ? save.summary : undefined
	);

	// What the small tip says
	const tip = $derived.by(() => {
		if (!save) return { tag: 'Companion', title: 'Opstarten…', tone: 'dim' };
		switch (save.state) {
			case 'reading':
				return { tag: 'Bezig', title: 'Save inlezen…', tone: 'dim' };
			case 'ready':
				return {
					tag: 'Ingelezen',
					title: `${save.summary.country} · ${formatGameDateShort(save.summary.gameDate)}`,
					tone: 'good'
				};
			case 'error':
				return { tag: 'Let op', title: 'Probleem – klik voor info', tone: 'bad' };
			default:
				return { tag: 'Companion', title: 'Wacht op een save', tone: 'dim' };
		}
	});

	const PATH_LABELS: Record<PathKind, string> = {
		userData: 'Saves en instellingen',
		game: 'Spelinstallatie',
		rakaly: 'Rakaly (leest saves)'
	};
	const pathKinds: PathKind[] = ['userData', 'game', 'rakaly'];

	async function choosePath(kind: PathKind) {
		if (bridge) status = await bridge.choosePath(kind);
	}
	async function resetPath(kind: PathKind) {
		if (bridge) status = await bridge.resetPath(kind);
	}

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
			const box = root.firstElementChild as HTMLElement | null;
			if (!box) return;
			// Full content height, even while the window is still too small to show it all
			// (spike S3: measuring inside the small window kept it small). Main caps it at the screen.
			const borders = box.offsetHeight - box.clientHeight;
			const height = box.scrollHeight + borders;
			// + margin for the shadow
			bridge.resize(Math.ceil(box.offsetWidth) + 8, Math.ceil(height) + 8);
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
		bridge.onStatus((s) => (status = s));
		bridge.getStatus().then((s) => (status ??= s));
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
				<span
					class="block text-[12.5px] leading-none tracking-wider uppercase"
					class:text-ink-dim={tip.tone === 'dim'}
					class:text-good={tip.tone === 'good'}
					class:text-bad={tip.tone === 'bad'}>{tip.tag}</span
				>
				<span class="block truncate text-base font-semibold text-ink-strong">{tip.title}</span>
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
		<section
			class="panel flex max-h-[calc(100vh-8px)] flex-col overflow-y-auto rounded-[7px] px-4 pt-3.5 pb-4"
		>
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
					<div class="text-[15px] text-ink-dim">
						{#if save?.state === 'reading'}Save inlezen…{:else if summary}{summary.country} · {formatGameDate(
								summary.gameDate
							)}{:else}Wacht op een save{/if}
					</div>
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

			{#if save?.state === 'error'}
				<p class="notice mt-3">{save.message}</p>
			{:else if save?.state === 'waiting'}
				<p class="mt-3 text-[15px] text-ink-dim">{save.message}</p>
			{/if}

			{#if summary}
				<div class="band">Je spel</div>
				<dl class="facts">
					<dt>Land</dt>
					<dd>{summary.country}</dd>
					<dt>Datum</dt>
					<dd>{formatGameDate(summary.gameDate)}</dd>
					<dt>Spelversie</dt>
					<dd>{summary.gameVersion}</dd>
					<dt>Modus</dt>
					<dd>
						{summary.ironman ? 'Ironman' : 'Gewone save'} · achievements
						{summary.achievementsAllowed ? 'aan' : 'uit'}
					</dd>
					<dt>Save</dt>
					<dd class="truncate" title={summary.fileName}>{summary.fileName}</dd>
					<dt>Ingelezen</dt>
					<dd>
						om {formatClock(summary.readAt)} ({(summary.durationMs / 1000).toLocaleString('nl-NL', {
							maximumFractionDigits: 1
						})} s)
					</dd>
					{#if summary.ironman && summary.autosaveInterval}
						<!-- Ironman may fix the interval when the campaign starts: show it, don't advise. -->
						<dt>Autosave</dt>
						<dd>{intervalLabel(summary.autosaveInterval)}</dd>
					{/if}
				</dl>
				{#if !summary.ironman && suggestMonthlyAutosave(summary.autosaveInterval)}
					<p class="mt-2 text-[15px] leading-snug text-ink-dim">
						Je autosave staat op <b class="text-ink-strong"
							>{intervalLabel(summary.autosaveInterval)}</b
						>. Zet in het spel <span class="text-concept">Autosave Interval</span> op
						<b class="text-ink-strong">Every month</b>, dan loop ik hooguit één maand achter.
					</p>
				{/if}

				<div class="band">Advies</div>
				<p class="text-[15px] leading-snug text-ink-dim">
					Je save is ingelezen. Advies op basis van je spel volgt in een volgende versie.
				</p>
			{:else if save?.state !== 'reading'}
				<p class="mt-2 text-[15px] text-ink-dim">
					Tip: zet in het spel <span class="text-concept">Autosave Interval</span> op
					<b class="text-ink-strong">Every month</b>.
				</p>
			{/if}

			{#if status}
				<div class="band">Mappen</div>
				<ul class="flex flex-col gap-2">
					{#each pathKinds as kind (kind)}
						{@const p = status.paths[kind]}
						<li class="text-[14.5px] leading-snug">
							<div class="flex items-baseline justify-between gap-2">
								<span class="text-ink-strong">{PATH_LABELS[kind]}</span>
								<span class="flex flex-none gap-1">
									<button type="button" class="small-btn" onclick={() => choosePath(kind)}
										>Kies…</button
									>
									{#if p.source === 'manual'}
										<button
											type="button"
											class="small-btn"
											title="Weer automatisch zoeken"
											onclick={() => resetPath(kind)}>Auto</button
										>
									{/if}
								</span>
							</div>
							{#if p.path}
								<div class="truncate text-ink-dim" title={p.path}>
									{p.source === 'manual' ? 'Zelf gekozen: ' : 'Gevonden: '}{p.path}
								</div>
							{:else}
								<div class="text-bad">{p.problem}</div>
							{/if}
						</li>
					{/each}
				</ul>
				{#if status.installedVersion}
					<p class="mt-1 text-[13.5px] text-ink-dim">
						Geïnstalleerde versie: {status.installedVersion}
					</p>
				{/if}
			{/if}

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
	section {
		scrollbar-color: var(--color-panel-edge-light) rgba(0, 0, 0, 0.25);
	}

	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 12px;
		margin: 0;
		font-size: 15.5px;
	}
	.facts dt {
		color: var(--color-ink-dim);
	}
	.facts dd {
		margin: 0;
		min-width: 0;
		color: var(--color-ink-strong);
	}

	.notice {
		padding: 6px 8px;
		border-left: 3px solid var(--color-bad);
		background: rgba(236, 122, 98, 0.08);
		font-size: 15px;
		line-height: 1.35;
	}

	.small-btn {
		padding: 0 8px;
		border: 1px solid var(--color-button-edge);
		border-radius: 3px;
		background: linear-gradient(180deg, var(--color-button-top), var(--color-button-bottom));
		color: #f1f4e4;
		font: 500 13.5px/1.5 var(--font-serif);
		cursor: pointer;
	}
	.small-btn:hover {
		filter: brightness(1.12);
	}

	.icon-btn:hover {
		color: var(--color-ink-strong);
		border-color: var(--color-panel-edge);
		background: rgba(255, 255, 255, 0.05);
	}
</style>
