import { countSubcommands } from "@testify/shared";
import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { FIELD } from "@/components/form";
import { Reveal } from "@/components/motion";
import { Card, EmptyState, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { configurableAt, coverage, filterCommands, groupByCategory } from "@/features/commands/commands.utils";
import { CommandCard } from "@/features/commands/components/CommandCard";
import { useCommands } from "@/features/commands/useCommands";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

export function CommandsPage(): React.JSX.Element {
	usePageTitle("Commands");
	// Present when the page is reached from inside a server, which is what makes a Configure link possible.
	const { guildId = null } = useParams();

	const catalogue = useCommands();
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<string | null>(null);

	const commands = catalogue.data?.commands ?? [];
	const shown = useMemo(() => filterCommands(commands, { search, category }), [commands, search, category]);
	const groups = useMemo(() => groupByCategory(shown, catalogue.data?.categories ?? []), [shown, catalogue.data]);

	if (catalogue.isPending) return <Skeleton className="h-96 w-full" />;
	if (catalogue.isError) return <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />;

	const { covered, total } = coverage(commands);

	return (
		<>
			<PageHeader title="Commands" subtitle="Everything Testify can do, on both the slash and prefix surfaces." />

			<section aria-label="Command surface" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label="Commands" value={total} />
				<StatTile label="Subcommands" value={countSubcommands(commands)} />
				<StatTile label="Categories" value={catalogue.data.categories.length} />
				<StatTile
					label="On the dashboard"
					value={`${String(covered)} of ${String(total)}`}
					hint="Commands with a settings screen here. The rest are still Discord-only."
				/>
			</section>

			<div className="flex flex-col gap-3">
				<label className="relative block">
					<span className="sr-only">Search commands</span>
					<Search
						size={16}
						aria-hidden="true"
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
					/>
					<input
						type="search"
						autoFocus
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
						}}
						placeholder="Search by name, alias or description"
						className={cn(FIELD, "pl-9")}
					/>
				</label>

				<div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
					<CategoryChip label="All" active={category === null} onSelect={() => setCategory(null)} />
					{catalogue.data.categories.map((name) => (
						<CategoryChip
							key={name}
							label={name}
							active={category === name}
							onSelect={() => setCategory(category === name ? null : name)}
						/>
					))}
				</div>
			</div>

			{shown.length === 0 ? (
				<Card>
					<EmptyState
						icon={<SearchX size={28} />}
						title="No command matches that"
						body="Try part of a name, an alias like ban, or clear the category filter."
					/>
				</Card>
			) : (
				groups.map(([name, group]) => (
					<section key={name} aria-labelledby={`category-${name}`} className="flex flex-col gap-3">
						<h2 id={`category-${name}`} className="text-lg font-semibold capitalize">
							{name}
							<span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">{group.length}</span>
						</h2>
						<ul className="flex flex-col gap-3">
							{group.map((command, index) => (
								<Reveal as="li" key={command.name} index={index}>
									<CommandCard
										command={command}
										prefix={catalogue.data.prefix}
										place={configurableAt(command, guildId)}
									/>
								</Reveal>
							))}
						</ul>
					</section>
				))
			)}
		</>
	);
}

function CategoryChip({
	label,
	active,
	onSelect,
}: {
	label: string;
	active: boolean;
	onSelect: () => void;
}): React.JSX.Element {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onSelect}
			className={cn(
				"rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors duration-150",
				active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
			)}
		>
			{label}
		</button>
	);
}
