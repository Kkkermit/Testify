import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/primitives/Card";
import { Tooltip } from "@/components/primitives/Tooltip";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/intl";

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
	hint?: string;
}): React.JSX.Element {
	const tile = (
		<Card padding="compact" className="flex flex-col gap-1">
			<p className="text-muted-foreground flex items-center gap-2 text-xs">
				{Icon !== undefined && <Icon size={14} aria-hidden="true" className={cn("shrink-0", tint)} />}
				{label}
			</p>
			{/* Two of these share a 320px row, which is WCAG 1.4.10's reflow width — the full size does not fit. */}
			<p className="text-[1.25rem] leading-tight font-semibold tabular-nums sm:text-[1.625rem]">
				{typeof value === "number" ? formatNumber(value) : value}
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
