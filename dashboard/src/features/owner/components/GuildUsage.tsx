import { type AnalyticsWindow } from "@testify/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Warning } from "@/components/form";
import { SegmentedControl, Skeleton } from "@/components/primitives";
import { AnalyticsUnavailable, ShardlensLinks } from "@/features/owner/components/AnalyticsNotice";
import { GuildUsageSummary } from "@/features/owner/components/GuildUsageSummary";
import { analyticsProblemOf, searchWith, WINDOWS } from "@/features/owner/owner.utils";
import { useGuildUsage } from "@/features/owner/useOwner";

const DRILL_DOWN = { guild: null };

export function GuildUsage({
	guildId,
	days,
	onWindow,
}: {
	guildId: string;
	days: AnalyticsWindow;
	onWindow: (days: AnalyticsWindow) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [params] = useSearchParams();
	const report = useGuildUsage(guildId, days);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					to={searchWith(params, DRILL_DOWN)}
					className="text-accent inline-flex items-center gap-2 text-sm hover:underline"
				>
					<ArrowLeft size={14} aria-hidden="true" />
					{t("owner.allServers")}
				</Link>
				<SegmentedControl label={t("owner.window")} segments={WINDOWS} value={days} onChange={onWindow} />
			</div>

			{report.isError ? (
				<Unread error={report.error} onRetry={() => void report.refetch()} />
			) : report.isPending ? (
				<Skeleton className="h-96 w-full" />
			) : (
				<>
					{report.data.detailDays < days && (
						<Warning>{t("owner.detailDaysNote", { days: report.data.detailDays })}</Warning>
					)}
					<GuildUsageSummary report={report.data} />
					<ShardlensLinks collector={report.data.collector} guildId={guildId} />
				</>
			)}
		</div>
	);
}

function Unread({ error, onRetry }: { error: Error; onRetry: () => void }): React.JSX.Element {
	const problem = analyticsProblemOf(error);
	return problem === null ? (
		<ErrorState as="h2" error={error} onRetry={onRetry} />
	) : (
		<AnalyticsUnavailable problem={problem} onRetry={onRetry} />
	);
}
