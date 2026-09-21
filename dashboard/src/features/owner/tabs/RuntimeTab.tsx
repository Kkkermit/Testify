import { ExternalLink } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Card, DataList, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { formatUptime } from "@/features/owner/owner.utils";
import { useRuntime } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";

/** What this bot is running as — the first thing to check before believing anything else on this screen. */
export function RuntimeTab(): React.JSX.Element {
	const { t } = useTranslation();
	const runtime = useRuntime();

	if (runtime.isPending) return <Skeleton className="h-64 w-full" />;
	// Without this the tab sits on a skeleton for ever, which reads as still loading rather than as failed.
	if (runtime.data === undefined)
		return <ErrorState as="h2" error={runtime.error} onRetry={() => void runtime.refetch()} />;

	const info = runtime.data;

	return (
		<div className="flex flex-col gap-4">
			<Card padding="none">
				<DataList
					mono
					rows={[
						{ label: "Testify", value: `v${info.version}` },
						{ label: "Environment", value: info.environment },
						{ label: "Node", value: info.nodeVersion },
						{ label: "discord.js", value: `v${info.discordVersion}` },
						{ label: "Platform", value: info.platform },
						{
							label: "Started",
							value: `${dateAndTime(info.startedAt)} (${formatUptime(info.uptimeMs)})`,
						},
						{
							label: "Memory",
							value: `${String(info.memoryMb.heapUsed)} MB heap of ${String(info.memoryMb.heapTotal)} MB, ${String(info.memoryMb.rss)} MB resident`,
						},
						{ label: "Loaded", value: `${String(info.commands)} commands, ${String(info.events)} event listeners` },
						{
							label: "Gateway",
							// -1 is what discord.js reports before the first heartbeat comes back, not a real latency.
							value:
								info.gatewayPingMs < 0
									? `still connecting, ${String(info.shards)} shard${info.shards === 1 ? "" : "s"}`
									: `${String(info.gatewayPingMs)} ms, ${String(info.shards)} shard${info.shards === 1 ? "" : "s"}`,
						},
						{
							label: "Cached",
							value: `${info.guilds.toLocaleString()} servers, ${info.cachedChannels.toLocaleString()} channels, ${info.cachedUsers.toLocaleString()} users`,
						},
					]}
				/>
			</Card>

			<Card className="flex flex-col gap-2">
				<h2 className={CARD_HEADING}>{t("owner.updates")}</h2>
				<p className="text-muted-foreground text-sm">
					<Trans
						i18nKey="owner.versionBody"
						values={{ version: info.version }}
						components={{ version: <span className="font-mono" /> }}
					/>
				</p>
				<a
					href={`${info.repositoryUrl}/releases`}
					target="_blank"
					rel="noreferrer"
					className={cn(INLINE_TARGET, "text-accent gap-2 text-sm hover:underline")}
				>
					{t("owner.releases")}
					<ExternalLink size={14} aria-hidden="true" />
				</a>
			</Card>
		</div>
	);
}
