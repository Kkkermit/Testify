import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const PADDING = {
	none: "p-0",
	compact: "px-6 py-4",
	default: "p-6",
} as const;

type CardPadding = keyof typeof PADDING;

const SURFACE = "bg-card border-border rounded-card border";

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
