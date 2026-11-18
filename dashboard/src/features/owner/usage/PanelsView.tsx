import { useTranslation } from "react-i18next";
import { UsageBars } from "@/components/primitives";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { usePanels } from "@/features/owner/useOwner";
import { formatNumber, formatPercent } from "@/lib/intl";

const ACTIONS_SHOWN = 3;

export function PanelsView({ days }: { days: number }): React.JSX.Element {
	const { t } = useTranslation();
	const panels = usePanels(days);

	return (
		<AnalyticsState query={panels}>
			{(report) => (
				<div className="grid items-start gap-4 lg:grid-cols-2">
					<Panel title={t("owner.usageSections.buttons")} hint={t("owner.usageSections.buttonsHint")}>
						<UsageBars
							tint="bg-hue-pink/20"
							empty={t("owner.usageSections.noPresses")}
							rows={report.buttons.map((row) => ({
								id: row.id,
								label: <code className="font-mono text-sm">{row.id}</code>,
								sub: [
									...row.actions
										.slice(0, ACTIONS_SHOWN)
										.map((action) =>
											t("owner.usageSections.actionCount", { action: action.key, number: action.count }),
										),
									...(row.failures > 0 ? [t("owner.usageSections.failedCount", { number: row.failures })] : []),
								].join(t("common.listSeparator")),
								count: row.presses,
							}))}
						/>
					</Panel>

					<Panel title={t("owner.usageSections.forms")} hint={t("owner.usageSections.formsHint")}>
						<UsageBars
							tint="bg-hue-amber/20"
							empty={t("owner.usageSections.noForms")}
							rows={report.forms.map((row) => {
								const abandoned = Math.max(0, row.shown - row.submitted);
								return {
									id: row.id,
									label: <code className="font-mono text-sm">{row.id}</code>,
									sub: t("owner.usageSections.formSub", {
										shown: formatNumber(row.shown),
										submitted: formatNumber(Math.min(row.submitted, row.shown)),
									}),
									count: abandoned,
									value: t("owner.usageSections.abandoned", { share: formatPercent(abandoned, row.shown) }),
								};
							})}
						/>
					</Panel>
				</div>
			)}
		</AnalyticsState>
	);
}
