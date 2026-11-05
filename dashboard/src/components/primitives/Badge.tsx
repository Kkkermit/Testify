import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
	muted: "border-border text-muted-foreground",
	success: "border-success/40 text-success",
	warning: "border-warning/40 text-warning",
	danger: "border-destructive-text/40 text-destructive-text",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: ReactNode }): React.JSX.Element {
	return (
		<span
			className={cn("rounded-chip shrink-0 border px-1.5 py-px text-xs font-medium whitespace-nowrap", TONES[tone])}
		>
			{children}
		</span>
	);
}
