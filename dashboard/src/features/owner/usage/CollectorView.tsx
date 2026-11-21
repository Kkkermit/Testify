import { type CollectorSetup } from "@testify/shared";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, DataList, Figure } from "@/components/primitives";
import { ShardlensLinks } from "@/features/owner/components/AnalyticsNotice";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { countOrDash, NO_FIGURE } from "@/features/owner/owner.utils";
import { useCollectorSetup } from "@/features/owner/useOwner";
import { type TranslationKey } from "@/i18n";
import { dateAndTime, since } from "@/lib/datetime";
import { formatNumber } from "@/lib/intl";

type Check = keyof CollectorSetup["checks"];

/** Who ran what first, since it needs all three; each says what to change when it is missing. */
const CHECKS: { check: Check; done: TranslationKey; missing: TranslationKey; ownMissing?: TranslationKey }[] = [
	{
		check: "auditMode",
		done: "owner.setup.auditMode",
		missing: "owner.setup.auditModeMissing",
		ownMissing: "owner.setup.auditMissingEmbedded",
	},
	{
		check: "auditKey",
		done: "owner.setup.auditKey",
		missing: "owner.setup.auditKeyMissing",
		ownMissing: "owner.setup.auditMissingEmbedded",
	},
	{ check: "activityKey", done: "owner.setup.activityKey", missing: "owner.setup.activityKeyMissing" },
	{ check: "receivingEvents", done: "owner.setup.receiving", missing: "owner.setup.receivingMissing" },
	{ check: "appInfoReceived", done: "owner.setup.appInfo", missing: "owner.setup.appInfoMissing" },
	{ check: "webhookEventsEnabled", done: "owner.setup.webhooks", missing: "owner.setup.webhooksMissing" },
	{ check: "requiredPermissionsSet", done: "owner.setup.permissions", missing: "owner.setup.permissionsMissing" },
];

const SALT_LABELS: Record<CollectorSetup["app"]["saltPeriod"], TranslationKey> = {
	day: "owner.setup.saltDay",
	week: "owner.setup.saltWeek",
	month: "owner.setup.saltMonth",
};

export function CollectorView(): React.JSX.Element {
	const setup = useCollectorSetup();

	return <AnalyticsState query={setup}>{(report) => <CollectorFigures report={report} />}</AnalyticsState>;
}

function CollectorFigures({ report }: { report: CollectorSetup }): React.JSX.Element {
	const { t } = useTranslation();
	const { app, bot } = report;
	const orDash = (value: string | null): string => value ?? NO_FIGURE;

	return (
		<div className="flex flex-col gap-4">
			<Card padding="none" className="divide-border divide-y">
				<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
					<Figure
						className="px-6 py-4"
						label={t("owner.setup.mode")}
						value={t(app.mode === "audit" ? "owner.setup.modeAudit" : "owner.setup.modePrivacy")}
					/>
					<Figure
						className="px-6 py-4"
						label={t("owner.setup.lastEvent")}
						value={report.lastEventAt === null ? NO_FIGURE : since(report.lastEventAt)}
					/>
					<Figure className="px-6 py-4" label={t("owner.setup.servers")} value={formatNumber(report.servers)} />
					<Figure className="px-6 py-4" label={t("owner.peopleThisMonth")} value={countOrDash(report.people)} />
				</dl>
				<ul className="flex flex-col gap-3 px-6 py-5" aria-label={t("owner.setup.checksLabel")}>
					{CHECKS.map(({ check, done, missing, ownMissing }) => {
						const ok = report.checks[check];
						const advice = report.embedded ? (ownMissing ?? missing) : missing;
						const Icon = ok ? Check : X;
						return (
							<li key={check} className="flex gap-3 text-sm">
								<Icon
									size={16}
									aria-hidden="true"
									className={ok ? "text-success mt-0.5 shrink-0" : "text-destructive-text mt-0.5 shrink-0"}
								/>
								<span className="flex flex-col">
									<span className="font-medium">
										{t(done)}
										<span className="sr-only"> {t(ok ? "owner.setup.isDone" : "owner.setup.isMissing")}</span>
									</span>
									{!ok && <span className="text-muted-foreground">{t(advice)}</span>}
								</span>
							</li>
						);
					})}
				</ul>
			</Card>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel title={t("owner.setup.collector")} hint={t("owner.setup.collectorHint")}>
					<DataList
						dense
						rows={[
							{ label: t("owner.setup.name"), value: app.name === "" ? NO_FIGURE : app.name },
							{ label: t("owner.setup.salt"), value: t(SALT_LABELS[app.saltPeriod]) },
							{ label: t("owner.setup.timezone"), value: app.timezone },
							{
								label: t("owner.setup.retention"),
								value: t("owner.setup.days", { count: app.rawRetentionDays }),
							},
							{
								label: t("owner.setup.discordLogin"),
								value: t(app.discordLogin ? "owner.setup.yes" : "owner.setup.no"),
							},
						]}
					/>
				</Panel>

				<Panel title={t("owner.setup.bot")} hint={t("owner.setup.botHint")}>
					{bot === null ? (
						<p className="text-muted-foreground text-sm">{t("owner.setup.noBot")}</p>
					) : (
						<DataList
							dense
							rows={[
								{ label: t("owner.setup.reported"), value: dateAndTime(bot.at) },
								{ label: t("owner.setup.discordServers"), value: countOrDash(bot.approxServers) },
								{ label: t("owner.setup.userInstalls"), value: countOrDash(bot.approxUserInstalls) },
								{
									label: t("owner.setup.sessions"),
									value:
										bot.sessionsLeft === null || bot.sessionsTotal === null
											? NO_FIGURE
											: t("common.partOf", { part: bot.sessionsLeft, whole: bot.sessionsTotal }),
								},
								{ label: t("owner.setup.release"), value: orDash(bot.release) },
								{ label: t("owner.setup.versions"), value: versions(bot) },
							]}
						/>
					)}
				</Panel>

				<Panel wide title={t("owner.setup.instances")} hint={t("owner.setup.instancesHint")}>
					{report.instances.length === 0 ? (
						<p className="text-muted-foreground text-sm">{t("owner.setup.noInstances")}</p>
					) : (
						<ul className="divide-border flex flex-col divide-y text-sm">
							{report.instances.map((instance) => (
								<li key={instance.instance} className="flex flex-col gap-1 py-2">
									<span className="flex flex-wrap items-baseline gap-x-3">
										<code className="font-mono text-xs wrap-anywhere">{instance.instance}</code>
										<span className="text-muted-foreground">{since(instance.at)}</span>
									</span>
									<span className="text-muted-foreground">
										{[
											t("owner.setup.shards", { count: instance.shards.length }),
											t("owner.setup.queued", { count: instance.queued }),
											t("owner.setup.dropped", { count: instance.dropped }),
											t("owner.setup.failedSends", { count: instance.failedSends }),
											t("owner.setup.internalErrors", { count: instance.internalErrors }),
											...(instance.sdkVersion === null ? [] : [`SDK ${instance.sdkVersion}`]),
										].join(t("common.listSeparator"))}
									</span>
								</li>
							))}
						</ul>
					)}
				</Panel>
			</div>

			<ShardlensLinks collector={report.collector} />
		</div>
	);
}

/** Products are named as they name themselves, in every language. */
function versions(bot: NonNullable<CollectorSetup["bot"]>): string {
	const parts = [
		bot.nodeVersion === null ? null : `Node.js ${bot.nodeVersion}`,
		bot.libraryVersion === null ? null : `discord.js ${bot.libraryVersion}`,
		bot.sdkVersion === null ? null : `SDK ${bot.sdkVersion}`,
	].filter((part): part is string => part !== null);
	return parts.length === 0 ? NO_FIGURE : parts.join(" · ");
}
