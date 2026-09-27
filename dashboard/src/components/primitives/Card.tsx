import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** All three paddings share the same 24px inline value, so density changes the vertical rhythm only. */
const PADDING = {
	none: "p-0",
	compact: "px-6 py-4",
	default: "p-6",
} as const;

type CardPadding = keyof typeof PADDING;

/** No drop shadow anywhere: on near-black they read as smudges. Elevation is surface colour and a 1px border. */
const SURFACE = "bg-card border-border surface-edge rounded-card border";

/** The surface as a class string, for a card that has to be something other than a `<div>`. */
export function cardClass(padding: CardPadding = "default", ...extra: string[]): string {
	return cn(SURFACE, PADDING[padding], ...extra);
}

/** A hairline of accent along the top edge marks the screen's one focal card. */
// Inset past the corner arc, because a 2px bar clamps its own radius and would overhang the card's corners.
const FOCAL =
	"relative before:absolute before:inset-x-2 before:top-0 before:h-0.5 " +
	"before:bg-linear-to-r before:from-accent before:to-transparent before:content-['']";

export function Card({
	padding = "default",
	focal = false,
	className,
	...props
}: ComponentPropsWithoutRef<"div"> & { padding?: CardPadding; focal?: boolean }): React.JSX.Element {
	return <div className={cardClass(padding, focal ? FOCAL : "", className ?? "")} {...props} />;
}
