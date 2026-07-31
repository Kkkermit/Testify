import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Beyond this the last item arrives late enough to read as a slow page rather than as one arriving. */
const MAX_DELAY_MS = 240;

export function revealDelay(index: number, step = 40): number {
	return Math.min(MAX_DELAY_MS, Math.max(0, index) * step);
}

/**
 * A short rise-and-fade on first paint. The stagger is capped, and `index` is the item's position in its list
 * so a grid arrives in reading order instead of all at once.
 */
export function Reveal({
	as: Tag = "div",
	index = 0,
	step,
	className,
	children,
}: {
	as?: ElementType;
	index?: number;
	step?: number;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<Tag className={cn("motion-reveal", className)} style={{ animationDelay: `${String(revealDelay(index, step))}ms` }}>
			{children}
		</Tag>
	);
}
