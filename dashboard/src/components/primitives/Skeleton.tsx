import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }): React.JSX.Element {
	return <div className={cn("bg-muted skeleton-sheen rounded-card", className)} aria-hidden="true" />;
}
