import { type Locale } from "@/i18n";

/** Flags drawn inline, because Windows renders no emoji flags. */

const RATIO = { width: 21, height: 15 } as const;

const FLAGS: Record<Locale, React.JSX.Element> = {
	// At 21px the saltire's offset is under a pixel, so the diagonals are centred and no clip path is needed.
	en: (
		<>
			<rect width="21" height="15" fill="#012169" />
			<path d="M0 0 21 15M21 0 0 15" stroke="#fff" strokeWidth="3" />
			<path d="M0 0 21 15M21 0 0 15" stroke="#C8102E" strokeWidth="1.6" />
			<path d="M10.5 0v15M0 7.5h21" stroke="#fff" strokeWidth="5" />
			<path d="M10.5 0v15M0 7.5h21" stroke="#C8102E" strokeWidth="3" />
		</>
	),
	de: (
		<>
			<rect width="21" height="5" fill="#000" />
			<rect y="5" width="21" height="5" fill="#DD0000" />
			<rect y="10" width="21" height="5" fill="#FFCE00" />
		</>
	),
	es: (
		<>
			<rect width="21" height="15" fill="#AA151B" />
			<rect y="3.75" width="21" height="7.5" fill="#F1BF00" />
		</>
	),
	fr: (
		<>
			<rect width="7" height="15" fill="#002395" />
			<rect x="7" width="7" height="15" fill="#fff" />
			<rect x="14" width="7" height="15" fill="#ED2939" />
		</>
	),
	it: (
		<>
			<rect width="7" height="15" fill="#008C45" />
			<rect x="7" width="7" height="15" fill="#F4F5F0" />
			<rect x="14" width="7" height="15" fill="#CD212A" />
		</>
	),
	ru: (
		<>
			<rect width="21" height="5" fill="#fff" />
			<rect y="5" width="21" height="5" fill="#0039A6" />
			<rect y="10" width="21" height="5" fill="#D52B1E" />
		</>
	),
};

/** Decorative: the name beside it is what a reader and a screen reader both go by. */
export function FlagIcon({ locale, className }: { locale: Locale; className?: string }): React.JSX.Element {
	return (
		<svg
			{...RATIO}
			viewBox="0 0 21 15"
			role="presentation"
			aria-hidden="true"
			focusable="false"
			// A hairline keeps a white or near-white flag from dissolving into a light card.
			className={`border-border shrink-0 border ${className ?? ""}`}
		>
			{FLAGS[locale]}
		</svg>
	);
}
