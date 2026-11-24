import { type GuildUsageReport } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Avatar, Card, DataList, Figure, UsageBars } from "@/components/primitives";
import { permissionLabel } from "@/features/commands/permissions.labels";
import { RunFigures } from "@/features/owner/components/RunFigures";
import { UsagePanel } from "@/features/owner/components/UsagePanel";
import { commandBar, countOrDash, NO_FIGURE, surfaceBars } from "@/features/owner/owner.utils";
import { HISTORY_LABELS } from "@/features/owner/usage/usage.utils";
import { dateAndTime } from "@/lib/datetime";
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
					<Figure label={t("owner.peopleThisMonth")} value={countOrDash(report.people)} />
					<Figure label={t("owner.dashboardScreens")} value={formatNumber(report.dashboardViews)} />
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

				{report.profile !== null && <GuildProfilePanel profile={report.profile} />}
			</div>
		</>
	);
}

function GuildProfilePanel({ profile }: { profile: NonNullable<GuildUsageReport["profile"]> }): React.JSX.Element {
	const { t } = useTranslation();
	const when = (at: string | null): string => (at === null ? NO_FIGURE : dateAndTime(at));

	return (
		<UsagePanel wide title={t("owner.serverProfile.title")} hint={t("owner.serverProfile.hint")}>
			<DataList
				dense
				rows={[
					{ label: t("owner.serverProfile.sizeAtJoin"), value: countOrDash(profile.sizeAtJoin) },
					{ label: t("owner.serverProfile.firstCommand"), value: when(profile.firstCommandAt) },
					{ label: t("owner.serverProfile.lastCommand"), value: when(profile.lastCommandAt) },
					{
						label: t("owner.serverProfile.missing"),
						value:
							profile.missingPermissions.length === 0
								? t("owner.serverProfile.nothingMissing")
								: profile.missingPermissions.map((flag) => permissionLabel(flag, t)).join(t("common.listSeparator")),
					},
				]}
			/>
			{profile.history.length > 0 && (
				<ol className="divide-border flex flex-col divide-y text-sm" aria-label={t("owner.serverProfile.history")}>
					{profile.history.map((event) => (
						<li key={`${event.at} ${event.kind}`} className="flex flex-wrap gap-x-3 py-2">
							<span className="tabular-nums">{dateAndTime(event.at)}</span>
							<span>{t(HISTORY_LABELS[event.kind])}</span>
							{event.atStartup && <span className="text-muted-foreground">{t("owner.serverProfile.atStartup")}</span>}
						</li>
					))}
				</ol>
			)}
		</UsagePanel>
	);
}
