import { errorRate, type GuildUsageReport } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Avatar, Card, Figure, UsageBars } from "@/components/primitives";
import { categoryLabel } from "@/features/commands/categories.labels";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { UsagePanel } from "@/features/owner/components/UsagePanel";
import { percent } from "@/features/owner/owner.utils";
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

				<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure className="px-6 py-4" label={t("owner.commandsRun")} value={formatNumber(report.runs)} />
					<Figure
						className="px-6 py-4"
						label={t("owner.failed")}
						value={percent(report.failures, report.runs)}
						{...(errorRate(report) > 0.05 ? { tone: "text-destructive-text" } : {})}
					/>
					<Figure className="px-6 py-4" label={t("owner.activeMembers")} value={formatNumber(report.members)} />
					<Figure
						className="px-6 py-4"
						label={t("owner.dashboardScreens")}
						value={formatNumber(report.dashboardViews)}
					/>
				</dl>

				<div className="px-6 py-5">
					<UsageChart days={report.daily} />
				</div>
			</Card>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<UsagePanel title={t("owner.serverCommands")} hint={t("owner.serverCommandsHint")}>
					<UsageBars
						empty={t("owner.noCommandRun")}
						rows={report.commands.slice(0, 10).map((row) => ({
							id: row.command,
							label: `/${row.command}`,
							sub:
								row.failures > 0
									? t("owner.categoryFailed", { category: categoryLabel(row.category, t), failed: row.failures })
									: categoryLabel(row.category, t),
							count: row.count,
						}))}
					/>
				</UsagePanel>

				<UsagePanel title={t("owner.howRun")} hint={t("owner.howRunHint")}>
					<UsageBars
						tint="bg-feature-levelling/25"
						empty={t("owner.nothingRecorded")}
						rows={[
							{ id: "slash", label: t("owner.slashCommands"), count: report.surfaces.slash },
							{ id: "prefix", label: t("owner.prefixCommands"), count: report.surfaces.prefix },
						]}
					/>
				</UsagePanel>
			</div>
		</>
	);
}
