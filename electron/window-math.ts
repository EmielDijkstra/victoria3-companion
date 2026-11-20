// Pure helpers for placing the overlay window. No Electron imports, so they can be unit-tested.

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Keep a window fully inside a screen's work area.
 * Electron only accepts whole pixels; with display scaling (125%) mouse deltas are fractions,
 * so everything is rounded (spike S3: `setPosition` threw "conversion failure").
 */
export function clampToArea(
	pos: { x: number; y: number },
	size: { width: number; height: number },
	area: Rect
): { x: number; y: number } {
	const width = Math.round(size.width);
	const height = Math.round(size.height);
	const x = Math.min(Math.max(Math.round(pos.x), area.x), area.x + area.width - width);
	const y = Math.min(Math.max(Math.round(pos.y), area.y), area.y + area.height - height);
	// If the window is bigger than the area, prefer the top-left corner.
	return { x: Math.max(x, area.x), y: Math.max(y, area.y) };
}

/** Sanitize a size reported by the page: whole pixels, at least 1, never taller than the area. */
export function sanitizeSize(
	size: { width: number; height: number },
	area: Rect
): { width: number; height: number } | null {
	if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) return null;
	const width = Math.round(size.width);
	const height = Math.min(Math.round(size.height), area.height);
	if (width < 1 || height < 1) return null;
	return { width, height };
}

/** Default spot: top-right corner with a margin. */
export function defaultPosition(area: Rect, width: number, margin = 16): { x: number; y: number } {
	return { x: area.x + area.width - width - margin, y: area.y + margin };
}
