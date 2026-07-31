import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Card } from "@/components/primitives/Card";

/**
 * A number is animated only when it is given as one — an uptime or a database name is a string, and counting
 * up to "connected" is meaningless.
 */
export function StatTile({ label, value }: { label: string; value: string | number }): React.JSX.Element {
	return (
		<Card className="hover:border-input p-4 transition-colors duration-150">
			<p className="text-muted-foreground text-[0.8125rem] font-medium">{label}</p>
			<p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
				{typeof value === "number" ? <AnimatedNumber value={value} /> : value}
			</p>
		</Card>
	);
}
