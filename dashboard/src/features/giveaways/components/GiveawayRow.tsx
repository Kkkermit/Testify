import { type ChannelSummary, type GiveawayRow as Row } from "@testify/shared";
import { Dices, Square, Trash2 } from "lucide-react";
import { Badge, Button, cardClass } from "@/components/primitives";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { canReroll } from "@/features/giveaways/giveaways.utils";
import { dateAndTime, since } from "@/lib/datetime";

/** One giveaway, with its actions beside it — the reason this screen exists is that Discord asks for a message id. */
export function GiveawayRow({
	row,
	channels,
	busy,
	onEnd,
	onReroll,
	onDelete,
}: {
	row: Row;
	channels: ChannelSummary[];
	busy: boolean;
	onEnd: () => void;
	onReroll: () => void;
	onDelete: () => void;
}): React.JSX.Element {
	const channel = channels.find((entry) => entry.id === row.channelId)?.name ?? "a deleted channel";

	return (
		<li className={cardClass("compact", "flex flex-col gap-3")}>
			<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
				<div className="min-w-0">
					<h3 className={CARD_HEADING}>{row.prize}</h3>
					<p className="text-muted-foreground text-xs">
						#{channel} · {row.winnerCount} winner{row.winnerCount === 1 ? "" : "s"}
					</p>
				</div>
				{row.ended ? <Badge>Ended</Badge> : <Badge tone="success">Running</Badge>}
			</div>

			<dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
				<div className="flex gap-2">
					<dt>Started</dt>
					<dd className="text-foreground">{since(row.startAt)}</dd>
				</div>
				<div className="flex gap-2">
					<dt>{row.ended ? "Drew" : "Draws"}</dt>
					<dd className="text-foreground">{dateAndTime(row.endAt)}</dd>
				</div>
				{row.ended && (
					<div className="flex gap-2">
						<dt>Winners</dt>
						<dd className="text-foreground">
							{row.winners.length === 0
								? "nobody entered"
								: row.winners.map((winner) => winner.tag ?? winner.id).join(", ")}
						</dd>
					</div>
				)}
			</dl>

			<div className="flex flex-wrap gap-2">
				{!row.ended && (
					<Button variant="secondary" disabled={busy} onClick={onEnd}>
						<Square size={15} aria-hidden="true" />
						End now
					</Button>
				)}
				{canReroll(row) && (
					<Button variant="secondary" disabled={busy} onClick={onReroll}>
						<Dices size={15} aria-hidden="true" />
						Reroll
					</Button>
				)}
				<Button variant="ghost" disabled={busy} onClick={onDelete}>
					<Trash2 size={16} aria-hidden="true" />
					<span className="sr-only">Delete the giveaway for {row.prize}</span>
				</Button>
			</div>
		</li>
	);
}
