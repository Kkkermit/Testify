import { cn } from "@/lib/cn";

/** The track and knob of a switch; it must follow its `<input>` as a sibling for `peer-checked:` to reach it. */
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
			{/* White on the filled track and the field border on the card; `foreground` would invert with the theme. */}
			<span
				className={cn(
					"h-3.5 w-3.5 rounded-full transition-transform duration-200 ease-out",
					on ? "bg-primary-foreground translate-x-4" : "bg-input translate-x-0",
				)}
			/>
		</span>
	);
}
