// Game explanations in the overlay: loaded once from the main process, and the concept card that
// is open right now.
import type { ConceptText, GameKnowledge } from '../knowledge';
import type { OverlayBridge } from './bridge';
import { usableConceptNames } from './game-terms';

class KnowledgeStore {
	current = $state<GameKnowledge | null>(null);
	/** Concept shown in the card; null when closed */
	open = $state<ConceptText | null>(null);
	/** Concept names to highlight; same array until the knowledge changes */
	names = $derived(this.current ? usableConceptNames(Object.keys(this.current.concepts)) : []);
	private loadedFor: string | null | undefined = undefined;

	/** Load (again) when the game folder changed. */
	async load(bridge: OverlayBridge | undefined, gameDir: string | null) {
		if (!bridge || gameDir === this.loadedFor) return;
		this.loadedFor = gameDir;
		try {
			this.current = await bridge.getKnowledge();
		} catch {
			this.current = null;
		}
	}

	/** "Construction Sectors" → the concept "Construction Sector", if the game has it. */
	concept(term: string): ConceptText | undefined {
		const concepts = this.current?.concepts;
		if (!concepts) return undefined;
		return concepts[term] ?? concepts[term.replace(/s$/, '')] ?? concepts[`${term}s`];
	}

	show(term: string) {
		this.open = this.concept(term) ?? null;
	}

	close() {
		this.open = null;
	}
}

export const knowledge = new KnowledgeStore();
