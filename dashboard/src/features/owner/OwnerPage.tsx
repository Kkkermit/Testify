import { useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { OwnerGuildTable } from "@/features/owner/components/OwnerGuildTable";
import { Pager } from "@/features/owner/components/Pager";
import { formatUptime, pageCount, pageFrom } from "@/features/owner/owner.utils";
import { PER_PAGE, useOwnerGuilds, useOwnerStats } from "@/features/owner/useOwner";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Answers "which of my servers is misconfigured" in one screen, which is the whole reason it exists. */
export function OwnerPage(): React.JSX.Element {
	usePageTitle("Owner console");
	// In the URL rather than in state, so a link to page 3 is a link to page 3.
	const [params, setParams] = useSearchParams();
	const page = pageFrom(params.get("page"));

	const stats = useOwnerStats();
	const guilds = useOwnerGuilds(page);

	if (stats.isError) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;

	return (
		<>
			<PageHeader title="Owner console" subtitle="Every server Testify is in." />

			<section aria-label="Bot health" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
				{stats.isPending ? (
					[0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-[86px]" />)
				) : (
					<>
						<StatTile label="Servers" value={stats.data.guilds} />
						<StatTile label="Members" value={stats.data.users} />
						<StatTile label="Commands" value={stats.data.commands} />
						<StatTile label="Uptime" value={formatUptime(stats.data.uptimeMs)} />
						<StatTile label="Memory" value={`${String(stats.data.memoryMb)} MB`} />
						<StatTile label="Database" value={stats.data.database} />
					</>
				)}
			</section>

			<h2 className="mb-3 text-lg font-semibold">Servers</h2>

			{guilds.data === undefined ? (
				<Skeleton className="h-64 w-full" />
			) : (
				<OwnerGuildTable guilds={guilds.data.items} />
			)}

			<Pager
				page={page}
				pages={pageCount(guilds.data?.total ?? 0, PER_PAGE)}
				onChange={(next) => {
					setParams({ page: String(next) });
				}}
			/>
		</>
	);
}
