import { useCountUp } from "@/hooks/useCountUp";
import { formatNumber } from "@/lib/intl";

/** Counts up on first paint, then jumps straight to any later value so a refresh is not mistaken for activity. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }): React.JSX.Element {
	const shown = useCountUp(value);
	return <span className={className}>{formatNumber(shown)}</span>;
}
