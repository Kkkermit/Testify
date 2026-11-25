import { type AnalyticsProblem } from "@testify/shared";
import { BarChart3, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Button, Card, EmptyState } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { collectorPage } from "@/features/owner/owner.utils";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

export type ProblemWords = Record<AnalyticsProblem, TranslationKey>;

const WHY: ProblemWords = {
	off: "owner.analyticsOff",
	refused: "owner.analyticsRefused",
	unreachable: "owner.analyticsUnreachable",
	audit_off: "owner.analyticsAuditOff",
};

export function AnalyticsUnavailable({
	problem,
	onRetry,
	why = WHY,
}: {
	problem: AnalyticsProblem;
	onRetry: () => void;
	/** A section read with another key says its own reasons. */
	why?: ProblemWords;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card>
			<EmptyState
				icon={<BarChart3 size={20} />}
				title={t("owner.analyticsTitle")}
				body={t(why[problem])}
				{...(problem === "off" || problem === "audit_off"
					? {}
					: {
							action: (
								<Button variant="secondary" onClick={onRetry}>
									{t("common.retry")}
								</Button>
							),
						})}
			/>
		</Card>
	);
}

export function CountsUnavailable({ problem }: { problem: AnalyticsProblem }): React.JSX.Element {
	const { t } = useTranslation();

	return <Warning>{t("owner.countsUnavailable", { reason: t(WHY[problem]) })}</Warning>;
}

export function ShardlensLinks({
	collector,
	guildId,
}: {
	collector: string;
	guildId?: string;
}): React.JSX.Element | null {
	const { t } = useTranslation();
	const activity = collectorPage(collector, "/activity");
	const server = guildId === undefined ? null : collectorPage(collector, `/servers/${guildId}`);
	if (activity === null) return null;

	const link = (href: string, label: string): React.JSX.Element => (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className={cn(INLINE_TARGET, "text-accent gap-2 text-sm hover:underline")}
		>
			{label}
			<ExternalLink size={13} aria-hidden="true" />
		</a>
	);

	return (
		<Card padding="compact" className="flex flex-col gap-2">
			<p className="text-muted-foreground text-sm">{t("owner.whoRanWhat")}</p>
			<div className="flex flex-wrap gap-x-4 gap-y-1">
				{link(activity, t("owner.openActivity"))}
				{server !== null && link(server, t("owner.openServerOnShardlens"))}
			</div>
		</Card>
	);
}
