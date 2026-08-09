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
	return (
		<label
			className={cn(
				"group flex min-h-6 items-start gap-3",
				hideLabel ? "" : "py-2",
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

			<span
				aria-hidden="true"
				className={cn(
					"border-input peer-checked:bg-primary peer-checked:border-primary mt-0.5 flex h-5 w-9 shrink-0 items-center",
					"rounded-full border p-0.5 transition-colors duration-150",
					"peer-focus-visible:outline-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
				)}
			>
				<span
					className={cn(
						"bg-foreground h-3.5 w-3.5 rounded-full transition-transform duration-200 ease-out",
						checked ? "translate-x-4" : "translate-x-0",
					)}
				/>
			</span>

			<span className={hideLabel ? "sr-only" : undefined}>
				<span className="block text-sm font-medium">{label}</span>
				{hint !== undefined && <span className="text-muted-foreground block text-xs">{hint}</span>}
			</span>
		</label>
	);
}
