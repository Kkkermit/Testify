import { type LiveNumbers } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Card, Figure } from "@/components/primitives";
import { formatMs, NO_FIGURE } from "@/features/owner/owner.utils";
import { useLive } from "@/features/owner/useOwner";
import { formatNumber } from "@/lib/intl";

/** What the bot is doing this minute; it says nothing while Shardlens is off, since the section below says why. */
export function LiveStrip(): React.JSX.Element | null {
	const { t } = useTranslation();
	const live = useLive();
	const read = live.data;

	if (read === undefined || read.problem === "off") return null;
	if (read.problem !== null) return <p className="text-muted-foreground text-sm">{t("owner.live.unavailable")}</p>;
	if (read.numbers === null) {
		return (
			<p className="text-muted-foreground text-sm" role="status">
				{t("owner.live.connecting")}
			</p>
		);
	}

	return <LiveFigures numbers={read.numbers} />;
}

function LiveFigures({ numbers }: { numbers: LiveNumbers }): React.JSX.Element {
	const { t } = useTranslation();
	const fresh = numbers.shards.filter((shard) => shard.fresh).length;
	const peak = Math.max(1, ...numbers.perSecond);

	return (
		<Card padding="none" className="flex flex-col">
			<div className="flex items-center gap-2 px-6 pt-4">
				<span className="bg-success size-2 rounded-full" aria-hidden="true" />
				<h2 className="text-sm font-medium">{t("owner.live.title")}</h2>
			</div>
			<dl className="grid grid-cols-2 sm:grid-cols-4">
				<Figure className="px-6 py-3" label={t("owner.live.perMinute")} value={formatNumber(numbers.perMinute)} />
				<Figure className="px-6 py-3" label={t("owner.live.failed")} value={formatNumber(numbers.failed15m)} />
				<Figure
					className="px-6 py-3"
					label={t("owner.live.slow")}
					value={numbers.slowMs === null ? NO_FIGURE : formatMs(numbers.slowMs)}
				/>
				<Figure
					className="px-6 py-3"
					label={t("owner.live.shards")}
					value={t("common.partOf", { part: fresh, whole: numbers.shards.length })}
				/>
			</dl>
			{/* One bar a second; the same minute is the first figure above, so the bars are only a shape. */}
			<div className="flex h-8 items-end gap-px px-6 pb-4" aria-hidden="true">
				{numbers.perSecond.map((count, index) => (
					<span
						// The array is the last sixty seconds in order, so its index is the second.
						key={index}
						className="bg-hue-blue/50 min-h-px flex-1"
						style={{ height: `${String(Math.round((count / peak) * 100))}%` }}
					/>
				))}
			</div>
		</Card>
	);
}
