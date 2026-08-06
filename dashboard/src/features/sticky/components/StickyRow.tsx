import { STICKY_LIMITS, type ChannelSummary, type StickyEntry, type StickyPut } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, FIELD, Warning } from "@/components/form";
import { Button, cardClass } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { markupWarning } from "@/lib/sanitise";

/** One row, edited in place and saved explicitly — a sticky is a posted message, not a switch. */
export function StickyRow({
	entry,
	channels,
	saving,
	onSave,
	onRemove,
}: {
	entry: StickyEntry;
	channels: ChannelSummary[];
	saving: boolean;
	onSave: (next: StickyPut) => void;
	onRemove: () => void;
}): React.JSX.Element {
	const [message, setMessage] = useState(entry.message);
	const [cap, setCap] = useState(entry.cap);

	useEffect(() => {
		setMessage(entry.message);
		setCap(entry.cap);
	}, [entry.message, entry.cap]);

	const name = channels.find((channel) => channel.id === entry.channelId)?.name ?? "a deleted channel";
	const dirty = message !== entry.message || cap !== entry.cap;
	const blocked = markupWarning(message);

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="font-mono text-sm font-medium">#{name}</h3>
				<span className="text-muted-foreground text-xs tabular-nums">
					{entry.count} of {entry.cap} messages since the last post
				</span>
			</div>

			<Field label="Message" htmlFor={`sticky-${entry.channelId}`}>
				<textarea
					id={`sticky-${entry.channelId}`}
					rows={2}
					value={message}
					maxLength={STICKY_LIMITS.maxMessage}
					onChange={(event) => {
						setMessage(event.target.value);
					}}
					className={cn(FIELD, "resize-y")}
				/>
			</Field>

			<div className="flex flex-wrap items-end gap-3">
				<Field label="Repost after" htmlFor={`cap-${entry.channelId}`} className="w-28">
					<input
						id={`cap-${entry.channelId}`}
						type="number"
						inputMode="numeric"
						min={STICKY_LIMITS.minCap}
						max={STICKY_LIMITS.maxCap}
						value={cap}
						onChange={(event) => {
							setCap(Number(event.target.value));
						}}
						className={FIELD}
					/>
				</Field>

				{dirty && (
					<Button
						disabled={saving || blocked !== null || message.trim() === ""}
						onClick={() => {
							onSave({ channelId: entry.channelId, message, cap });
						}}
					>
						Save
					</Button>
				)}

				<Button variant="ghost" aria-label={`Remove the sticky in ${name}`} onClick={onRemove} disabled={saving}>
					<Trash2 size={16} aria-hidden="true" />
				</Button>
			</div>

			{blocked !== null && <Warning>{blocked}</Warning>}
			{!entry.canSend && <Warning>Testify cannot post in #{name}, so this sticky will never appear.</Warning>}
		</li>
	);
}
