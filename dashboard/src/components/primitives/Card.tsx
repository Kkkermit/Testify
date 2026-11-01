import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** All three paddings share the same 24px inline value, so density changes the vertical rhythm only. */
const PADDING = {
	none: "p-0",
	compact: "px-6 py-4",
	default: "p-6",
} as const;

type CardPadding = keyof typeof PADDING;

/** No shadow and no highlight: a card is set apart from the page by its colour and a 1px line, nothing more. */
const SURFACE = "bg-card border-border rounded-card border";

/** The surface as a class string, for a card that has to be something other than a `<div>`. */
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
