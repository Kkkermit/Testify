import { cn } from "@/lib/cn";

/**
 * The track and knob of a switch, for the two controls that drive one. The `<input>` stays with the caller,
 * which is the only part the two differ in — one carries a visible label, the other a name and a reason.
 *
 * It has to follow the input as a sibling: the track colour is a `peer-checked:` rule, and the knob takes the
 * state as a prop because a general sibling combinator cannot reach a descendant.
 */
export function SwitchTrack({ on, className }: { on: boolean; className?: string }): React.JSX.Element {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"border-input peer-checked:bg-primary peer-checked:border-primary flex h-5 w-9 shrink-0 items-center",
				"rounded-full border p-0.5 transition-colors duration-150",
				"peer-focus-visible:outline-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
				className,
			)}
		>
			{/* Each half is measured against what it actually sits on: white on the filled track, and the field
			    border colour on the card. `foreground` inverts with the theme and reads as a hole on paper. */}
			<span
				className={cn(
					"h-3.5 w-3.5 rounded-full transition-transform duration-200 ease-out",
					on ? "bg-primary-foreground translate-x-4" : "bg-input translate-x-0",
				)}
			/>
		</span>
	);
}
