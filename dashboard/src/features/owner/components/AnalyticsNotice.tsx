import { type AnalyticsProblem } from "@testify/shared";
import { BarChart3, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Button, Card, EmptyState } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { collectorPage } from "@/features/owner/owner.utils";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

const WHY: Record<AnalyticsProblem, TranslationKey> = {
	off: "owner.analyticsOff",
	refused: "owner.analyticsRefused",
	unreachable: "owner.analyticsUnreachable",
};

/** The Usage tab when Shardlens cannot be read; a missing key is a setting, so only the other two offer a retry. */
export function AnalyticsUnavailable({
	problem,
	onRetry,
}: {
	problem: AnalyticsProblem;
	onRetry: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card>
			<EmptyState
				icon={<BarChart3 size={20} />}
				title={t("owner.analyticsTitle")}
				body={t(WHY[problem])}
				{...(problem === "off"
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

/** Beside counts Shardlens could not give, on the list of servers and one server's detail. */
export function CountsUnavailable({ problem }: { problem: AnalyticsProblem }): React.JSX.Element {
	const { t } = useTranslation();

	return <Warning>{t("owner.countsUnavailable", { reason: t(WHY[problem]) })}</Warning>;
}

/** Where who ran what is kept: the collector's Activity page, which its own sign-in guards. */
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
