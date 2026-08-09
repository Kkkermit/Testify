import { Search, ServerOff } from "lucide-react";
import { useMemo, useState } from "react";
import { FIELD } from "@/components/form";
import { Reveal } from "@/components/motion";
import { EmptyState, PageHeader, Skeleton } from "@/components/primitives";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { GuildCard } from "@/features/guilds/GuildCard";
import { filterGuilds, groupGuilds } from "@/features/guilds/guilds.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function GuildPickerPage(): React.JSX.Element {
	usePageTitle("Servers");
	const me = useMe();
	const bot = useBot();
	const [search, setSearch] = useState("");

	const groups = useMemo(() => groupGuilds(filterGuilds(me.data?.guilds ?? [], search)), [me.data, search]);
	const found = groups.reduce((total, group) => total + group.guilds.length, 0);

	if (me.isPending) return <PickerSkeleton />;

	return (
		<>
			<PageHeader title="Servers" subtitle="Everywhere you can change Testify's settings, or add it." />

			<label className="motion-reveal relative block">
				<span className="sr-only">Search servers</span>
				<Search
					size={18}
					aria-hidden="true"
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
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
					className={cn(FIELD, "py-3 pr-4 pl-12 text-base")}
				/>
			</label>

			{found === 0 ? (
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
				groups.map((group) => (
					<section key={group.key} aria-labelledby={`guilds-${group.key}`} className="flex flex-col gap-3">
						<div className="flex flex-col gap-0.5">
							<h2
								id={`guilds-${group.key}`}
								className="text-muted-foreground flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.18em] uppercase before:bg-accent/70 before:h-px before:w-5 before:shrink-0 before:content-['']"
							>
								{group.title}
								<span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
									{group.guilds.length}
								</span>
							</h2>
							<p className="text-muted-foreground text-sm">{group.describes}</p>
						</div>

						<ul className="grid gap-4 sm:grid-cols-2">
							{group.guilds.map((guild, index) => (
								<Reveal as="li" key={guild.id} index={index}>
									<GuildCard guild={guild} group={group.key} clientId={bot.data?.id} />
								</Reveal>
							))}
						</ul>
					</section>
				))
			)}
		</>
	);
}

function PickerSkeleton(): React.JSX.Element {
	return (
		<>
			<Skeleton className="h-8 w-40" />
			<Skeleton className="h-12 w-full" />
			<div className="grid gap-4 sm:grid-cols-2">
				{[0, 1, 2, 3].map((index) => (
					<Skeleton key={index} className="h-[74px]" />
				))}
			</div>
		</>
	);
}
