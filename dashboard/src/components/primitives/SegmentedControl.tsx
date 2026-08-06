import { Tooltip } from "@/components/primitives/Tooltip";
import { cn } from "@/lib/cn";

export interface Segment<Value extends string | number> {
	value: Value;
	label: string;
	/** What the segment adds beyond its label. A description only — the label is what names it. */
	hint?: string;
}

/** `aria-pressed` rather than radio semantics: these switch what is shown rather than submitting a value. */
export function SegmentedControl<Value extends string | number>({
	label,
	segments,
	value,
	onChange,
}: {
	label: string;
	segments: readonly Segment<Value>[];
	value: Value;
	onChange: (value: Value) => void;
}): React.JSX.Element {
	return (
		<div role="group" aria-label={label} className="border-border flex rounded-lg border p-0.5">
			{segments.map((segment) => {
				const control = (
					<button
						key={segment.value}
						type="button"
						aria-pressed={value === segment.value}
						onClick={() => {
							onChange(segment.value);
						}}
						className={cn(
							"rounded-md px-2.5 py-1 text-sm transition-colors duration-150",
							"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
							value === segment.value
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{segment.label}
					</button>
				);

				return segment.hint === undefined ? (
					control
				) : (
					<Tooltip key={segment.value} label={segment.hint}>
						{control}
					</Tooltip>
				);
			})}
		</div>
	);
}
