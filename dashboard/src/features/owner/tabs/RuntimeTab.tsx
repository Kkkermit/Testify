import { ExternalLink } from "lucide-react";
import { Card, Skeleton } from "@/components/primitives";
import { formatUptime } from "@/features/owner/owner.utils";
import { useRuntime } from "@/features/owner/useOwner";

/** What this bot is running as — the first thing to check before believing anything else on this screen. */
export function RuntimeTab(): React.JSX.Element {
	const runtime = useRuntime();

	if (runtime.isPending || runtime.data === undefined) return <Skeleton className="h-64 w-full" />;

	const info = runtime.data;

	return (
		<div className="flex flex-col gap-4">
			<Card padding="none">
				<dl className="divide-border divide-y">
					<Row label="Testify" value={`v${info.version}`} />
					<Row label="Environment" value={info.environment} />
					<Row label="Node" value={info.nodeVersion} />
					<Row label="discord.js" value={`v${info.discordVersion}`} />
					<Row label="Platform" value={info.platform} />
					<Row
						label="Started"
						value={`${new Date(info.startedAt).toLocaleString()} (${formatUptime(info.uptimeMs)})`}
					/>
					<Row
						label="Memory"
						value={`${String(info.memoryMb.heapUsed)} MB heap of ${String(info.memoryMb.heapTotal)} MB, ${String(info.memoryMb.rss)} MB resident`}
					/>
					<Row label="Loaded" value={`${String(info.commands)} commands, ${String(info.events)} event listeners`} />
				</dl>
			</Card>

			<Card className="flex flex-col gap-2">
				<h3 className="text-base font-semibold">Updates</h3>
				<p className="text-muted-foreground text-sm">
					You are running <span className="font-mono">v{info.version}</span>. Testify never contacts a server to check
					for a newer one — a self-hosted bot that phones home on a timer is not something to ship by default. Compare
					it against the releases page when you want to.
				</p>
				<a
					href={`${info.repositoryUrl}/releases`}
					target="_blank"
					rel="noreferrer"
					className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
				>
					Releases on GitHub
					<ExternalLink size={14} aria-hidden="true" />
				</a>
			</Card>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
	return (
		<div className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-baseline sm:gap-4">
			<dt className="text-muted-foreground w-40 shrink-0 text-sm">{label}</dt>
			<dd className="font-mono text-sm break-all">{value}</dd>
		</div>
	);
}
