import { type Tally } from "@testify/shared";
import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { UsageBars } from "@/components/primitives";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { screenLabel } from "@/features/owner/owner.utils";
import {
	ACTION_LABELS,
	CHANGE_WAY_LABELS,
	labelOf,
	MUSIC_REASON_LABELS,
	REFUSAL_LABELS,
	sourceName,
	SUPPORT_WAY_LABELS,
} from "@/features/owner/usage/usage.utils";
import { useBotActivity } from "@/features/owner/useOwner";

type Bars = React.ComponentProps<typeof UsageBars>["rows"];

const plain = (rows: Tally[], label: (key: string) => React.ReactNode, prefix = ""): Bars =>
	rows.map((row) => ({ id: `${prefix}${row.key}`, label: label(row.key), count: row.count }));

function deskBars(answered: Tally[], refused: Tally[], t: TFunction): Bars {
	return [
		...plain(
			answered,
			(key) => t("owner.usageSections.answeredBy", { way: labelOf(SUPPORT_WAY_LABELS, key, t) }),
			"a:",
		),
		...plain(refused, (key) => t("owner.usageSections.refusedBy", { way: labelOf(SUPPORT_WAY_LABELS, key, t) }), "r:"),
	].sort((a, b) => b.count - a.count);
}

export function ActivityView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const activity = useBotActivity(days);

	return (
		<AnalyticsState query={activity}>
			{(report) => (
				<div className="flex flex-col gap-4">
					{report.detailDays < days && (
						<Warning>{t("owner.usageSections.detailNote", { days: report.detailDays })}</Warning>
					)}

					<div className="grid items-start gap-4 lg:grid-cols-2">
						<Panel
							title={t("owner.usageSections.music")}
							hint={t("owner.usageSections.musicSummary", {
								played: report.music.played,
								skipped: report.music.skipped,
								refused: report.music.refused,
							})}
						>
							<UsageBars
								tint="bg-destructive/15"
								empty={t("owner.usageSections.noMusicProblems")}
								rows={report.music.causes.map((row) => ({
									id: `${row.source}/${row.reason}`,
									label: t("owner.usageSections.causeLabel", {
										source: sourceName(row.source, t),
										reason: labelOf(MUSIC_REASON_LABELS, row.reason, t),
									}),
									count: row.count,
								}))}
							/>
						</Panel>

						<Panel title={t("owner.usageSections.musicSources")} hint={t("owner.usageSections.musicSourcesHint")}>
							<UsageBars
								tint="bg-hue-pink/20"
								empty={t("owner.usageSections.noTracks")}
								rows={plain(report.music.sources, (key) => sourceName(key, t))}
							/>
						</Panel>

						<Panel
							title={t("owner.usageSections.desk")}
							hint={t("owner.usageSections.deskSummary", {
								answered: report.support.answered,
								refused: report.support.refused,
							})}
						>
							<UsageBars
								tint="bg-hue-blue/20"
								empty={t("owner.usageSections.noQuestions")}
								rows={deskBars(report.support.answeredBy, report.support.refusedBy, t)}
							/>
						</Panel>

						<Panel title={t("owner.usageSections.articles")} hint={t("owner.usageSections.articlesHint")}>
							<UsageBars
								tint="bg-hue-blue/20"
								empty={t("owner.usageSections.noQuestions")}
								rows={plain(report.support.articles, (key) => (
									<code className="font-mono text-sm">{key}</code>
								))}
							/>
						</Panel>

						<Panel
							title={t("owner.usageSections.refusals")}
							hint={t("owner.usageSections.refusalsSummary", { number: report.refusals.total })}
						>
							<UsageBars
								tint="bg-hue-amber/20"
								empty={t("owner.usageSections.noRefusals")}
								rows={plain(report.refusals.reasons, (key) => labelOf(REFUSAL_LABELS, key, t))}
							/>
						</Panel>

						<Panel title={t("owner.usageSections.refusedMost")} hint={t("owner.usageSections.refusedMostHint")}>
							<UsageBars
								tint="bg-hue-amber/20"
								empty={t("owner.usageSections.noRefusals")}
								rows={plain(report.refusals.commands, (key) => `/${key}`)}
							/>
						</Panel>

						<Panel
							title={t("owner.usageSections.changes")}
							hint={t("owner.usageSections.changesSummary", { number: report.changes.total })}
						>
							<UsageBars
								tint="bg-hue-green/20"
								empty={t("owner.usageSections.noChanges")}
								rows={report.changes.screens.map((row) => ({
									id: row.key,
									label: screenLabel(row.key),
									sub: row.key,
									count: row.count,
								}))}
							/>
						</Panel>

						<Panel title={t("owner.usageSections.changeWays")} hint={t("owner.usageSections.changeWaysHint")}>
							<UsageBars
								tint="bg-hue-green/20"
								empty={t("owner.usageSections.noChanges")}
								rows={plain(report.changes.ways, (key) => labelOf(CHANGE_WAY_LABELS, key, t))}
							/>
						</Panel>

						{/* The ninth panel, so it spans the row rather than leaving half of one empty. */}
						<Panel wide title={t("owner.usageSections.automatic")} hint={t("owner.usageSections.automaticHint")}>
							<UsageBars
								tint="bg-hue-violet/20"
								empty={t("owner.nothingRecorded")}
								rows={report.automatic
									.filter((row) => row.count > 0)
									.sort((a, b) => b.count - a.count)
									.map((row) => ({ id: row.action, label: t(ACTION_LABELS[row.action]), count: row.count }))}
							/>
						</Panel>
					</div>
				</div>
			)}
		</AnalyticsState>
	);
}
