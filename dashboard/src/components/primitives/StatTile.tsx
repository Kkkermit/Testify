import { type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Card } from "@/components/primitives/Card";
import { Tooltip } from "@/components/primitives/Tooltip";
import { cn } from "@/lib/cn";

/** Animated only when the value is a number — counting up to "connected" is meaningless. */
export function StatTile({
	label,
	value,
	icon: Icon,
	tint = "text-muted-foreground",
	hint,
}: {
	label: string;
	value: string | number;
	icon?: LucideIcon;
	tint?: string;
	/** Explains what the figure counts, for anything a label cannot say in two words. */
	hint?: string;
}): React.JSX.Element {
	const tile = (
		<Card padding="compact" className="hover:border-input transition-colors duration-150">
			<p className="text-muted-foreground flex items-center gap-1.5 text-[0.8125rem] font-medium">
				{Icon !== undefined && <Icon size={14} aria-hidden="true" className={cn("shrink-0", tint)} />}
				{label}
			</p>
			<p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
				{typeof value === "number" ? <AnimatedNumber value={value} /> : value}
			</p>
		</Card>
	);

	if (hint === undefined) return tile;

	return (
		<Tooltip label={hint}>
			<div tabIndex={0} className="rounded-card">
				{tile}
			</div>
		</Tooltip>
	);
}
