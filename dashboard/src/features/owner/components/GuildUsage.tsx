import { type AnalyticsWindow } from "@testify/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { Warning } from "@/components/form";
import { SegmentedControl } from "@/components/primitives";
import { ShardlensLinks } from "@/features/owner/components/AnalyticsNotice";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { GuildUsageSummary } from "@/features/owner/components/GuildUsageSummary";
import { searchWith, WINDOWS } from "@/features/owner/owner.utils";
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

			<AnalyticsState query={report}>
				{(usage) => (
					<>
						{usage.detailDays < days && <Warning>{t("owner.detailDaysNote", { days: usage.detailDays })}</Warning>}
						<GuildUsageSummary report={usage} />
						<ShardlensLinks collector={usage.collector} guildId={guildId} />
					</>
				)}
			</AnalyticsState>
		</div>
	);
}
