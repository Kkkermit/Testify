import { type ChannelSummary, type RoleSummary } from "@testify/shared";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Both pickers grey out what the bot cannot use and say why. That check is the same one the bot makes at
 * runtime — surfacing it here is the difference between a configuration that fails silently later and one that
 * cannot be saved wrong in the first place.
 */

const FIELD = "bg-card border-border focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none";

export function ChannelPicker({
	channels,
	value,
	onChange,
	label,
	hint,
	allowNone = true,
	noneLabel = "Where they were talking",
}: {
	channels: ChannelSummary[];
	value: string | null;
	onChange: (channelId: string | null) => void;
	label: string;
	hint?: string;
	allowNone?: boolean;
	noneLabel?: string;
}): React.JSX.Element {
	const postable = channels.filter((channel) => channel.kind === "text" || channel.kind === "announcement");
	const chosen = postable.find((channel) => channel.id === value);

	return (
		<label className="block">
			<span className="text-muted-foreground block text-[0.8125rem] font-medium">{label}</span>
			{hint !== undefined && <span className="text-muted-foreground block text-xs">{hint}</span>}

			<select
				className={cn(FIELD, "mt-1")}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				{allowNone && <option value="">{noneLabel}</option>}
				{postable.map((channel) => (
					<option key={channel.id} value={channel.id} disabled={!channel.canSend}>
						#{channel.name}
						{channel.canSend ? "" : " — Testify cannot post here"}
					</option>
				))}
			</select>

			{chosen?.canSend === false && (
				<Warning>Testify cannot post in #{chosen.name}. Level-ups will not appear until that is fixed.</Warning>
			)}
		</label>
	);
}

/**
 * A checkbox list rather than a `<select multiple>`: the latter is close to unusable with a keyboard and on
 * touch, and this is a list people revisit.
 */
export function RoleChecklist({
	roles,
	value,
	onChange,
	label,
	hint,
	max,
	requireAssignable = false,
}: {
	roles: RoleSummary[];
	value: string[];
	onChange: (roleIds: string[]) => void;
	label: string;
	hint?: string;
	max: number;
	requireAssignable?: boolean;
}): React.JSX.Element {
	const atLimit = value.length >= max;

	return (
		<fieldset>
			<legend className="text-muted-foreground text-[0.8125rem] font-medium">{label}</legend>
			{hint !== undefined && <p className="text-muted-foreground text-xs">{hint}</p>}
			<p className="text-muted-foreground mt-1 text-xs tabular-nums" aria-live="polite">
				{value.length} of {max} chosen
			</p>

			<div className="border-border mt-2 max-h-56 overflow-y-auto rounded-lg border">
				{roles.map((role) => {
					const checked = value.includes(role.id);
					const blocked = requireAssignable && !role.assignableByBot;

					return (
						<label
							key={role.id}
							className={cn(
								"flex items-center gap-2 px-3 py-2 text-sm",
								blocked || (atLimit && !checked) ? "opacity-50" : "hover:bg-muted",
							)}
						>
							<input
								type="checkbox"
								checked={checked}
								disabled={blocked || (atLimit && !checked)}
								onChange={() => {
									onChange(checked ? value.filter((id) => id !== role.id) : [...value, role.id]);
								}}
							/>
							<span className="truncate" style={role.colour === null ? undefined : { color: role.colour }}>
								{role.name}
							</span>
							{blocked && <span className="text-muted-foreground ml-auto shrink-0 text-xs">above Testify</span>}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

export function Warning({ children }: { children: React.ReactNode }): React.JSX.Element {
	return (
		<span className="text-warning mt-2 flex items-start gap-2 text-xs" role="status">
			<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
			<span>{children}</span>
		</span>
	);
}

/** Idle → Saving → Saved, announced politely so a screen reader hears the outcome without stealing focus. */
export function SavingIndicator({ state }: { state: "idle" | "saving" | "saved" }): React.JSX.Element {
	return (
		<span className="text-muted-foreground text-xs" role="status" aria-live="polite">
			{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
		</span>
	);
}

export function Toggle({
	label,
	hint,
	checked,
	onChange,
	disabled = false,
}: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
}): React.JSX.Element {
	return (
		<label className="flex items-start gap-3 py-2">
			<input
				type="checkbox"
				role="switch"
				className="mt-1"
				checked={checked}
				disabled={disabled}
				onChange={(event) => {
					onChange(event.target.checked);
				}}
			/>
			<span>
				<span className="block text-sm font-medium">{label}</span>
				{hint !== undefined && <span className="text-muted-foreground block text-xs">{hint}</span>}
			</span>
		</label>
	);
}
