import { OWNER_GUILD_SORTS } from "@testify/shared";
import { Clock, Cpu, Database, Server, Terminal, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { LABEL, SearchField, SELECT } from "@/components/form";
import { Card, Eyebrow, Pager, Skeleton, StatTile } from "@/components/primitives";
import { GuildDetail } from "@/features/owner/components/GuildDetail";
import { OwnerGuildTable } from "@/features/owner/components/OwnerGuildTable";
import { guildFilterFrom, GUILD_SORT_LABELS, guildSortFrom } from "@/features/owner/owner.utils";
import { PER_PAGE, useOwnerGuilds, useOwnerStats } from "@/features/owner/useOwner";
import { useDebounced } from "@/hooks/useDebounced";
import { formatUptime } from "@/lib/datetime";
import { pageCount, pageFrom } from "@/lib/paging";

/** Answers "which of my servers is misconfigured", which is the reason the console exists at all. */
export function OverviewTab(): React.JSX.Element {
	const { t } = useTranslation();
	// In the URL rather than in state, so a link to page 3 is a link to page 3.
	const [params, setParams] = useSearchParams();
	const page = pageFrom(params.get("page"));
	const sort = guildSortFrom(params.get("sort"));
	const filter = guildFilterFrom(params.get("filter"));
	const search = params.get("search") ?? "";
	const health = useOwnerStats();
	// The field stays live while the request trails it, so a search is one query rather than one per keystroke.
	const guilds = useOwnerGuilds(page, sort, filter, useDebounced(search));

	if (health.isError) return <ErrorState as="h2" error={health.error} onRetry={() => void health.refetch()} />;

	const selected = params.get("server");
	const stats = health.data;

	// Merged rather than replaced, or paging would drop the `?tab=` that got you here.
	function put(changes: Record<string, string | null>, replace = false): void {
		setParams(
			(current) => {
				const merged = new URLSearchParams(current);
				for (const [key, value] of Object.entries(changes)) {
					if (value === null) merged.delete(key);
					else merged.set(key, value);
				}
				return merged;
			},
			{ replace },
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<section aria-label={t("owner.health")} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
				{stats === undefined ? (
					[0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-[86px]" />)
				) : (
					<>
						<StatTile label={t("owner.servers")} value={stats.guilds} icon={Server} tint="text-feature-tickets" />
						<StatTile
							label={t("owner.members")}
							value={stats.users}
							icon={Users}
							tint="text-feature-welcome"
							hint={t("owner.membersHint")}
						/>
						<StatTile
							label={t("owner.commands")}
							value={stats.commands}
							icon={Terminal}
							tint="text-feature-levelling"
						/>
						<StatTile
							label={t("owner.uptime")}
							value={formatUptime(stats.uptimeMs)}
							icon={Clock}
							tint="text-feature-economy"
							hint={t("owner.uptimeHint")}
						/>
						<StatTile
							label={t("owner.memory")}
							value={`${String(stats.memoryMb)} MB`}
							icon={Cpu}
							tint="text-feature-economy"
						/>
						<StatTile
							label={t("owner.database")}
							value={stats.database}
							icon={Database}
							tint={stats.database === "connected" ? "text-success" : "text-destructive-text"}
						/>
					</>
				)}
			</section>

			<section aria-labelledby="servers-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="servers-heading">
					{t("owner.servers")}
				</Eyebrow>

				{/* A new order or a new search starts again from the first page, which is where its answer is. */}
				<Card padding="compact" className="flex flex-wrap items-end gap-3">
					<SearchField
						className="min-w-52 flex-1"
						label={t("owner.searchServers")}
						placeholder={t("owner.searchServersPlaceholder")}
						value={search}
						onChange={(next) => {
							put({ search: next === "" ? null : next, page: null }, true);
						}}
					/>
					<label className="flex w-full flex-col gap-1 sm:w-64">
						<span className={LABEL}>{t("owner.sortBy")}</span>
						<select
							className={SELECT}
							value={sort}
							onChange={(event) => {
								put({ sort: event.target.value, page: null });
							}}
						>
							{OWNER_GUILD_SORTS.map((option) => (
								<option key={option} value={option}>
									{t(GUILD_SORT_LABELS[option])}
								</option>
							))}
						</select>
					</label>
					<label className="flex w-full items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={filter === "inactive"}
							onChange={(event) => {
								put({ filter: event.target.checked ? "inactive" : null, page: null });
							}}
						/>
						{t("owner.onlyInactive")}
					</label>
				</Card>

				{selected !== null && (
					<GuildDetail
						guildId={selected}
						onClose={() => {
							put({ server: null });
						}}
					/>
				)}

				{guilds.isError ? (
					<ErrorState as="h2" error={guilds.error} onRetry={() => void guilds.refetch()} />
				) : guilds.data === undefined ? (
					<Skeleton className="h-64 w-full" />
				) : (
					<OwnerGuildTable
						guilds={guilds.data.items}
						sort={sort}
						filter={filter}
						empty={
							search.trim() !== "" ? t("owner.noServersMatch") : filter === "inactive" ? t("owner.noInactive") : null
						}
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
