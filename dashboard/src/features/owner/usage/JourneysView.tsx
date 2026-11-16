import { FUNNEL_LIMITS, FUNNEL_WINDOWS, type RetentionReport } from "@testify/shared";
import { Plus, X } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { LABEL, SELECT, Warning } from "@/components/form";
import { Button, SegmentedControl, UsageBars } from "@/components/primitives";
import { useCommands } from "@/features/commands/useCommands";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { shortDay } from "@/features/owner/owner.utils";
import { SectionState } from "@/features/owner/usage/SectionState";
import { commandFrom, formatWait, stepsFrom } from "@/features/owner/usage/usage.utils";
import { useFunnel, useRetention } from "@/features/owner/useOwner";
import { readerTimeZone } from "@/lib/datetime";
import { formatPercent, formatUnit } from "@/lib/intl";
import { oneOf } from "@/lib/oneOf";

const INTERVALS = ["day", "week"] as const;

function CommandSelect({
	label,
	value,
	names,
	onChange,
	anything,
}: {
	label: string;
	value: string | null;
	names: string[];
	onChange: (name: string | null) => void;
	anything?: string;
}): React.JSX.Element {
	const id = useId();
	const { t } = useTranslation();

	return (
		<div className="flex min-w-0 flex-col gap-1">
			<label htmlFor={id} className={LABEL}>
				{label}
			</label>
			<select
				id={id}
				className={SELECT}
				value={value ?? ""}
				onChange={(event) => {
					onChange(event.target.value === "" ? null : event.target.value);
				}}
			>
				<option value="" disabled={anything === undefined}>
					{anything ?? t("owner.usageSections.pickCommand")}
				</option>
				{names.map((name) => (
					<option key={name} value={name}>
						/{name}
					</option>
				))}
			</select>
		</div>
	);
}

/** Of the people who ran one command, how many went on to others, and how many came back afterwards. */
export function JourneysView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();
	const commands = useCommands();
	const names = (commands.data?.commands ?? []).map((command) => command.name).sort();
	const zone = readerTimeZone();

	const steps = stepsFrom(params.get("steps"));
	const hours = FUNNEL_WINDOWS.find((value) => String(value) === params.get("hours")) ?? 24;
	const start = commandFrom(params.get("start"));
	const back = commandFrom(params.get("back"));
	const interval = oneOf(INTERVALS, params.get("interval"), "week");

	const funnel = useFunnel(days, zone, steps.length >= FUNNEL_LIMITS.minSteps ? steps : [], hours);
	const retention = useRetention(days, zone, start, back, interval);

	const write = (changes: Record<string, string | null>): void => {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				for (const [key, value] of Object.entries(changes)) {
					if (value === null || value === "") next.delete(key);
					else next.set(key, value);
				}
				return next;
			},
			{ replace: true },
		);
	};
	const setSteps = (next: (string | null)[]): void => {
		write({ steps: next.map((name) => name ?? "").join(",") });
	};
	const shown: (string | null)[] =
		steps.length >= FUNNEL_LIMITS.minSteps ? steps : [steps[0] ?? null, steps[1] ?? null];

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

				{steps.length < FUNNEL_LIMITS.minSteps ? (
					<p className="text-muted-foreground text-sm">{t("owner.usageSections.funnelPick")}</p>
				) : (
					<SectionState query={funnel}>
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
					</SectionState>
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
					<SectionState query={retention}>{(report) => <Cohorts report={report} />}</SectionState>
				)}
			</Panel>
		</div>
	);
}

const COLUMNS = 8;

function Cohorts({ report }: { report: RetentionReport }): React.JSX.Element {
	const { t } = useTranslation();
	const periods = Array.from({ length: Math.min(COLUMNS, report.periods) }, (_, index) => index + 1);

	if (report.cohorts.length === 0) {
		return <p className="text-muted-foreground text-sm">{t("owner.usageSections.noCohorts")}</p>;
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[32rem] text-sm tabular-nums">
				<caption className="sr-only">{t("owner.usageSections.retention")}</caption>
				<thead className="text-muted-foreground text-xs">
					<tr>
						<th scope="col" className="py-1 text-left font-medium">
							{t("owner.usageSections.cohort")}
						</th>
						<th scope="col" className="py-1 text-right font-medium">
							{t("owner.usageSections.people")}
						</th>
						{periods.map((period) => (
							<th key={period} scope="col" className="py-1 text-right font-medium">
								{report.interval === "day"
									? t("owner.usageSections.dayN", { number: period })
									: t("owner.usageSections.weekN", { number: period })}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-border divide-y">
					{report.cohorts.map((cohort) => (
						<tr key={cohort.cohort}>
							<th scope="row" className="py-1.5 text-left font-normal">
								{shortDay(cohort.cohort)}
							</th>
							<td className="py-1.5 text-right">{cohort.size}</td>
							{periods.map((period) => (
								<td key={period} className="py-1.5 text-right">
									{formatPercent(cohort.retained[period - 1] ?? 0, cohort.size)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
