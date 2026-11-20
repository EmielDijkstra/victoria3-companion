// Contract between the page and the Electron preload script (window.overlayBridge).
// Shared by both sides so they cannot drift apart.

export interface OverlayState {
	/** Alt+C: also click through the overlay itself */
	fullyClickThrough: boolean;
	/** Set when Alt+V brought the overlay back */
	shown?: boolean;
}

export interface OverlayBridge {
	/** true while the mouse is over the tip or panel, so clicks land on the overlay */
	setInteractive(interactive: boolean): void;
	/** The page reports its size; the window follows */
	resize(width: number, height: number): void;
	/** Drag: move the window by a delta (may be fractional on scaled displays) */
	moveBy(dx: number, dy: number): void;
	/** Drag finished: remember the position */
	dragEnd(): void;
	/** × button: hide until Alt+V */
	hide(): void;
	onState(callback: (state: OverlayState) => void): void;
}

declare global {
	interface Window {
		overlayBridge?: OverlayBridge;
	}
}

export const IPC = {
	setInteractive: 'overlay:set-interactive',
	resize: 'overlay:resize',
	moveBy: 'overlay:move-by',
	dragEnd: 'overlay:drag-end',
	hide: 'overlay:hide',
	state: 'overlay:state'
} as const;
