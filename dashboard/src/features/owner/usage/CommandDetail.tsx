import { type CommandReport, LATENCY_BUCKETS, latencyBucketEnd } from "@testify/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { Warning } from "@/components/form";
import { Card, Figure, UsageBars } from "@/components/primitives";
import { categoryLabel } from "@/features/commands/categories.labels";
import { ShardlensLinks } from "@/features/owner/components/AnalyticsNotice";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { ColumnBars } from "@/features/owner/components/DayBars";
import { FigureStrip } from "@/features/owner/components/FigureStrip";
import { RunFigures } from "@/features/owner/components/RunFigures";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { countOrDash, formatMs, NO_FIGURE, searchWith, shareOrDash, surfaceBars } from "@/features/owner/owner.utils";
import { kindLabel } from "@/features/owner/usage/runs.utils";
import {
	CHANNEL_TYPE_LABELS,
	CONTEXT_LABELS,
	INSTALL_LABELS,
	labelOf,
	tallyBars,
	TIER_LABELS,
} from "@/features/owner/usage/usage.utils";
import { codeLabel, formBars, guildBar } from "@/features/owner/usage/usageBars";
import { useCommandReport } from "@/features/owner/useOwner";
import { dateAndTime } from "@/lib/datetime";
import { languageName } from "@/lib/intl";

const BACK = { command: null };
const PREFIX_KIND = "message_command";

/** A prefix run is the SDK's message command; every other kind is something Discord delivered. */
const surfacesOf = (kinds: CommandReport["kinds"]): { slash: number; prefix: number } => ({
	slash: kinds.filter((row) => row.key !== PREFIX_KIND).reduce((total, row) => total + row.count, 0),
	prefix: kinds.find((row) => row.key === PREFIX_KIND)?.count ?? 0,
});

export function CommandDetail({ name, days }: { name: string; days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const [params] = useSearchParams();
	const report = useCommandReport(name, days);

	return (
		<div className="flex flex-col gap-4">
			<Link
				to={searchWith(params, BACK)}
				className="text-accent inline-flex items-center gap-2 self-start text-sm hover:underline"
			>
				<ArrowLeft size={14} aria-hidden="true" />
				{t("owner.commandDetail.allCommands")}
			</Link>

			<AnalyticsState query={report}>{(detail) => <CommandFigures report={detail} params={params} />}</AnalyticsState>
		</div>
	);
}

/** Bucket `i` is named by where it ends, which is how somebody reads an answer time. */
const bucketLabel = (index: number): string => `≤ ${formatMs(Math.round(latencyBucketEnd(index)))}`;

function CommandFigures({ report, params }: { report: CommandReport; params: URLSearchParams }): React.JSX.Element {
	const { t } = useTranslation();
	const { totals } = report;
	const failures = totals.errors + totals.late + totals.noResponse;
	const plainBars = (rows: CommandReport["kinds"], label: (key: string) => React.ReactNode): React.JSX.Element => (
		<UsageBars tint="bg-hue-violet/20" empty={t("owner.nothingRecorded")} rows={tallyBars(rows, label)} />
	);

	return (
		<div className="flex flex-col gap-4">
			{report.from.slice(0, 10) > (report.daily[0]?.day ?? "") && (
				<Warning>{t("owner.commandDetail.detailFrom", { date: dateAndTime(report.from) })}</Warning>
			)}

			<Card padding="none" className="divide-border divide-y">
				<div className="px-6 py-4">
					<h2 className="text-base font-semibold">/{report.command}</h2>
					<p className="text-muted-foreground text-xs">{categoryLabel(report.category, t)}</p>
				</div>
				<RunFigures runs={totals.runs} failures={failures} daily={report.daily}>
					<Figure label={t("owner.commandDetail.late")} value={countOrDash(totals.late)} />
					<Figure label={t("owner.commandDetail.noReply")} value={countOrDash(totals.noResponse)} />
				</RunFigures>
				<FigureStrip>
					<Figure label={t("owner.commandDetail.deferred")} value={shareOrDash(totals.deferRate)} />
					<Figure label={t("owner.commandDetail.private")} value={shareOrDash(totals.ephemeralRate)} />
					<Figure label={t("owner.usageSections.over3s")} value={shareOrDash(totals.over3sRate)} />
					<Figure
						label={t("owner.commandDetail.handler")}
						value={totals.handlerP95Ms === null ? NO_FIGURE : formatMs(totals.handlerP95Ms)}
					/>
				</FigureStrip>
				<p className="text-muted-foreground px-6 py-3 text-xs">
					{t("owner.commandDetail.seen", {
						first: totals.firstAt === null ? NO_FIGURE : dateAndTime(totals.firstAt),
						last: totals.lastAt === null ? NO_FIGURE : dateAndTime(totals.lastAt),
					})}
				</p>
			</Card>

			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel wide title={t("owner.commandDetail.latency")} hint={t("owner.commandDetail.latencyHint")}>
					{report.latency === null ? (
						<p className="text-muted-foreground text-sm">{t("owner.commandDetail.noLatency")}</p>
					) : (
						<ColumnBars
							tint="bg-hue-blue/40"
							caption={t("owner.commandDetail.latency")}
							columnLabel={t("owner.commandDetail.answeredWithin")}
							valueLabel={t("owner.commandsRun")}
							columns={report.latency
								.slice(0, LATENCY_BUCKETS)
								.map((value, index) => ({ key: String(index), label: bucketLabel(index), value }))}
						/>
					)}
				</Panel>

				<Panel title={t("owner.commandDetail.subcommands")} hint={t("owner.commandDetail.subcommandsHint")}>
					{plainBars(report.subcommands, (key) => `/${report.command} ${key}`)}
				</Panel>

				<Panel title={t("owner.commandDetail.options")} hint={t("owner.commandDetail.optionsHint")}>
					{plainBars(report.options, codeLabel)}
				</Panel>

				<Panel title={t("owner.commandDetail.choices")} hint={t("owner.commandDetail.choicesHint")}>
					<UsageBars
						tint="bg-hue-green/20"
						empty={t("owner.commandDetail.noChoices")}
						rows={report.optionValues.map((row) => ({
							id: `${row.option}=${row.value}`,
							label: row.value,
							sub: row.option,
							count: row.runs,
						}))}
					/>
				</Panel>

				<Panel title={t("owner.howRun")} hint={t("owner.howRunHint")}>
					<UsageBars
						tint="bg-hue-violet/20"
						empty={t("owner.nothingRecorded")}
						rows={surfaceBars(surfacesOf(report.kinds), t)}
					/>
				</Panel>

				<Panel title={t("owner.usageSections.tiers")} hint={t("owner.usageSections.tiersHint")}>
					{plainBars(report.tiers, (key) => labelOf(TIER_LABELS, key, t))}
				</Panel>

				<Panel title={t("owner.usageSections.contexts")} hint={t("owner.usageSections.contextsHint")}>
					{plainBars(report.contexts, (key) => labelOf(CONTEXT_LABELS, key, t))}
				</Panel>

				<Panel title={t("owner.usageSections.installs")} hint={t("owner.usageSections.installsHint")}>
					{plainBars(report.installs, (key) => labelOf(INSTALL_LABELS, key, t))}
				</Panel>

				<Panel title={t("owner.commandDetail.channels")} hint={t("owner.commandDetail.channelsHint")}>
					{plainBars(report.channelTypes, (key) => labelOf(CHANNEL_TYPE_LABELS, key, t))}
				</Panel>

				<Panel title={t("owner.usageSections.userLanguages")} hint={t("owner.commandDetail.languagesHint")}>
					{plainBars(report.locales, languageName)}
				</Panel>

				<Panel title={t("owner.busiest")} hint={t("owner.commandDetail.serversHint")}>
					<UsageBars
						tint="bg-hue-blue/20"
						empty={t("owner.noServerRun")}
						rows={report.servers.map((row) => guildBar(row, params, t))}
					/>
				</Panel>

				<Panel title={t("owner.usageSections.buttons")} hint={t("owner.commandDetail.componentsHint")}>
					<UsageBars
						tint="bg-hue-pink/20"
						empty={t("owner.usageSections.noPresses")}
						rows={report.components.map((row) => ({
							id: `${row.kind} ${row.handler}`,
							label: codeLabel(row.handler),
							sub: t(kindLabel(row.kind) ?? "owner.runs.kindButton"),
							count: row.count,
						}))}
					/>
				</Panel>

				<Panel wide title={t("owner.usageSections.forms")} hint={t("owner.commandDetail.formsHint")}>
					<UsageBars tint="bg-hue-amber/20" empty={t("owner.usageSections.noForms")} rows={formBars(report.forms, t)} />
				</Panel>
			</div>

			<ShardlensLinks collector={report.collector} />
		</div>
	);
}
