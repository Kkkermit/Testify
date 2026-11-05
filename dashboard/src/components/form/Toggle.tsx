import { ROW_LABEL, useRowLayout } from "@/components/form/rowLayout";
import { SwitchTrack } from "@/components/form/SwitchTrack";
import { cn } from "@/lib/cn";

/** A real checkbox drives it and stays in the accessibility tree; the track is decoration the peer selectors follow. */
export function Toggle({
	label,
	hint,
	checked,
	onChange,
	disabled = false,
	hideLabel = false,
}: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	/** For a row that already names the thing. `sr-only`, never `hidden` — the switch keeps its name either way. */
	hideLabel?: boolean;
}): React.JSX.Element {
	// In a row the words take the name column and the switch starts the control column, beside every other control.
	const row = useRowLayout();

	return (
		<label
			className={cn(
				"group flex min-h-6 items-start gap-3",
				hideLabel || row ? "" : "py-2",
				row && "justify-between md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:gap-6",
				disabled ? "opacity-50" : "cursor-pointer",
			)}
		>
			<input
				type="checkbox"
				role="switch"
				className="peer sr-only"
				checked={checked}
				disabled={disabled}
				onChange={(event) => {
					onChange(event.target.checked);
				}}
			/>

			{/* Nudged down so it sits on the label's first line rather than the top of a two-line block. */}
			<SwitchTrack on={checked} className={cn("mt-0.5", row && "order-2")} />

			<span className={hideLabel ? "sr-only" : row ? "order-1" : undefined}>
				<span className={row ? `block ${ROW_LABEL}` : "block text-sm font-medium"}>{label}</span>
				{hint !== undefined && <span className="text-muted-foreground block text-xs">{hint}</span>}
			</span>
		</label>
	);
}
