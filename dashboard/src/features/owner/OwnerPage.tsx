import { useQuery } from "@tanstack/react-query";
import { type OwnerGuildRow, type OwnerStats, type Paged } from "@testify/shared";
import { useSearchParams } from "react-router-dom";
import { ErrorState } from "@/app/ErrorState";
import { Badge, Button, Card, GuildIcon, PageHeader, Skeleton, StatTile } from "@/components/common/primitives";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { usePageTitle } from "@/lib/usePageTitle";

const PER_PAGE = 25;

/** Answers "which of my servers is misconfigured" in one screen, which is the whole reason it exists. */
export function OwnerPage(): React.JSX.Element {
	usePageTitle("Owner console");
	// In the URL rather than in state, so a link to page 3 is a link to page 3.
	const [params, setParams] = useSearchParams();
	const page = pageFrom(params.get("page"));

	const stats = useQuery({
		queryKey: keys.owner.stats(),
		queryFn: () => api.get<OwnerStats>("/owner/stats"),
		staleTime: 15_000,
	});

	const guilds = useQuery({
		queryKey: keys.owner.guilds(page),
		queryFn: () => api.get<Paged<OwnerGuildRow>>(`/owner/guilds?page=${String(page)}&perPage=${String(PER_PAGE)}`),
	});

	if (stats.isError) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;

	const pages = Math.max(1, Math.ceil((guilds.data?.total ?? 0) / PER_PAGE));

	return (
		<>
			<PageHeader title="Owner console" subtitle="Every server Testify is in." />

			<section aria-label="Bot health" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
				{stats.isPending
					? [0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-[86px]" />)
					: [
							["Servers", stats.data.guilds.toLocaleString()],
							["Members", stats.data.users.toLocaleString()],
							["Commands", stats.data.commands.toLocaleString()],
							["Uptime", formatUptime(stats.data.uptimeMs)],
							["Memory", `${String(stats.data.memoryMb)} MB`],
							["Database", stats.data.database],
						].map(([label, value]) => <StatTile key={label} label={label!} value={value!} />)}
			</section>

			<h2 className="mb-3 text-lg font-semibold">Servers</h2>

			{guilds.data === undefined ? (
				<Skeleton className="h-64 w-full" />
			) : (
				<Card className="overflow-x-auto p-0">
					<table className="w-full text-sm">
						<caption className="sr-only">Servers Testify is in, largest first</caption>
						<thead className="text-muted-foreground border-border border-b">
							<tr>
								<th scope="col" className="px-6 py-3 text-left font-medium">
									Server
								</th>
								<th scope="col" className="px-6 py-3 text-right font-medium">
									Members
								</th>
								<th scope="col" className="px-6 py-3 text-left font-medium">
									Configured
								</th>
							</tr>
						</thead>
						<tbody className="divide-border divide-y">
							{guilds.data.items.map((guild) => (
								<tr key={guild.id}>
									<td className="px-6 py-3">
										<span className="flex items-center gap-2">
											<GuildIcon name={guild.name} url={guild.iconUrl} size={24} />
											<span className="truncate">{guild.name}</span>
										</span>
									</td>
									<td className="px-6 py-3 text-right font-mono tabular-nums">{guild.memberCount.toLocaleString()}</td>
									<td className="px-6 py-3">
										{guild.configured.length === 0 ? (
											<Badge tone="warning">Nothing set up</Badge>
										) : (
											<span className="flex flex-wrap gap-1">
												{guild.configured.map((feature) => (
													<Badge key={feature}>{feature}</Badge>
												))}
											</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Card>
			)}

			{pages > 1 && (
				<nav aria-label="Pages" className="mt-4 flex items-center justify-between">
					<Button
						variant="secondary"
						disabled={page <= 1}
						onClick={() => {
							setParams({ page: String(page - 1) });
						}}
					>
						Previous
					</Button>
					<span className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
						Page {page} of {pages}
					</span>
					<Button
						variant="secondary"
						disabled={page >= pages}
						onClick={() => {
							setParams({ page: String(page + 1) });
						}}
					>
						Next
					</Button>
				</nav>
			)}
		</>
	);
}

/** A page number out of a URL can be anything at all. */
export function pageFrom(raw: string | null): number {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function formatUptime(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${String(days)}d ${String(hours % 24)}h`;
	if (hours > 0) return `${String(hours)}h ${String(minutes % 60)}m`;

	return `${String(minutes)}m`;
}
