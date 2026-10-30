import { ExternalLink } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Card, CARD_HEADING, DataList, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useRuntime } from "@/features/owner/useOwner";
import { currentBotName } from "@/i18n";
import { cn } from "@/lib/cn";
import { formatUptime, dateAndTime } from "@/lib/datetime";
import { formatUnit } from "@/lib/intl";

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
						{ label: currentBotName(), value: `v${info.version}` },
						{ label: t("owner.runtimeEnvironment"), value: info.environment },
						{ label: t("owner.runtimeNode"), value: info.nodeVersion },
						{ label: "discord.js", value: `v${info.discordVersion}` },
						{ label: t("owner.runtimePlatform"), value: info.platform },
						{
							label: t("owner.runtimeStarted"),
							value: `${dateAndTime(info.startedAt)} (${formatUptime(info.uptimeMs)})`,
						},
						{
							label: t("owner.memory"),
							value: t("owner.runtimeMemory", {
								heap: formatUnit(info.memoryMb.heapUsed, "megabyte"),
								total: formatUnit(info.memoryMb.heapTotal, "megabyte"),
								rss: formatUnit(info.memoryMb.rss, "megabyte"),
							}),
						},
						{
							label: t("owner.runtimeLoaded"),
							value: t("owner.runtimeLoadedValue", { commands: info.commands, events: info.events }),
						},
						{
							label: t("owner.runtimeGateway"),
							// -1 is what discord.js reports before the first heartbeat comes back, not a real latency.
							value:
								info.gatewayPingMs < 0
									? t("owner.runtimeConnecting", { count: info.shards })
									: t("owner.runtimePing", { ping: formatUnit(info.gatewayPingMs, "millisecond"), count: info.shards }),
						},
						{
							label: t("owner.runtimeCached"),
							value: t("owner.runtimeCachedValue", {
								servers: info.guilds,
								channels: info.cachedChannels,
								users: info.cachedUsers,
							}),
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
