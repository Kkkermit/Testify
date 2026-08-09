import { ExternalLink } from "lucide-react";
import { Card, DataList, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { formatUptime } from "@/features/owner/owner.utils";
import { useRuntime } from "@/features/owner/useOwner";
import { cn } from "@/lib/cn";
import { dateAndTime } from "@/lib/datetime";

/** What this bot is running as — the first thing to check before believing anything else on this screen. */
export function RuntimeTab(): React.JSX.Element {
	const runtime = useRuntime();

	if (runtime.isPending || runtime.data === undefined) return <Skeleton className="h-64 w-full" />;

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
					]}
				/>
			</Card>

			<Card className="flex flex-col gap-2">
				<h2 className={CARD_HEADING}>Updates</h2>
				<p className="text-muted-foreground text-sm">
					You are running <span className="font-mono">v{info.version}</span>. Testify never contacts a server to check
					for a newer one — a self-hosted bot that phones home on a timer is not something to ship by default. Compare
					it against the releases page when you want to.
				</p>
				<a
					href={`${info.repositoryUrl}/releases`}
					target="_blank"
					rel="noreferrer"
					className={cn(INLINE_TARGET, "text-accent gap-2 text-sm hover:underline")}
				>
					Releases on GitHub
					<ExternalLink size={14} aria-hidden="true" />
				</a>
			</Card>
		</div>
	);
}
