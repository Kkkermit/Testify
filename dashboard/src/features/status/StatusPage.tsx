import { type StatusLevel, type StatusResponse } from "@testify/shared";
import { AlertTriangle, CheckCircle2, CircleHelp, Clock, Database, Gauge, Radio, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Badge,
	Button,
	Card,
	CARD_HEADING,
	DividedList,
	PageHeader,
	Skeleton,
	StatTile,
} from "@/components/primitives";
import { useBot } from "@/features/auth/useBot";
import { formatUptime } from "@/features/owner/owner.utils";
import { RecentStrip } from "@/features/status/components/RecentStrip";
import { UptimeStrip } from "@/features/status/components/UptimeStrip";
import {
	averageUptime,
	HEADLINE,
	LEVEL_LABEL,
	LEVEL_TONE,
	millis,
	percent,
	serviceName,
} from "@/features/status/status.utils";
import { useStatus } from "@/features/status/useStatus";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { clockTime, dateAndTime, since } from "@/lib/datetime";

const HEADLINE_ICON = { operational: CheckCircle2, degraded: AlertTriangle, down: XCircle, unknown: CircleHelp };
const HEADLINE_TINT = {
	operational: "text-success",
	degraded: "text-warning",
	down: "text-destructive-text",
	unknown: "text-muted-foreground",
};

export function StatusPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("status.title"));

	const bot = useBot();
	const status = useStatus();
	const name = bot.data?.username ?? "Testify";

	const header = <PageHeader title={t("status.title")} subtitle={t("status.subtitle", { name })} />;

	if (status.isPending) {
		return (
			<>
				{header}
				<Skeleton className="h-40 w-full" />
			</>
		);
	}

	// With no answer at all, the bot's own API is what failed, and that is the answer.
	if (status.data === undefined) {
		return (
			<>
				{header}
				<Card focal className="flex flex-col items-start gap-3">
					<Headline level="down" text={t("status.unreachable", { name })} />
					<p className="text-muted-foreground text-sm">{t("status.unreachableBody")}</p>
					<Button variant="secondary" onClick={() => void status.refetch()}>
						{t("common.retry")}
					</Button>
				</Card>
			</>
		);
	}

	const report = status.data;
	const stale = status.isError;

	return (
		<>
			{header}

			<Card focal className="flex flex-col gap-3">
				{/* Only the headline is live, so a poll that changes nothing but the clock is not read out. */}
				<div aria-live="polite">
					{stale ? (
						<Headline level="down" text={t("status.unreachable", { name })} />
					) : (
						<Headline level={report.level} text={t(HEADLINE[report.level])} />
					)}
				</div>
				<p className="text-muted-foreground text-sm">
					{stale
						? t("status.lastHeard", { time: dateAndTime(report.checkedAt) })
						: t("status.onlineFor", {
								uptime: formatUptime(report.uptimeMs),
								started: dateAndTime(report.startedAt),
							})}
				</p>
				{report.paused && <p className="text-warning text-sm">{t("status.paused")}</p>}
				<p className="text-muted-foreground text-xs">{t("status.checkedAt", { time: clockTime(report.checkedAt) })}</p>
			</Card>

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label={t("status.uptime")} value={formatUptime(report.uptimeMs)} icon={Clock} />
				<StatTile
					label={t("status.gateway")}
					value={millis(report.gateway.pingMs)}
					icon={Radio}
					hint={t("status.gatewayHint")}
				/>
				<StatTile
					label={t("status.database")}
					value={millis(report.database.pingMs)}
					icon={Database}
					hint={t("status.databaseHint")}
				/>
				<StatTile
					label={t("status.commands")}
					value={millis(report.commands.p95Ms)}
					icon={Gauge}
					hint={t("status.commandsHint")}
				/>
			</div>

			<History report={report} />
			<Checks report={report} />
			<Packages report={report} />
			<Services report={report} />
		</>
	);
}

function Headline({ level, text }: { level: StatusLevel; text: string }): React.JSX.Element {
	const Icon = HEADLINE_ICON[level];

	return (
		<h2 className="font-display flex items-center gap-3 text-xl font-bold tracking-tight">
			<Icon size={24} aria-hidden="true" className={cn("shrink-0", HEADLINE_TINT[level])} />
			{text}
		</h2>
	);
}

function History({ report }: { report: StatusResponse }): React.JSX.Element {
	const { t } = useTranslation();
	const average = averageUptime(report.days);

	return (
		<Card className="flex flex-col gap-6">
			<section className="flex flex-col gap-3">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<h2 className={CARD_HEADING}>{t("status.lastThirtyDays")}</h2>
					<span className="text-muted-foreground font-mono text-sm tabular-nums">
						{average === null ? t("status.noData") : t("status.upFor", { share: percent(average) })}
					</span>
				</div>
				<UptimeStrip days={report.days} />
			</section>

			<section className="flex flex-col gap-3">
				<h2 className={CARD_HEADING}>{t("status.lastDay")}</h2>
				<RecentStrip buckets={report.recent} />
			</section>

			<p className="text-muted-foreground text-xs">{t("status.historyNote")}</p>
		</Card>
	);
}

function Row({ label, detail, level }: { label: string; detail: string; level: StatusLevel }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<li className="flex items-center justify-between gap-4 px-4 py-3">
			<div className="flex min-w-0 flex-col gap-1">
				<span className="text-sm font-medium">{label}</span>
				<span className="text-muted-foreground text-xs break-words">{detail}</span>
			</div>
			<Badge tone={LEVEL_TONE[level]}>{t(LEVEL_LABEL[level])}</Badge>
		</li>
	);
}

function Checks({ report }: { report: StatusResponse }): React.JSX.Element {
	const { t } = useTranslation();
	const { gateway, database, eventLoop, memory, commands } = report;

	return (
		<Card className="flex flex-col gap-4">
			<h2 className={CARD_HEADING}>{t("status.checks")}</h2>
			<DividedList>
				<Row
					label={t("status.gatewayLabel")}
					detail={
						gateway.pingMs === null
							? t("status.gatewayConnecting")
							: t("status.gatewayDetail", { ping: millis(gateway.pingMs), count: gateway.shards })
					}
					level={gateway.level}
				/>
				<Row
					label={t("status.database")}
					detail={
						database.pingMs === null
							? t("status.databaseSilent")
							: t("status.databaseDetail", { ping: millis(database.pingMs) })
					}
					level={database.level}
				/>
				<Row
					label={t("status.eventLoopLabel")}
					detail={
						eventLoop.p99Ms === null
							? t("status.notMeasured")
							: t("status.eventLoopDetail", { typical: millis(eventLoop.p50Ms), slowest: millis(eventLoop.p99Ms) })
					}
					level={eventLoop.level}
				/>
				<Row
					label={t("status.memoryLabel")}
					detail={t("status.memoryDetail", { used: memory.heapUsedMb, limit: memory.heapLimitMb, rss: memory.rssMb })}
					level={memory.level}
				/>
				<Row
					label={t("status.commands")}
					detail={
						commands.runs === 0
							? t("status.commandsIdle")
							: t("status.commandsDetail", {
									count: commands.runs,
									typical: millis(commands.p50Ms),
									slowest: millis(commands.p95Ms),
									failures: commands.failures,
								})
					}
					level={commands.level}
				/>
			</DividedList>
		</Card>
	);
}

function Packages({ report }: { report: StatusResponse }): React.JSX.Element {
	const { t } = useTranslation();
	const [ytDlp, ffmpeg] = [
		report.packages.find((check) => check.key === "ytDlp"),
		report.packages.find((check) => check.key === "ffmpeg"),
	];

	return (
		<Card className="flex flex-col gap-4">
			<h2 className={CARD_HEADING}>{t("status.packages")}</h2>
			<DividedList>
				{ytDlp !== undefined && (
					<Row
						label="yt-dlp"
						detail={
							!ytDlp.installed
								? t("status.ytDlpMissing")
								: ytDlp.version === null
									? t("status.installed")
									: ytDlp.ageDays === null
										? t("status.version", { version: ytDlp.version })
										: t("status.versionAge", { version: ytDlp.version, count: ytDlp.ageDays })
						}
						level={ytDlp.level}
					/>
				)}
				{ffmpeg !== undefined && (
					<Row
						label="FFmpeg"
						detail={ffmpeg.installed ? t("status.installed") : t("status.ffmpegMissing")}
						level={ffmpeg.level}
					/>
				)}
			</DividedList>
		</Card>
	);
}

function Services({ report }: { report: StatusResponse }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className={CARD_HEADING}>{t("status.services")}</h2>
				<p className="text-muted-foreground text-sm">{t("status.servicesNote")}</p>
			</div>

			{report.services.length === 0 ? (
				<p className="text-muted-foreground text-sm">{t("status.noServices")}</p>
			) : (
				<DividedList>
					{report.services.map((service) => (
						<Row
							key={service.name}
							label={serviceName(service.name)}
							detail={
								service.lastAt === null
									? t("status.neverCalled")
									: [
											t("status.lastCall", { when: since(service.lastAt) }),
											...(service.latencyMs === null ? [] : [millis(service.latencyMs)]),
											t("status.failedOf", { failures: service.failures, count: service.calls }),
										].join(" · ")
							}
							level={service.level}
						/>
					))}
				</DividedList>
			)}
		</Card>
	);
}
