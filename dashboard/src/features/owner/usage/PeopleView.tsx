import { type Tally } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Card, Figure, UsageBars } from "@/components/primitives";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { DayBars } from "@/features/owner/components/DayBars";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { shareOrDash } from "@/features/owner/owner.utils";
import { HourHeatmap } from "@/features/owner/usage/HourHeatmap";
import { CONTEXT_LABELS, isTranslated, labelOf, TIER_LABELS } from "@/features/owner/usage/usage.utils";
import { useAudience } from "@/features/owner/useOwner";
import { readerTimeZone } from "@/lib/datetime";
import { formatNumber, languageName } from "@/lib/intl";

export function PeopleView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const audience = useAudience(days, readerTimeZone());

	const languageBars = (rows: Tally[]): React.ComponentProps<typeof UsageBars>["rows"] =>
		rows.map((row) => ({
			id: row.key,
			label: languageName(row.key),
			sub: isTranslated(row.key) ? t("owner.usageSections.translated") : t("owner.usageSections.inEnglish"),
			count: row.count,
		}));

	return (
		<AnalyticsState query={audience}>
			{(report) => {
				const busiest = Math.max(0, ...report.daily.map((day) => day.users));
				return (
					<div className="flex flex-col gap-4">
						<Card padding="none" className="divide-border divide-y">
							<dl className="grid grid-cols-2 divide-x sm:grid-cols-3 [&>*]:border-border">
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.busiestDay")}
									value={formatNumber(busiest)}
								/>
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.newPeople")}
									value={formatNumber(report.daily.reduce((total, day) => total + day.newUsers, 0))}
								/>
								<Figure
									className="px-6 py-4"
									label={t("owner.usageSections.stickiness")}
									value={shareOrDash(report.stickiness)}
								/>
							</dl>
							<div className="px-6 py-5">
								<DayBars
									days={report.daily.map((day) => ({ day: day.day, value: day.users }))}
									caption={t("owner.usageSections.peoplePerDay")}
									valueLabel={t("owner.usageSections.people")}
								/>
							</div>
						</Card>

						<div className="grid items-start gap-4 lg:grid-cols-2">
							<Panel wide title={t("owner.usageSections.hours")} hint={t("owner.usageSections.hoursHint")}>
								<HourHeatmap hours={report.hours} />
							</Panel>

							<Panel title={t("owner.usageSections.userLanguages")} hint={t("owner.usageSections.userLanguagesHint")}>
								<UsageBars
									tint="bg-hue-blue/20"
									empty={t("owner.nothingRecorded")}
									rows={languageBars(report.userLanguages)}
								/>
							</Panel>

							<Panel
								title={t("owner.usageSections.serverLanguages")}
								hint={t("owner.usageSections.serverLanguagesHint")}
							>
								<UsageBars
									tint="bg-hue-blue/20"
									empty={t("owner.nothingRecorded")}
									rows={languageBars(report.serverLanguages)}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.tiers")} hint={t("owner.usageSections.tiersHint")}>
								<UsageBars
									tint="bg-hue-violet/20"
									empty={t("owner.nothingRecorded")}
									rows={report.tiers.map((row) => ({
										id: row.key,
										label: labelOf(TIER_LABELS, row.key, t),
										count: row.count,
									}))}
								/>
							</Panel>

							<Panel title={t("owner.usageSections.contexts")} hint={t("owner.usageSections.contextsHint")}>
								<UsageBars
									tint="bg-hue-violet/20"
									empty={t("owner.nothingRecorded")}
									rows={report.contexts.map((row) => ({
										id: row.key,
										label: labelOf(CONTEXT_LABELS, row.key, t),
										count: row.count,
									}))}
								/>
							</Panel>
						</div>
					</div>
				);
			}}
		</AnalyticsState>
	);
}
