import { type LotteryDrawSummary } from "@testify/shared";
import { History } from "lucide-react";
import { Card, EmptyState } from "@/components/primitives";

export function DrawHistory({
	draws,
	nextDrawAt,
}: {
	draws: LotteryDrawSummary[];
	nextDrawAt: string | null;
}): React.JSX.Element {
	return (
		<Card className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="font-display text-base font-bold tracking-tight">Past draws</h2>
				{nextDrawAt !== null && (
					<p className="text-muted-foreground text-sm">
						Next draw <time dateTime={nextDrawAt}>{new Date(nextDrawAt).toLocaleString()}</time>
					</p>
				)}
			</div>

			{draws.length === 0 ? (
				<EmptyState icon={<History size={28} />} title="No draws yet" body="The first one appears here once it runs." />
			) : (
				<ul className="flex flex-col gap-3">
					{draws.map((draw) => (
						<li
							key={draw.at}
							className="border-border flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
						>
							<div>
								<time dateTime={draw.at} className="text-sm font-medium">
									{new Date(draw.at).toLocaleDateString()}
								</time>
								<p className="text-muted-foreground text-xs tabular-nums">
									{draw.prizePool.toLocaleString()} across {draw.tickets.toLocaleString()} tickets
								</p>
							</div>
							<p className="text-muted-foreground text-sm">
								{draw.winners.length === 0
									? "No entries, rolled over"
									: draw.winners
											.map((winner) => `${winner.userTag} (${winner.prizeAmount.toLocaleString()})`)
											.join(", ")}
							</p>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}
