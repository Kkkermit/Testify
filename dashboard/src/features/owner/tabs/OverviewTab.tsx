import { Clock, Cpu, Database, Server, Terminal, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Pager, Skeleton, StatTile } from "@/components/primitives";
import { GuildDetail } from "@/features/owner/components/GuildDetail";
import { OwnerGuildTable } from "@/features/owner/components/OwnerGuildTable";
import { formatUptime, pageCount, pageFrom } from "@/features/owner/owner.utils";
import { PER_PAGE, useOwnerGuilds, useOwnerStats } from "@/features/owner/useOwner";

/** Answers "which of my servers is misconfigured", which is the reason the console exists at all. */
export function OverviewTab(): React.JSX.Element {
	// In the URL rather than in state, so a link to page 3 is a link to page 3.
	const [params, setParams] = useSearchParams();
	const page = pageFrom(params.get("page"));
	const health = useOwnerStats();
	const guilds = useOwnerGuilds(page);

	if (health.isError) return <ErrorState error={health.error} onRetry={() => void health.refetch()} />;

	const selected = params.get("server");
	const stats = health.data;

	// Merged rather than replaced, or paging would drop the `?tab=` that got you here.
	function put(changes: Record<string, string | null>): void {
		setParams((current) => {
			const merged = new URLSearchParams(current);
			for (const [key, value] of Object.entries(changes)) {
				if (value === null) merged.delete(key);
				else merged.set(key, value);
			}
			return merged;
		});
	}

	return (
		<div className="flex flex-col gap-6">
			<section aria-label="Bot health" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
				{stats === undefined ? (
					[0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-[86px]" />)
				) : (
					<>
						<StatTile label="Servers" value={stats.guilds} icon={Server} tint="text-feature-tickets" />
						<StatTile
							label="Members"
							value={stats.users}
							icon={Users}
							tint="text-feature-welcome"
							hint="Everyone Testify can see, counted across every server. People in two servers count twice."
						/>
						<StatTile label="Commands" value={stats.commands} icon={Terminal} tint="text-feature-levelling" />
						<StatTile
							label="Uptime"
							value={formatUptime(stats.uptimeMs)}
							icon={Clock}
							tint="text-feature-economy"
							hint="Since the bot process last started, not since it last connected to Discord."
						/>
						<StatTile label="Memory" value={`${String(stats.memoryMb)} MB`} icon={Cpu} tint="text-feature-economy" />
						<StatTile
							label="Database"
							value={stats.database}
							icon={Database}
							tint={stats.database === "connected" ? "text-success" : "text-destructive"}
						/>
					</>
				)}
			</section>

			<section aria-labelledby="servers-heading" className="flex flex-col gap-3">
				<h2 id="servers-heading" className="text-lg font-semibold">
					Servers
				</h2>

				{selected !== null && (
					<GuildDetail
						guildId={selected}
						onClose={() => {
							put({ server: null });
						}}
					/>
				)}

				{guilds.data === undefined ? (
					<Skeleton className="h-64 w-full" />
				) : (
					<OwnerGuildTable
						guilds={guilds.data.items}
						selected={selected}
						onSelect={(guildId) => {
							put({ server: guildId });
						}}
					/>
				)}

				<Pager
					page={page}
					pages={pageCount(guilds.data?.total ?? 0, PER_PAGE)}
					onChange={(next) => {
						put({ page: String(next) });
					}}
				/>
			</section>
		</div>
	);
}
