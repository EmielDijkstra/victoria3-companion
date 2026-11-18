<script lang="ts">
	import { onMount } from 'svelte';
	import Emblem from './Emblem.svelte';
	import { InteractionSync } from './interaction';
	import type { AppStatus, PathKind, PathStatus, SaveState } from '../status';
	import { locale } from '../i18n/locale.svelte';
	import { LOCALES, type Messages } from '../i18n/messages';
	import { formatClock, formatGameDate, formatGameDateShort, formatSeconds } from '../format';
	import { adviseFor } from '../advice/rules';
	import { adviceText, LEVEL_LABEL } from '../advice/texts';
	import AdviceList from './AdviceList.svelte';
	import GameText from './GameText.svelte';
	import GoalList from './GoalList.svelte';
	import LearnTopic from './LearnTopic.svelte';
	import { TRADE } from '../learn/trade';
	import { LAWS } from '../learn/laws';
	import { POPULATION } from '../learn/population';
	import { lawInsights, peopleInsights, tradeInsights } from '../learn/insights';
	import { gameName } from '../advice/texts';
	import ConceptCard from './ConceptCard.svelte';
	import { knowledge } from './knowledge.svelte';

	const t = $derived(locale.t);
	const lang = $derived(locale.current);

	let status = $state<AppStatus | null>(null);
	const save = $derived(status?.save);
	const summary = $derived(
		save?.state === 'ready' ? save.summary : save?.state === 'error' ? save.summary : undefined
	);
	const snapshot = $derived(
		save?.state === 'ready' ? save.snapshot : save?.state === 'error' ? save.snapshot : undefined
	);
	const advice = $derived(snapshot ? adviseFor(snapshot) : []);
	// State names as the game shows them ("Belgian Gelre" for a split state)
	const stateNames = $derived(snapshot?.stateNames ?? {});
	const country = $derived(summary ? summary.country || t.unknownCountry : '');

	const TONE = { urgent: 'bad', warn: 'warn', smart: 'concept', patience: 'good', consider: 'dim' };

	// What the small tip says: the most important advice, or the loading state
	const tip = $derived.by(() => {
		if (!save) return { tag: t.tipTagCompanion, title: t.tipStarting, tone: 'dim' };
		switch (save.state) {
			case 'reading':
				return { tag: t.tipTagBusy, title: t.tipReading, tone: 'dim' };
			case 'ready':
				if (advice.length > 0) {
					return {
						tag: LEVEL_LABEL[lang][advice[0].level],
						title: adviceText(advice[0], lang, stateNames).title,
						tone: TONE[advice[0].level]
					};
				}
				return {
					tag: t.tipTagLoaded,
					title: `${country} · ${formatGameDateShort(save.summary.gameDate, lang)}`,
					tone: 'good'
				};
			case 'error':
				return { tag: t.tipTagProblem, title: t.tipProblem, tone: 'bad' };
			default:
				return { tag: t.tipTagCompanion, title: t.tipWaiting, tone: 'dim' };
		}
	});

	// The main process sends codes; turn them into text in the chosen language.
	function saveMessage(s: SaveState, m: Messages): string | null {
		if (s.state === 'waiting') {
			return {
				starting: m.waitingStarting,
				'no-user-data': m.waitingNoUserData,
				'no-saves': m.waitingNoSaves
			}[s.reason];
		}
		if (s.state === 'error') {
			const file = s.fileName ?? 'save';
			const text = {
				'rakaly-missing': m.errorRakalyMissing,
				unstable: m.errorUnstable(file),
				'read-failed': m.errorReadFailed(file),
				unexpected: m.errorUnexpected
			}[s.code];
			return s.detail ? `${text} (${s.detail})` : text;
		}
		return null;
	}

	function pathProblem(kind: PathKind, p: PathStatus, m: Messages): string {
		if (p.problem?.code === 'chosen-missing') return m.chosenMissing(p.problem.path);
		return { userData: m.notFoundUserData, game: m.notFoundGame, rakaly: m.notFoundRakaly }[kind];
	}

	const pathLabel = (kind: PathKind) =>
		({ userData: t.pathUserData, game: t.pathGame, rakaly: t.pathRakaly })[kind];
	const pathKinds: PathKind[] = ['userData', 'game', 'rakaly'];

	async function choosePath(kind: PathKind) {
		if (bridge) status = await bridge.choosePath(kind);
	}
	async function resetPath(kind: PathKind) {
		if (bridge) status = await bridge.resetPath(kind);
	}

	type View = 'collapsed' | 'expanded' | 'hidden';

	let view = $state<View>('collapsed');
	// Pages in the panel: advice (default), learn (topics such as trade) and settings (rarely
	// needed once it runs)
	let page = $state<'advice' | 'learn' | 'settings'>('advice');
	let topic = $state<'trade' | 'laws' | 'population'>('trade');

	// Advice ids per Learn topic
	const TOPIC_ADVICE: Record<typeof topic, string[]> = {
		trade: ['trade-capacity-full', 'subsidized-export', 'import-what-you-make'],
		laws: ['law-with-support'],
		population: ['dear-basic-needs', 'understaffed', 'unemployment']
	};
	const learn = $derived.by(() => {
		if (!snapshot) return null;
		const place = (key: string) => stateNames[key] ?? gameName(key);
		const topicAdvice = advice.filter((a) => TOPIC_ADVICE[topic].includes(a.id));
		if (topic === 'laws')
			return {
				topic,
				title: t.learnLaws,
				sheet: LAWS,
				insights: lawInsights(
					snapshot,
					lang,
					knowledge.current?.laws,
					topicAdvice.find((x) => x.id === 'law-with-support' && 'law' in x)?.law
				),
				advice: topicAdvice
			};
		if (topic === 'population')
			return {
				topic,
				title: t.learnPopulation,
				sheet: POPULATION,
				insights: peopleInsights(snapshot, lang, place),
				advice: topicAdvice
			};
		return {
			topic,
			title: t.learnTrade,
			sheet: TRADE,
			insights: tradeInsights(snapshot, lang),
			advice: topicAdvice
		};
	});
	const pathTrouble = $derived(status ? Object.values(status.paths).some((p) => p.problem) : false);
	let root: HTMLDivElement;
	let clickThrough = $state(false);

	const bridge = typeof window !== 'undefined' ? window.overlayBridge : undefined;
	// Explanations from the installed game; loaded again when the game folder changes
	$effect(() => {
		knowledge.load(bridge, status?.paths.game.path ?? null);
	});

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

	// Keep the page language in sync (screen readers, hyphenation).
	$effect(() => {
		document.documentElement.lang = lang;
	});
</script>

<div
	bind:this={root}
	class="overlay absolute top-1 left-1 w-[330px] select-none"
	class:opacity-80={clickThrough}
	class:hidden={view === 'hidden'}
	role="complementary"
	aria-label={t.appName}
	onmouseenter={() => interaction.setHovering(true)}
	onmousemove={() => interaction.setHovering(true)}
	onmouseleave={() => interaction.setHovering(false)}
>
	{#if view === 'collapsed'}
		<!-- The tip: small, out of the way, click to open -->
		<div
			class="panel grid cursor-pointer grid-cols-[14px_30px_1fr_auto_auto] items-center gap-2 rounded-full py-1.5 pr-2 pl-1.5"
			role="button"
			tabindex="0"
			title={t.tipOpen}
			data-tip
			onclick={() => setView('expanded')}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && setView('expanded')}
		>
			<span class="handle" role="presentation" title={t.drag} onpointerdown={startDrag}></span>
			<Emblem size={30} />
			<span class="min-w-0">
				<span
					class="block text-[12.5px] leading-none tracking-wider uppercase"
					class:text-ink-dim={tip.tone === 'dim'}
					class:text-good={tip.tone === 'good'}
					class:text-bad={tip.tone === 'bad'}
					class:text-warn={tip.tone === 'warn'}
					class:text-concept={tip.tone === 'concept'}>{tip.tag}</span
				>
				<span class="block truncate text-base font-semibold text-ink-strong" title={tip.title}
					>{tip.title}</span
				>
			</span>
			{#if advice.length > 1}
				<span class="badge" title={t.adviceCount(advice.length)}>{advice.length}</span>
			{/if}
			<button
				type="button"
				class="icon-btn"
				title={t.hide}
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
					title={t.drag}
					onpointerdown={startDrag}
				></span>
				<Emblem size={42} />
				<div>
					<div class="text-[22px] leading-tight font-bold text-ink-strong">{t.appName}</div>
					<div class="text-[15px] text-ink-dim">
						{#if save?.state === 'reading'}{t.tipReading}{:else if summary}{country} · {formatGameDate(
								summary.gameDate,
								lang
							)}{:else}{t.tipWaiting}{/if}
					</div>
				</div>
				<div class="ml-auto flex gap-0.5 self-start">
					<button
						type="button"
						class="icon-btn"
						title={t.collapse}
						onclick={() => setView('collapsed')}>–</button
					>
					<button type="button" class="icon-btn" title={t.hide} onclick={() => setView('hidden')}
						>×</button
					>
				</div>
			</header>

			{#if page === 'advice'}
				<!-- Advice view: what the player needs during play -->
				{#if save?.state === 'error'}
					<p class="notice mt-3">{saveMessage(save, t)}</p>
				{:else if save?.state === 'waiting'}
					<p class="mt-3 text-[15px] text-ink-dim">{saveMessage(save, t)}</p>
				{/if}
				{#if pathTrouble}
					<p class="notice mt-3">
						{t.settingsProblem}
						<button type="button" class="link-btn" onclick={() => (page = 'settings')}
							>{t.openSettings}</button
						>
					</p>
				{/if}

				{#if snapshot}
					<div class="band">{t.sectionAdvice}</div>
					{#if !snapshot.versionTested}
						<p class="notice mb-2">{t.untestedVersion(snapshot.gameVersion)}</p>
					{/if}
					<AdviceList {advice} {stateNames} gameVersion={snapshot.gameVersion} />
					{#if knowledge.current && snapshot.journal?.length}
						<div class="band">{t.sectionGoals}</div>
						<GoalList journal={snapshot.journal} />
					{/if}
				{:else if save?.state !== 'reading'}
					<p class="mt-2 text-[15px] text-ink-dim"><GameText text={t.autosaveTip} /></p>
				{/if}
			{:else if page === 'learn'}
				<!-- Learn: topics explained, applied to the player's country -->
				<div class="band">{t.learn}</div>
				<div class="mt-2 flex gap-1" role="tablist" aria-label={t.learn}>
					{#each [['trade', t.learnTrade], ['laws', t.learnLaws], ['population', t.learnPopulation]] as [key, label] (key)}
						<button
							type="button"
							role="tab"
							class="lang-btn"
							class:active={topic === key}
							aria-selected={topic === key}
							data-topic={key}
							onclick={() => (topic = key as typeof topic)}>{label}</button
						>
					{/each}
				</div>
				{#if snapshot && learn}
					<LearnTopic
						topic={learn.topic}
						title={learn.title}
						sheet={learn.sheet}
						insights={learn.insights}
						advice={learn.advice}
						country={snapshot.country.name}
						gameVersion={snapshot.gameVersion}
						{stateNames}
					/>
				{:else}
					<p class="mt-2 text-[15px] text-ink-dim"><GameText text={t.autosaveTip} /></p>
				{/if}
			{:else}
				<!-- Settings view: rarely needed once it runs -->
				<div class="band">{t.settings}</div>

				{#if summary}
					<h3 class="sub">{t.sectionGame}</h3>
					<dl class="facts">
						<dt>{t.factCountry}</dt>
						<dd>{country}</dd>
						<dt>{t.factDate}</dt>
						<dd>{formatGameDate(summary.gameDate, lang)}</dd>
						<dt>{t.factVersion}</dt>
						<dd>{summary.gameVersion}</dd>
						<dt>{t.factMode}</dt>
						<dd>
							{summary.ironman ? t.modeIronman : t.modeNormal} · {t.achievements(
								summary.achievementsAllowed
							)}
						</dd>
						<dt>{t.factSave}</dt>
						<dd class="truncate" title={summary.fileName}>{summary.fileName}</dd>
						<dt>{t.factReadAt}</dt>
						<dd>
							{t.readAt(formatClock(summary.readAt), formatSeconds(summary.durationMs, lang))}
						</dd>
					</dl>
				{/if}

				{#if status}
					<h3 class="sub">{t.sectionFolders}</h3>
					<ul class="flex flex-col gap-2">
						{#each pathKinds as kind (kind)}
							{@const p = status.paths[kind]}
							<li class="text-[14.5px] leading-snug">
								<div class="flex items-baseline justify-between gap-2">
									<span class="text-ink-strong">{pathLabel(kind)}</span>
									<span class="flex flex-none gap-1">
										<button type="button" class="small-btn" onclick={() => choosePath(kind)}
											>{t.choose}</button
										>
										{#if p.source === 'manual'}
											<button
												type="button"
												class="small-btn"
												title={t.autoTitle}
												onclick={() => resetPath(kind)}>{t.auto}</button
											>
										{/if}
									</span>
								</div>
								{#if p.path}
									<div class="truncate text-ink-dim" title={p.path}>
										{p.source === 'manual' ? t.pathChosen : t.pathFound}{p.path}
									</div>
								{:else}
									<div class="text-bad">{pathProblem(kind, p, t)}</div>
								{/if}
							</li>
						{/each}
					</ul>
					{#if status.installedVersion}
						<p class="mt-1 text-[13.5px] text-ink-dim">
							{t.installedVersion(status.installedVersion)}
						</p>
					{/if}
				{/if}

				<h3 class="sub">{t.language}</h3>
				<div class="flex gap-1" role="group" aria-label={t.language}>
					{#each LOCALES as option (option)}
						<button
							type="button"
							class="lang-btn"
							class:active={option === lang}
							aria-pressed={option === lang}
							onclick={() => locale.set(option)}>{option.toUpperCase()}</button
						>
					{/each}
				</div>

				<h3 class="sub">{t.controls}</h3>
				<p class="text-[14px] leading-snug text-ink-dim">{t.controlsHelp}</p>
			{/if}

			<ConceptCard />

			<div class="mt-3 flex justify-end gap-1.5 border-t border-[rgba(255,240,200,0.1)] pt-2">
				{#if page === 'advice'}
					<button type="button" class="small-btn" data-learn-toggle onclick={() => (page = 'learn')}
						>📖 {t.learn}</button
					>
					<button
						type="button"
						class="small-btn"
						data-settings-toggle
						onclick={() => (page = 'settings')}>⚙ {t.settings}</button
					>
				{:else}
					<button
						type="button"
						class="small-btn"
						data-settings-toggle
						data-back
						onclick={() => (page = 'advice')}>{t.backToAdvice}</button
					>
				{/if}
			</div>
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
	.sub {
		margin: 12px 0 6px;
		font-size: 15px;
		font-weight: 600;
		color: var(--color-ink-strong);
	}

	.link-btn {
		border: 0;
		padding: 0;
		background: none;
		color: var(--color-concept);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	.lang-btn {
		padding: 0 6px;
		border: 1px solid var(--color-panel-edge);
		border-radius: 3px;
		background: none;
		color: var(--color-ink-dim);
		font: 600 12.5px/1.6 var(--font-serif);
		letter-spacing: 0.5px;
		cursor: pointer;
	}
	.lang-btn.active {
		color: #f1f4e4;
		border-color: var(--color-button-edge);
		background: linear-gradient(180deg, var(--color-button-top), var(--color-button-bottom));
	}

	.small-btn:hover {
		filter: brightness(1.12);
	}

	.badge {
		display: grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: 11px;
		background: var(--color-warn);
		color: #1d1a15;
		font-size: 13.5px;
		font-weight: 700;
	}

	.icon-btn:hover {
		color: var(--color-ink-strong);
		border-color: var(--color-panel-edge);
		background: rgba(255, 255, 255, 0.05);
	}
</style>
