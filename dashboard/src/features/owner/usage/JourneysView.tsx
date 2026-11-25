import { FUNNEL_LIMITS, FUNNEL_WINDOWS, RETENTION_INTERVALS, type RetentionReport } from "@testify/shared";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { LABEL, Warning } from "@/components/form";
import { Button, SegmentedControl, UsageBars } from "@/components/primitives";
import { useCommands } from "@/features/commands/useCommands";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { CohortTable } from "@/features/owner/components/CohortTable";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { searchWith } from "@/features/owner/owner.utils";
import { CommandSelect } from "@/features/owner/usage/CommandSelect";
import { chosenSteps, commandFrom, formatWait, stepsFrom } from "@/features/owner/usage/usage.utils";
import { useFunnel, useRetention } from "@/features/owner/useOwner";
import { readerTimeZone } from "@/lib/datetime";
import { formatPercent, formatUnit } from "@/lib/intl";
import { oneOf } from "@/lib/oneOf";

export function JourneysView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();
	const commands = useCommands();
	const names = (commands.data?.commands ?? []).map((command) => command.name).sort();
	const zone = readerTimeZone();

	const shown = stepsFrom(params.get("steps"));
	const steps = chosenSteps(shown);
	const hours = FUNNEL_WINDOWS.find((value) => String(value) === params.get("hours")) ?? 24;
	const start = commandFrom(params.get("start"));
	const back = commandFrom(params.get("back"));
	const interval = oneOf(RETENTION_INTERVALS, params.get("interval"), "week");

	const funnel = useFunnel(days, zone, steps ?? [], hours);
	const retention = useRetention(days, zone, start, back, interval);

	const write = (changes: Record<string, string | null>): void => {
		setParams(searchWith(params, changes), { replace: true });
	};
	const setSteps = (next: (string | null)[]): void => {
		write({ steps: next.every((name) => name === null) ? null : next.map((name) => name ?? "").join(",") });
	};

	return (
		<div className="flex flex-col gap-4">
			{commands.isError && <Warning>{t("owner.usageSections.commandsUnread")}</Warning>}

			<Panel wide title={t("owner.usageSections.funnel")} hint={t("owner.usageSections.funnelHint")}>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{shown.map((step, index) => (
						<div key={index} className="flex items-end gap-2">
							<div className="min-w-0 flex-1">
								<CommandSelect
									label={t("owner.usageSections.step", { number: index + 1 })}
									value={step}
									names={names}
									onChange={(name) => {
										setSteps(shown.map((current, at) => (at === index ? name : current)));
									}}
								/>
							</div>
							{shown.length > FUNNEL_LIMITS.minSteps && (
								<Button
									variant="ghost"
									aria-label={t("owner.usageSections.removeStep", { number: index + 1 })}
									onClick={() => {
										setSteps(shown.filter((_, at) => at !== index));
									}}
								>
									<X size={16} aria-hidden="true" />
								</Button>
							)}
						</div>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{shown.length < FUNNEL_LIMITS.maxSteps && (
						<Button
							variant="secondary"
							onClick={() => {
								setSteps([...shown, null]);
							}}
						>
							<Plus size={16} aria-hidden="true" />
							{t("owner.usageSections.addStep")}
						</Button>
					)}
					<SegmentedControl
						label={t("owner.usageSections.within")}
						segments={FUNNEL_WINDOWS.map((value) => ({
							value,
							label: value < 24 ? formatUnit(value, "hour") : formatUnit(value / 24, "day"),
						}))}
						value={hours}
						onChange={(value) => {
							write({ hours: String(value) });
						}}
					/>
				</div>

				{steps === null ? (
					<p className="text-muted-foreground text-sm">{t("owner.usageSections.funnelPick")}</p>
				) : (
					<AnalyticsState query={funnel}>
						{(report) => {
							const entered = report.steps[0]?.users ?? 0;
							return (
								<UsageBars
									tint="bg-hue-green/20"
									empty={t("owner.nothingRecorded")}
									rows={report.steps.map((row, index) => ({
										id: `${String(index)} ${row.command}`,
										label: `/${row.command}`,
										sub:
											row.medianSeconds === null
												? t("owner.usageSections.entered")
												: t("owner.usageSections.typicallyAfter", { wait: formatWait(row.medianSeconds) }),
										count: row.users,
										value: t("owner.usageSections.peopleShare", {
											number: row.users,
											share: formatPercent(row.users, entered),
										}),
									}))}
								/>
							);
						}}
					</AnalyticsState>
				)}
			</Panel>

			<Panel wide title={t("owner.usageSections.retention")} hint={t("owner.usageSections.retentionHint")}>
				<div className="grid gap-3 sm:grid-cols-3">
					<CommandSelect
						label={t("owner.usageSections.startedWith")}
						value={start}
						names={names}
						onChange={(name) => {
							write({ start: name });
						}}
					/>
					<CommandSelect
						label={t("owner.usageSections.cameBackTo")}
						value={back}
						names={names}
						anything={t("owner.usageSections.anything")}
						onChange={(name) => {
							write({ back: name });
						}}
					/>
					<div className="flex flex-col gap-1">
						<span className={LABEL}>{t("owner.usageSections.every")}</span>
						<SegmentedControl
							label={t("owner.usageSections.every")}
							segments={[
								{ value: "day", label: t("owner.usageSections.byDay") },
								{ value: "week", label: t("owner.usageSections.byWeek") },
							]}
							value={interval}
							onChange={(value) => {
								write({ interval: value });
							}}
						/>
					</div>
				</div>

				{start === null ? (
					<p className="text-muted-foreground text-sm">{t("owner.usageSections.retentionPick")}</p>
				) : (
					<AnalyticsState query={retention}>{(report) => <Cohorts report={report} />}</AnalyticsState>
				)}
			</Panel>
		</div>
	);
}

function Cohorts({ report }: { report: RetentionReport }): React.JSX.Element {
	const { t } = useTranslation();
	const periods = Array.from({ length: report.periods }, (_, index) => index);

	return (
		<CohortTable
			caption={t("owner.usageSections.retention")}
			sizeLabel={t("owner.usageSections.people")}
			empty={t("owner.usageSections.noCohorts")}
			periodLabel={(period) =>
				report.interval === "day"
					? t("owner.usageSections.dayN", { number: period })
					: t("owner.usageSections.weekN", { number: period })
			}
			rows={report.cohorts.map((cohort) => ({
				cohort: cohort.cohort,
				size: cohort.size,
				cells: periods.map((index) => formatPercent(cohort.retained[index] ?? 0, cohort.size)),
			}))}
		/>
	);
}
