import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Three paddings, not an arbitrary class per call site — that is what keeps every card's content on the same
 * column as the next one.
 *
 * `compact` is for a tile or a row, `default` for a panel you read, `none` for a card whose children own their
 * own padding (a table, a divided list). All three share the same 24px inline padding, so only the vertical
 * rhythm changes with density.
 */
const PADDING = {
	none: "p-0",
	compact: "px-6 py-4",
	default: "p-6",
} as const;

export type CardPadding = keyof typeof PADDING;

/** No drop shadow anywhere: on near-black they read as smudges. Elevation is surface colour and a 1px border. */
const SURFACE = "bg-card border-border surface-edge rounded-card border";

/**
 * The card surface as a class string, for a card that has to be something other than a `<div>` — a whole card
 * that is also a link. Those read the surface from here rather than restating it.
 */
export function cardClass(padding: CardPadding = "default", ...extra: string[]): string {
	return cn(SURFACE, PADDING[padding], ...extra);
}

export function Card({
	padding = "default",
	className,
	...props
}: ComponentPropsWithoutRef<"div"> & { padding?: CardPadding }): React.JSX.Element {
	return <div className={cardClass(padding, className ?? "")} {...props} />;
}
