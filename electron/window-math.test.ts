import { describe, expect, it } from 'vitest';
import { clampToArea, defaultPosition, sanitizeSize } from './window-math';

const area = { x: 0, y: 0, width: 1536, height: 816 }; // 1920×1080 at 125% minus taskbar

describe('clampToArea', () => {
	it('rounds fractional positions from a scaled display', () => {
		expect(clampToArea({ x: 100.4, y: 50.6 }, { width: 338, height: 63 }, area)).toEqual({
			x: 100,
			y: 51
		});
	});

	it('keeps the window inside the right and bottom edges', () => {
		expect(clampToArea({ x: 1500, y: 800 }, { width: 338, height: 63 }, area)).toEqual({
			x: 1536 - 338,
			y: 816 - 63
		});
	});

	it('keeps the window inside the left and top edges', () => {
		expect(clampToArea({ x: -40, y: -10 }, { width: 338, height: 63 }, area)).toEqual({
			x: 0,
			y: 0
		});
	});

	it('respects a work area that does not start at 0,0 (second monitor)', () => {
		const second = { x: 1536, y: 0, width: 1536, height: 816 };
		expect(clampToArea({ x: 1000, y: 10 }, { width: 338, height: 63 }, second).x).toBe(1536);
	});

	it('prefers the top-left corner when the window is larger than the area', () => {
		expect(clampToArea({ x: 10, y: 10 }, { width: 2000, height: 900 }, area)).toEqual({
			x: 0,
			y: 0
		});
	});
});

describe('sanitizeSize', () => {
	it('rounds and caps the height at the work area', () => {
		expect(sanitizeSize({ width: 337.6, height: 2000 }, area)).toEqual({ width: 338, height: 816 });
	});

	it('rejects invalid sizes', () => {
		expect(sanitizeSize({ width: Number.NaN, height: 10 }, area)).toBeNull();
		expect(sanitizeSize({ width: 0, height: 10 }, area)).toBeNull();
	});
});

describe('defaultPosition', () => {
	it('places the window top-right with a margin', () => {
		expect(defaultPosition(area, 338)).toEqual({ x: 1536 - 338 - 16, y: 16 });
	});
});
