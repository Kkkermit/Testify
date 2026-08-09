import { availabilityOf, countSubcommands, toggleName } from "@testify/shared";
import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { FIELD } from "@/components/form";
import { Reveal } from "@/components/motion";
import { Card, EmptyState, Eyebrow, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { configurableAt, coverage, filterCommands, groupByCategory } from "@/features/commands/commands.utils";
import { CommandCard } from "@/features/commands/components/CommandCard";
import { useCommands } from "@/features/commands/useCommands";
import { useCommandToggles, useSaveCommandToggles } from "@/features/commands/useCommandToggles";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/** `scope` decides which list is edited. Neither scope is a permission — the API answers 404 or 403 regardless. */
export function CommandsPage({ scope }: { scope?: "global" } = {}): React.JSX.Element {
	usePageTitle("Commands");
	// Present when the page is reached from inside a server, which is what makes a Configure link possible.
	const { guildId = null } = useParams();

	const global = scope === "global";
	const toggleScope = global ? null : guildId;
	const toggles = useCommandToggles(toggleScope, global || guildId !== null);
	const saveToggles = useSaveCommandToggles(toggleScope);

	const catalogue = useCommands();
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<string | null>(null);

	const commands = catalogue.data?.commands ?? [];
	const shown = useMemo(() => filterCommands(commands, { search, category }), [commands, search, category]);
	const groups = useMemo(() => groupByCategory(shown, catalogue.data?.categories ?? []), [shown, catalogue.data]);

	if (catalogue.isPending) return <Skeleton className="h-96 w-full" />;
	if (catalogue.isError) return <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />;

	const { covered, total } = coverage(commands);
	const state = toggles.data;

	function setDisabled(name: string): void {
		if (state === undefined) return;
		saveToggles.mutate({ disabled: toggleName(state.disabled, name) });
	}

	return (
		<>
			{global ? (
				<p className="text-muted-foreground text-sm">
					{subtitleFor(global, state !== undefined)} {switchedOff(state, global)}
				</p>
			) : (
				<PageHeader
					title="Commands"
					subtitle={`${subtitleFor(global, state !== undefined)} ${switchedOff(state, global)}`}
				/>
			)}

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

				<div className="flex flex-wrap gap-2 py-1" role="group" aria-label="Filter by category">
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
				// Sections are nested one level deep, so §18.6's between-sections gap-6 applies here rather than the shell's.
				<div className="flex flex-col gap-6">
					{groups.map(([name, group]) => (
						<section key={name} aria-labelledby={`category-${name}`} className="flex flex-col gap-3">
							<Eyebrow as="h2" id={`category-${name}`} count={group.length} className="capitalize">
								{name}
							</Eyebrow>
							<ul className="flex flex-col gap-3">
								{group.map((command, index) => (
									<Reveal as="li" key={command.name} index={index}>
										<CommandCard
											command={command}
											prefix={catalogue.data.prefix}
											place={configurableAt(command, guildId)}
											{...(state === undefined
												? {}
												: {
														availability: availabilityOf(command.name, state),
														onToggle: () => {
															setDisabled(command.name);
														},
													})}
										/>
									</Reveal>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</>
	);
}

/** Says what the switches do wherever there are any, because a row of them with no explanation is a guess. */
/** Folded into the subtitle rather than stacked under it as a second loose paragraph. */
function switchedOff(state: { disabled: string[] } | undefined, global: boolean): string {
	if (state === undefined) return "";
	if (state.disabled.length === 0)
		return global ? "Every one is available everywhere." : "Every one is available here.";

	return `${String(state.disabled.length)} switched off${global ? " everywhere" : " here"}.`;
}

function subtitleFor(global: boolean, switchable: boolean): string {
	if (global) return "Everything Testify can do. A command switched off here is off in every server, for everybody.";
	if (switchable) return "Everything Testify can do. Switch one off and nobody in this server can run it, either way.";

	return "Everything Testify can do, on both the slash and prefix surfaces.";
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
				"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
				active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
			)}
		>
			{label}
		</button>
	);
}
