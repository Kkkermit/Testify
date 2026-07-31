import { Search, ServerOff } from "lucide-react";
import { useMemo, useState } from "react";
import { FIELD } from "@/components/form";
import { Reveal } from "@/components/motion";
import { EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { GuildCard } from "@/features/guilds/GuildCard";
import { filterGuilds } from "@/features/guilds/guilds.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function GuildPickerPage(): React.JSX.Element {
	usePageTitle("Servers");
	const me = useMe();
	const [search, setSearch] = useState("");

	const guilds = useMemo(() => filterGuilds(me.data?.guilds ?? [], search), [me.data, search]);

	if (me.isPending) return <PickerSkeleton />;

	return (
		<>
			<PageHeader title="Servers" subtitle="Servers where you can change Testify's settings." />

			<label className="motion-reveal relative block">
				<span className="sr-only">Search servers</span>
				<Search
					size={16}
					aria-hidden="true"
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
				/>
				<input
					type="search"
					// Someone in 40 servers should type rather than scroll.
					autoFocus
					value={search}
					onChange={(event) => {
						setSearch(event.target.value);
					}}
					placeholder="Search servers"
					className={cn(FIELD, "pl-9")}
				/>
			</label>

			{guilds.length === 0 ? (
				<EmptyState
					icon={<ServerOff size={28} />}
					title={search === "" ? "Nothing to configure yet" : "No server matches that"}
					body={
						search === ""
							? "You need Manage Server in a server before it shows up here. Ask its owner, or invite Testify to one of your own."
							: "Try part of the name instead."
					}
				/>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2">
					{guilds.map((guild, index) => (
						<Reveal as="li" key={guild.id} index={index}>
							<GuildCard guild={guild} />
						</Reveal>
					))}
				</ul>
			)}
		</>
	);
}

function PickerSkeleton(): React.JSX.Element {
	return (
		<>
			<Skeleton className="h-8 w-40" />
			<Skeleton className="h-10 w-full" />
			<div className="grid gap-4 sm:grid-cols-2">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-[74px]" />
				))}
			</div>
		</>
	);
}
