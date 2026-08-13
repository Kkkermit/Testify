import { type CommandAvailability } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

/** Keys rather than text: a module-level map is built once, long before a locale is chosen. */
const DESCRIBES: Record<CommandAvailability, TranslationKey> = {
	on: "commands.availableToAll",
	"off-here": "commands.offHere",
	"off-everywhere": "commands.offEverywhere",
	locked: "commands.locked",
};

/** Locked and bot-wide-off render disabled with the reason on the control, not in a footnote. */
export function CommandSwitch({
	name,
	availability,
	onChange,
}: {
	name: string;
	availability: CommandAvailability;
	onChange: (on: boolean) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const on = availability === "on";
	const fixed = availability === "locked" || availability === "off-everywhere";

	return (
		<label
			title={t(DESCRIBES[availability])}
			className={cn(INLINE_TARGET, "shrink-0 gap-2", fixed ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
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
