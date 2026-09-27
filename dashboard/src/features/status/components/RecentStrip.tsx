import { type StatusBucket } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { barHeight, HISTORY_FILL, HISTORY_LABEL, millis } from "@/features/status/status.utils";
import { cn } from "@/lib/cn";
import { clockTime } from "@/lib/datetime";

/** Half-hour bars: the colour is how the bot was, the height is how long Discord took to answer it. */
export function RecentStrip({ buckets }: { buckets: StatusBucket[] }): React.JSX.Element {
	const { t } = useTranslation();
	const tallest = Math.max(0, ...buckets.map((bucket) => bucket.gatewayPingMs ?? 0));
	const describe = (bucket: StatusBucket): string =>
		bucket.gatewayPingMs === null
			? t(HISTORY_LABEL[bucket.level])
			: `${t(HISTORY_LABEL[bucket.level])}, ${millis(bucket.gatewayPingMs)}`;

	return (
		<figure className="flex flex-col gap-2">
			<div className="flex h-20 items-end gap-px" aria-hidden="true">
				{buckets.map((bucket) => (
					<span
						key={bucket.start}
						title={`${clockTime(bucket.start)}: ${describe(bucket)}`}
						className={cn("rounded-t-chip min-w-0 flex-1 opacity-80 hover:opacity-100", HISTORY_FILL[bucket.level])}
						// A bucket with no reading is still drawn full height, so an outage reads as a wall rather than a gap.
						style={{
							height: `${String(bucket.gatewayPingMs === null ? 100 : barHeight(bucket.gatewayPingMs, tallest))}%`,
						}}
					/>
				))}
			</div>

			<div className="text-muted-foreground flex justify-between text-xs" aria-hidden="true">
				<span>{t("status.dayAgo")}</span>
				<span>{t("status.now")}</span>
			</div>

			<figcaption className="sr-only">
				<table>
					<caption>{t("status.perHalfHour")}</caption>
					<thead>
						<tr>
							<th scope="col">{t("status.from")}</th>
							<th scope="col">{t("status.state")}</th>
						</tr>
					</thead>
					<tbody>
						{buckets.map((bucket) => (
							<tr key={bucket.start}>
								<th scope="row">{clockTime(bucket.start)}</th>
								<td>{describe(bucket)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</figcaption>
		</figure>
	);
}
