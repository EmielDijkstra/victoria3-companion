import { describe, expect, it } from 'vitest';
import { InteractionSync } from './interaction';

function setup() {
	const sent: boolean[] = [];
	const sync = new InteractionSync((v) => sent.push(v));
	return { sent, sync };
}

describe('InteractionSync', () => {
	it('sends a change only once, even with many mousemove events', () => {
		const { sent, sync } = setup();
		sync.setHovering(true);
		sync.setHovering(true);
		sync.setHovering(true);
		sync.setHovering(false);
		expect(sent).toEqual([true, false]);
	});

	it('re-sends the hover state after Alt+C is switched off while the mouse is over the overlay', () => {
		const { sent, sync } = setup();
		sync.setHovering(true); // mouse over the tip
		// Alt+C on: main ignores the mouse; Alt+C off: main makes the window click-through again
		// and tells the page. No new mouseenter comes, because the mouse never left.
		sync.reset();
		expect(sent).toEqual([true, true]);
	});

	it('also recovers on the next mousemove after a reset', () => {
		const { sent, sync } = setup();
		sync.setHovering(false);
		sync.reset();
		sync.setHovering(true);
		expect(sent).toEqual([false, false, true]);
	});
});
