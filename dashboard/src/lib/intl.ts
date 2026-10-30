import i18next from "i18next";

/** Numbers, units and dates in the language the reader chose, never in the browser's own region. */

type Unit = "byte" | "kilobyte" | "megabyte" | "millisecond" | "second" | "minute" | "hour" | "day";

/** English is written the British way, `30 Jul 2026` and `1,234`, which no reader can misread as a month first. */
export function formattingLocale(): string {
	const language = i18next.resolvedLanguage ?? "en";
	return language === "en" ? "en-GB" : language;
}

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
	const locale = formattingLocale();
	const key = `${locale} ${JSON.stringify(options)}`;
	const known = formatters.get(key);
	if (known !== undefined) return known;

	const made = new Intl.NumberFormat(locale, options);
	formatters.set(key, made);
	return made;
}

export function formatNumber(value: number): string {
	return numberFormat({}).format(value);
}

/** A share of a whole, with `1 of 0` read as none rather than as a division by zero; `digits` fixes the decimals. */
export function formatPercent(part: number, whole: number, { digits }: { digits?: number } = {}): string {
	const decimals =
		digits === undefined
			? { maximumFractionDigits: 1 }
			: { minimumFractionDigits: digits, maximumFractionDigits: digits };
	return numberFormat({ style: "percent", ...decimals }).format(whole === 0 ? 0 : part / whole);
}

/** `120 ms`, `7.2 kB`, `3d`: the unit spelt as the reader's language spells it. */
export function formatUnit(
	value: number,
	unit: Unit,
	{ digits = 0, display = "short" }: { digits?: number; display?: "short" | "narrow" | "long" } = {},
): string {
	return numberFormat({ style: "unit", unit, unitDisplay: display, maximumFractionDigits: digits }).format(value);
}
