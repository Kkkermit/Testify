import { type GuildUsageReport } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Avatar, Card, Figure, UsageBars } from "@/components/primitives";
import { RunFigures } from "@/features/owner/components/RunFigures";
import { UsagePanel } from "@/features/owner/components/UsagePanel";
import { commandBar, surfaceBars } from "@/features/owner/owner.utils";
import { formatNumber } from "@/lib/intl";

export function GuildUsageSummary({ report }: { report: GuildUsageReport }): React.JSX.Element {
	const { t } = useTranslation();
	const { guild } = report;

	return (
		<>
			<Card padding="none" className="divide-border divide-y">
				<div className="flex items-center gap-3 px-6 py-4">
					<Avatar name={guild.name} url={guild.iconUrl} size={40} seed={guild.guildId} />
					<div className="min-w-0">
						<h2 className="truncate text-base font-semibold">{guild.name}</h2>
						<p className="text-muted-foreground font-mono text-xs">{guild.guildId}</p>
					</div>
				</div>

				<RunFigures runs={report.runs} failures={report.failures} daily={report.daily}>
					<Figure className="px-6 py-4" label={t("owner.activeMembers")} value={formatNumber(report.members)} />
					<Figure
						className="px-6 py-4"
						label={t("owner.dashboardScreens")}
						value={formatNumber(report.dashboardViews)}
					/>
				</RunFigures>
			</Card>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<UsagePanel title={t("owner.serverCommands")} hint={t("owner.serverCommandsHint")}>
					<UsageBars
						empty={t("owner.noCommandRun")}
						rows={report.commands.slice(0, 10).map((row) => commandBar(row, t))}
					/>
				</UsagePanel>

				<UsagePanel title={t("owner.howRun")} hint={t("owner.howRunHint")}>
					<UsageBars
						tint="bg-hue-violet/20"
						empty={t("owner.nothingRecorded")}
						rows={surfaceBars(report.surfaces, t)}
					/>
				</UsagePanel>
			</div>
		</>
	);
}
