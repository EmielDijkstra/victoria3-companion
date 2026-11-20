// The chosen language, shared by all components. Remembered per computer in localStorage
// (a convenience: if it is lost, the app falls back to the Windows language).
import { isLocale, localeFromLanguage, MESSAGES, type Locale } from './messages';

const STORAGE_KEY = 'vic3-companion.locale';

function initialLocale(): Locale {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (isLocale(stored)) return stored;
	} catch {
		// storage unavailable: use the system language
	}
	return localeFromLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined);
}

class LocaleState {
	current = $state<Locale>(initialLocale());

	/** Texts in the current language */
	get t() {
		return MESSAGES[this.current];
	}

	set(locale: Locale) {
		this.current = locale;
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch {
			// not remembered; fine
		}
	}
}

export const locale = new LocaleState();
