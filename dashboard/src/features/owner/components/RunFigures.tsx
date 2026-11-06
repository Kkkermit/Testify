import { errorRate, type UsageDay } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Figure } from "@/components/primitives";
import { UsageChart } from "@/features/owner/components/UsageChart";
import { percent } from "@/features/owner/owner.utils";
import { formatNumber } from "@/lib/intl";

/** Runs and failures, two figures of the caller's own, and the runs a day under them. */
export function RunFigures({
	runs,
	failures,
	daily,
	children,
}: {
	runs: number;
	failures: number;
	daily: UsageDay[];
	children: React.ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			<dl className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-border">
				<Figure className="px-6 py-4" label={t("owner.commandsRun")} value={formatNumber(runs)} />
				<Figure
					className="px-6 py-4"
					label={t("owner.failed")}
					value={percent(failures, runs)}
					{...(errorRate({ runs, failures }) > 0.05 ? { tone: "text-destructive-text" } : {})}
				/>
				{children}
			</dl>

			<div className="px-6 py-5">
				<UsageChart days={daily} />
			</div>
		</>
	);
}
