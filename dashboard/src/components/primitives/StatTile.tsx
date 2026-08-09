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
		<Card padding="compact" className="hover:border-input flex flex-col gap-1 transition-colors duration-150">
			<p className="text-muted-foreground flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.12em] uppercase">
				{Icon !== undefined && <Icon size={14} aria-hidden="true" className={cn("shrink-0", tint)} />}
				{label}
			</p>
			{/* Two of these share a 320px row, which is WCAG 1.4.10's reflow width — the full size does not fit. */}
			<p className="font-mono text-[1.25rem] leading-none font-medium tabular-nums sm:text-[1.625rem]">
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
