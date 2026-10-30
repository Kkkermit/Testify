import { type LotteryDrawSummary } from "@testify/shared";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CARD_HEADING, EmptyState } from "@/components/primitives";
import { dateAndTime, shortDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

export function DrawHistory({
	draws,
	nextDrawAt,
}: {
	draws: LotteryDrawSummary[];
	nextDrawAt: string | null;
}): React.JSX.Element {
	const { t } = useTranslation();
	return (
		<Card className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className={CARD_HEADING}>{t("lottery.pastDraws")}</h2>
				{nextDrawAt !== null && (
					<p className="text-muted-foreground text-sm">
						{t("lottery.nextDraw")} <time dateTime={nextDrawAt}>{dateAndTime(nextDrawAt)}</time>
					</p>
				)}
			</div>

			{draws.length === 0 ? (
				<EmptyState icon={<History size={28} />} title={t("lottery.noDraws")} body={t("lottery.noDrawsBody")} />
			) : (
				<ul className="flex flex-col gap-3">
					{draws.map((draw) => (
						<li
							key={draw.at}
							className="border-border flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
						>
							<div>
								<time dateTime={draw.at} className="text-sm font-medium">
									{shortDate(draw.at)}
								</time>
								<p className="text-muted-foreground text-xs tabular-nums">
									{t("lottery.drawSummary", {
										pot: formatNumber(draw.prizePool),
										tickets: formatNumber(draw.tickets),
									})}
								</p>
							</div>
							<p className="text-muted-foreground text-sm">
								{draw.winners.length === 0
									? t("lottery.rolledOver")
									: draw.winners.map((winner) => `${winner.userTag} (${formatNumber(winner.prizeAmount)})`).join(", ")}
							</p>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}
