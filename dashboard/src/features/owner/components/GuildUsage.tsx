import { type AnalyticsWindow } from "@testify/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Warning } from "@/components/form";
import { SegmentedControl, Skeleton } from "@/components/primitives";
import { GuildMembers } from "@/features/owner/components/GuildMembers";
import { GuildRuns } from "@/features/owner/components/GuildRuns";
import { GuildUsageSummary } from "@/features/owner/components/GuildUsageSummary";
import { searchWith, WINDOWS } from "@/features/owner/owner.utils";
import { useGuildUsage } from "@/features/owner/useOwner";

/** Everything the drill-down keeps in the URL, cleared together on the way back to every server. */
const DRILL_DOWN = { guild: null, who: null, people: null, member: null, command: null, runs: null };

/** One server: what was run there, who ran it, and each run, newest first. */
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
				<ErrorState as="h2" error={report.error} onRetry={() => void report.refetch()} />
			) : report.isPending ? (
				<Skeleton className="h-96 w-full" />
			) : (
				<>
					<GuildUsageSummary report={report.data} />
					{report.data.memberDays < days && (
						<Warning>{t("owner.memberDaysNote", { days: report.data.memberDays })}</Warning>
					)}
					<GuildMembers guildId={guildId} report={report.data} />
					<GuildRuns guildId={guildId} report={report.data} />
				</>
			)}
		</div>
	);
}
