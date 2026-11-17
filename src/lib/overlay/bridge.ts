// Contract between the page and the Electron preload script (window.overlayBridge).
// Shared by both sides so they cannot drift apart.
import type { GameKnowledge } from '../knowledge';
import type { AppStatus, PathKind } from '../status';

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

	/** Current folders and save status */
	getStatus(): Promise<AppStatus>;
	onStatus(callback: (status: AppStatus) => void): void;
	/** Let the player pick a folder or rakaly.exe; returns the new status */
	choosePath(kind: PathKind): Promise<AppStatus>;
	/** Go back to finding the path automatically */
	resetPath(kind: PathKind): Promise<AppStatus>;
	/** Explanations from the installed game (concepts, tutorial lessons); null without game files */
	getKnowledge(): Promise<GameKnowledge | null>;
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
	state: 'overlay:state',
	getStatus: 'app:get-status',
	status: 'app:status',
	choosePath: 'app:choose-path',
	resetPath: 'app:reset-path',
	getKnowledge: 'app:get-knowledge'
} as const;
