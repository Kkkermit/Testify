import { useCountUp } from "@/hooks/useCountUp";

/** Counts up on first paint, then jumps straight to any later value so a refresh is not mistaken for activity. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }): React.JSX.Element {
	const shown = useCountUp(value);
	return <span className={className}>{shown.toLocaleString()}</span>;
}
