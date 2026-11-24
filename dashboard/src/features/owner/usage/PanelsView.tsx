import { useTranslation } from "react-i18next";
import { UsageBars } from "@/components/primitives";
import { AnalyticsState } from "@/features/owner/components/AnalyticsState";
import { UsagePanel as Panel } from "@/features/owner/components/UsagePanel";
import { codeLabel, formBars } from "@/features/owner/usage/usageBars";
import { usePanels } from "@/features/owner/useOwner";

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
								label: codeLabel(row.id),
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
							rows={formBars(report.forms, t)}
						/>
					</Panel>
				</div>
			)}
		</AnalyticsState>
	);
}
