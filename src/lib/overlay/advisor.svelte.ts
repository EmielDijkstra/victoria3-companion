// Routes the streamed answers of the AI advisor to the conversation that asked, by question id.
import type { ChatMessage } from '../advisor/prompt';
import type { AdvisorEvent, OverlayBridge } from './bridge';

type Handler = (event: AdvisorEvent) => void;

class AdvisorChannel {
	private handlers = new Map<string, Handler>();
	private bridge: OverlayBridge | undefined;
	private counter = 0;

	private connect() {
		if (this.bridge || typeof window === 'undefined' || !window.overlayBridge) return;
		this.bridge = window.overlayBridge;
		this.bridge.onAdvisor((event) => {
			this.handlers.get(event.id)?.(event);
			if (event.type !== 'text') this.handlers.delete(event.id);
		});
	}

	get available(): boolean {
		this.connect();
		return Boolean(this.bridge);
	}

	/** Sends the question; returns the id, or null without the overlay bridge. */
	ask(messages: ChatMessage[], handler: Handler): string | null {
		this.connect();
		if (!this.bridge) return null;
		const id = `q${Date.now().toString(36)}${(this.counter++).toString(36)}`;
		this.handlers.set(id, handler);
		this.bridge.askAdvisor(id, messages);
		return id;
	}

	cancel(id: string) {
		this.handlers.delete(id);
		this.bridge?.cancelAdvisor(id);
	}

	releaseFocus() {
		this.bridge?.releaseFocus();
	}
}

export const advisor = new AdvisorChannel();

/**
 * The model answers in light Markdown. Turn it into paragraphs of plain text: bold markers go,
 * list markers become bullets, numbered lists keep their numbers.
 */
export function answerParagraphs(text: string): string[] {
	return text
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/__(.+?)__/g, '$1')
		.split(/\n{2,}/)
		.map((p) =>
			p
				.split('\n')
				.map((line) => line.replace(/^\s*[*-]\s+/, '• ').replace(/^#+\s*/, ''))
				.join('\n')
				.trim()
		)
		.filter(Boolean);
}
