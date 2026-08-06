import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** All three paddings share the same 24px inline value, so density changes the vertical rhythm only. */
const PADDING = {
	none: "p-0",
	compact: "px-6 py-4",
	default: "p-6",
} as const;

export type CardPadding = keyof typeof PADDING;

/** No drop shadow anywhere: on near-black they read as smudges. Elevation is surface colour and a 1px border. */
const SURFACE = "bg-card border-border surface-edge rounded-card border";

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
