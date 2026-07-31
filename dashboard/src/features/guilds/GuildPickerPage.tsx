import { type ManageableGuild } from "@testify/shared";
import { ServerOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge, Card, EmptyState, GuildIcon, PageHeader, Skeleton } from "@/components/common/primitives";
import { useMe } from "@/features/auth/useMe";
import { usePageTitle } from "@/lib/usePageTitle";

export function GuildPickerPage(): React.JSX.Element {
	usePageTitle("Servers");
	const me = useMe();
	const [search, setSearch] = useState("");

	const guilds = useMemo(() => filterGuilds(me.data?.guilds ?? [], search), [me.data, search]);

	if (me.isPending) return <PickerSkeleton />;

	return (
		<>
			<PageHeader title="Servers" subtitle="Servers where you can change Testify's settings." />

			<label className="mb-6 block">
				<span className="sr-only">Search servers</span>
				<input
					type="search"
					// Someone in 40 servers should type rather than scroll.
					autoFocus
					value={search}
					onChange={(event) => {
						setSearch(event.target.value);
					}}
					placeholder="Search servers"
					className="bg-card border-border focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none"
				/>
			</label>

			{guilds.length === 0 ? (
				<EmptyState
					icon={<ServerOff size={32} />}
					title={search === "" ? "Nothing to configure yet" : "No server matches that"}
					body={
						search === ""
							? "You need Manage Server in a server before it shows up here. Ask its owner, or invite Testify to one of your own."
							: "Try part of the name instead."
					}
				/>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2">
					{guilds.map((guild) => (
						<li key={guild.id}>
							<GuildCard guild={guild} />
						</li>
					))}
				</ul>
			)}
		</>
	);
}

export function filterGuilds(guilds: ManageableGuild[], search: string): ManageableGuild[] {
	const term = search.trim().toLowerCase();
	return term === "" ? guilds : guilds.filter((guild) => guild.name.toLowerCase().includes(term));
}

function GuildCard({ guild }: { guild: ManageableGuild }): React.JSX.Element {
	const body = (
		<>
			<GuildIcon name={guild.name} url={guild.iconUrl} />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{guild.name}</span>
				<span className="text-muted-foreground block text-xs tabular-nums">
					{guild.memberCount === null
						? "Testify is not in this server"
						: `${guild.memberCount.toLocaleString()} members`}
				</span>
			</span>
		</>
	);

	// A guild without the bot is shown rather than hidden — the invite is the point, and it costs nothing.
	if (!guild.botPresent) {
		return (
			<Card className="flex items-center gap-3 p-4 opacity-70">
				{body}
				<Badge>Not added</Badge>
			</Card>
		);
	}

	return (
		<Link
			to={`/guilds/${guild.id}`}
			className="bg-card border-border hover:border-ring flex items-center gap-3 rounded-[0.625rem] border p-4 transition-colors duration-150"
		>
			{body}
		</Link>
	);
}

function PickerSkeleton(): React.JSX.Element {
	return (
		<>
			<Skeleton className="h-8 w-40" />
			<Skeleton className="mt-6 h-10 w-full" />
			<div className="mt-6 grid gap-3 sm:grid-cols-2">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-[74px]" />
				))}
			</div>
		</>
	);
}
