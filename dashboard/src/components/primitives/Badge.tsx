import { type ReactNode } from "react";
import { UNSELECTED } from "@/components/primitives/stateStyles";
import { cn } from "@/lib/cn";

const TONES = {
	muted: UNSELECTED,
	success: "bg-success/15 text-success",
	warning: "bg-warning/15 text-warning",
	danger: "bg-destructive/15 text-destructive-text",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: ReactNode }): React.JSX.Element {
	return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}
