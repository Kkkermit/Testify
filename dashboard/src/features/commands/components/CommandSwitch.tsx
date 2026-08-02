import { type CommandAvailability } from "@testify/shared";
import { cn } from "@/lib/cn";

const DESCRIBES: Record<CommandAvailability, string> = {
	on: "Anybody who may use it can run it",
	"off-here": "Nobody in this server can run it",
	"off-everywhere": "The bot owner switched this off everywhere",
	locked: "Testify needs this one to stay on",
};

/**
 * One switch per command.
 *
 * Locked and bot-wide-off both render disabled, and the reason is on the control rather than in a footnote —
 * a switch that silently does nothing is the thing this avoids.
 */
export function CommandSwitch({
	name,
	availability,
	onChange,
}: {
	name: string;
	availability: CommandAvailability;
	onChange: (on: boolean) => void;
}): React.JSX.Element {
	const on = availability === "on";
	const fixed = availability === "locked" || availability === "off-everywhere";

	return (
		<label
			title={DESCRIBES[availability]}
			className={cn("flex shrink-0 items-center gap-2", fixed ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
		>
			<span className="text-muted-foreground text-xs">{on ? "On" : "Off"}</span>
			<input
				type="checkbox"
				role="switch"
				className="peer sr-only"
				checked={on}
				disabled={fixed}
				aria-label={`/${name}`}
				aria-describedby={`switch-note-${name}`}
				onChange={(event) => {
					onChange(event.target.checked);
				}}
			/>
			<span
				aria-hidden="true"
				className={cn(
					"border-input peer-checked:bg-primary peer-checked:border-primary flex h-5 w-9 shrink-0 items-center",
					"rounded-full border p-0.5 transition-colors duration-150",
					"peer-focus-visible:outline-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
				)}
			>
				<span
					className={cn(
						"bg-foreground h-3.5 w-3.5 rounded-full transition-transform duration-200 ease-out",
						on ? "translate-x-4" : "translate-x-0",
					)}
				/>
			</span>
			<span id={`switch-note-${name}`} className="sr-only">
				{DESCRIBES[availability]}
			</span>
		</label>
	);
}
