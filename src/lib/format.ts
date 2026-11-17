// Display helpers for what the overlay shows, in Dutch or English.
import type { Locale } from './i18n/messages';

const MONTHS: Record<Locale, string[]> = {
	nl: [
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
	],
	en: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	]
};

/** "1848.9.16.6" (save format: year.month.day[.hour]) → "16 september 1848" / "16 September 1848" */
export function formatGameDate(date: string, locale: Locale = 'nl'): string {
	const [year, month, day] = date.split('.').map(Number);
	if (!year || !month || !day || month > 12) return date;
	return `${day} ${MONTHS[locale][month - 1]} ${year}`;
}

/** Short form for the tip: "16 sep 1848" / "16 Sep 1848" */
export function formatGameDateShort(date: string, locale: Locale = 'nl'): string {
	const full = formatGameDate(date, locale);
	return full === date ? date : full.replace(/ (\p{L}{3})\p{L}* /u, ' $1 ');
}

/** Seconds with one decimal in the locale's style: "2,6" / "2.6" */
export function formatSeconds(ms: number, locale: Locale = 'nl'): string {
	return (ms / 1000).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
		maximumFractionDigits: 1
	});
}

/** ISO timestamp → "14:05" (local time) */
export function formatClock(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? ''
		: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
