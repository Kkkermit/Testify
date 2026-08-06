import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DataRow {
	label: string;
	value: ReactNode;
	mono?: boolean;
}

/** Label-and-value pairs as a real `<dl>`; `dense` drops the padding and dividers for a list inside a card that has both. */
export function DataList({
	rows,
	mono = false,
	dense = false,
	className,
}: {
	rows: DataRow[];
	mono?: boolean;
	dense?: boolean;
	className?: string;
}): React.JSX.Element {
	return (
		<dl className={cn(dense ? "flex flex-col gap-1" : "divide-border divide-y", className)}>
			{rows.map((row) => (
				<div
					key={row.label}
					className={cn("flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4", !dense && "px-6 py-3")}
				>
					<dt className="text-muted-foreground w-40 shrink-0 text-sm">{row.label}</dt>
					<dd className={cn("min-w-0 text-sm break-words", (row.mono ?? mono) && "font-mono")}>{row.value}</dd>
				</div>
			))}
		</dl>
	);
}

/** A number with its name above it — the shape every stat block on the console repeats. */
export function Figure({
	label,
	value,
	tone,
	size = "lg",
	className,
}: {
	label: string;
	value: string;
	tone?: string;
	size?: "md" | "lg";
	className?: string;
}): React.JSX.Element {
	return (
		<div className={className}>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className={cn("mt-1 font-mono tabular-nums", size === "lg" ? "text-xl" : "text-lg", tone)}>{value}</dd>
		</div>
	);
}
