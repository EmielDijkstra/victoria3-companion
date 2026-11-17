// Dutch display helpers for what the overlay shows.

const MONTHS = [
	'januari',
	'februari',
	'maart',
	'april',
	'mei',
	'juni',
	'juli',
	'augustus',
	'september',
	'oktober',
	'november',
	'december'
];

/** "1848.9.16.6" (save format: year.month.day[.hour]) → "16 september 1848" */
export function formatGameDate(date: string): string {
	const [year, month, day] = date.split('.').map(Number);
	if (!year || !month || !day || month > 12) return date;
	return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Short form for the tip: "16 sep 1848" */
export function formatGameDateShort(date: string): string {
	const full = formatGameDate(date);
	return full === date ? date : full.replace(/ (\w{3})\w* /, ' $1 ');
}

/** ISO timestamp → "14:05" (local time) */
export function formatClock(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? ''
		: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Autosave intervals as they appear in a save, with the label from the game's settings menu. */
const INTERVALS: Record<string, string> = {
	monthly: 'Every month',
	one_month: 'Every month',
	three_months: 'Every three months',
	half_year: 'Every half year',
	six_months: 'Every half year',
	yearly: 'Every year',
	one_year: 'Every year',
	five_years: 'Every five years',
	never: 'Never'
};

export function intervalLabel(interval: string | null): string | null {
	if (!interval) return null;
	return INTERVALS[interval] ?? interval.replace(/_/g, ' ');
}

/**
 * Should the overlay suggest setting the autosave to every month? Only when we know the
 * interval is longer; unknown values stay quiet.
 */
export function suggestMonthlyAutosave(interval: string | null): boolean {
	return (
		interval !== null &&
		[
			'three_months',
			'half_year',
			'six_months',
			'yearly',
			'one_year',
			'five_years',
			'never'
		].includes(interval)
	);
}
