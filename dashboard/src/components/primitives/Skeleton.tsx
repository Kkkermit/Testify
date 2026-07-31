import { cn } from "@/lib/cn";

/** Shaped like the real layout, so the page does not jump when the data arrives. */
export function Skeleton({ className }: { className?: string }): React.JSX.Element {
	return <div className={cn("bg-muted skeleton-sheen rounded-[0.625rem]", className)} aria-hidden="true" />;
}
