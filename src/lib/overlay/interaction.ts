/**
 * Keeps the Electron window's "clickable or click-through" state in line with whether the mouse
 * is over the tip or panel.
 *
 * Why: the window ignores the mouse outside the overlay so the game gets the clicks. Relying on
 * `mouseenter` alone breaks when that event is missed, e.g. after Alt+C (full click-through) is
 * switched off while the mouse is already over the overlay: no new "enter" comes, so the overlay
 * stayed unclickable. So we track hovering ourselves and re-send it whenever it may be stale.
 */
export class InteractionSync {
	private hovering = false;
	private lastSent: boolean | undefined;

	constructor(private readonly send: (interactive: boolean) => void) {}

	/** Mouse entered, left or moved over the overlay. */
	setHovering(hovering: boolean) {
		this.hovering = hovering;
		this.sync();
	}

	/**
	 * The main process changed something (Alt+C, shown again): its state may no longer match
	 * what we last sent, so send the current hover state again.
	 */
	reset() {
		this.lastSent = undefined;
		this.sync();
	}

	private sync() {
		if (this.lastSent === this.hovering) return; // avoid flooding the main process on mousemove
		this.lastSent = this.hovering;
		this.send(this.hovering);
	}
}
