import { availabilityOf, countSubcommands, toggleName } from "@testify/shared";
import { type TFunction } from "i18next";
import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { FIELD, Warning } from "@/components/form";
import { Reveal } from "@/components/motion";
import { Card, EmptyState, Eyebrow, PageHeader, Skeleton, StatTile } from "@/components/primitives";
import { configurableAt, coverage, filterCommands, groupByCategory } from "@/features/commands/commands.utils";
import { CommandCard } from "@/features/commands/components/CommandCard";
import { useCommands } from "@/features/commands/useCommands";
import { useCommandToggles, useSaveCommandToggles } from "@/features/commands/useCommandToggles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/** `scope` decides which list is edited. Neither scope is a permission — the API answers 404 or 403 regardless. */
export function CommandsPage({ scope }: { scope?: "global" } = {}): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("commands.title"));
	// Present when the page is reached from inside a server, which is what makes a Configure link possible.
	const { guildId = null } = useParams();

	const global = scope === "global";
	const toggleScope = global ? null : guildId;
	const toggles = useCommandToggles(toggleScope, global || guildId !== null);
	const saveToggles = useSaveCommandToggles(toggleScope);

	const catalogue = useCommands();
	const overview = useGuildOverview(guildId);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<string | null>(null);

	const commands = catalogue.data?.commands ?? [];
	const shown = useMemo(() => filterCommands(commands, { search, category }), [commands, search, category]);
	const groups = useMemo(() => groupByCategory(shown, catalogue.data?.categories ?? []), [shown, catalogue.data]);

	if (catalogue.isPending) return <Skeleton className="h-96 w-full" />;
	// Mounted inside an owner console tab, this page has no header of its own — the console owns the `<h1>`.
	if (catalogue.isError)
		return <ErrorState as={global ? "h2" : "h1"} error={catalogue.error} onRetry={() => void catalogue.refetch()} />;

	const { covered, total } = coverage(commands);
	const state = toggles.data;

	function setDisabled(name: string): void {
		if (state === undefined) return;
		saveToggles.mutate({ disabled: toggleName(state.disabled, name) });
	}

	return (
		// Its own rhythm rather than the shell's: mounted in an owner console tab there is no gap-6 column above it.
		<div className="flex flex-col gap-6">
			{global ? (
				<p className="text-muted-foreground text-sm">
					{subtitleFor(global, state !== undefined, t)} {switchedOff(state, global, t)}
				</p>
			) : (
				<PageHeader
					eyebrow={overview.data?.name}
					title={t("commands.title")}
					subtitle={`${subtitleFor(global, state !== undefined, t)} ${switchedOff(state, global, t)}`}
				/>
			)}

			<section aria-label={t("commands.surface")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label={t("commands.commands")} value={total} />
				<StatTile label={t("commands.subcommands")} value={countSubcommands(commands)} />
				<StatTile label={t("commands.categories")} value={catalogue.data.categories.length} />
				<StatTile
					label={t("commands.onDashboard")}
					value={`${String(covered)} of ${String(total)}`}
					hint={t("commands.onDashboardHint")}
				/>
			</section>

			<div className="flex flex-col gap-3">
				<label className="relative block">
					<span className="sr-only">{t("commands.search")}</span>
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
						placeholder={t("commands.searchPlaceholder")}
						className={cn(FIELD, "pl-9")}
					/>
				</label>

				<div className="flex flex-wrap gap-2 py-1" role="group" aria-label={t("commands.filterByCategory")}>
					<CategoryChip label={t("commands.all")} active={category === null} onSelect={() => setCategory(null)} />
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

			{/* The API refuses a command `ALWAYS_ENABLED` covers, so a switch can bounce back with a reason. */}
			{saveToggles.error !== null && (
				<Warning>
					{saveToggles.error instanceof ApiError ? saveToggles.error.message : t("commands.switchRefused")}
				</Warning>
			)}

			{shown.length === 0 ? (
				<Card>
					<EmptyState
						icon={<SearchX size={28} />}
						title={t("commands.noMatchTitle")}
						body={t("commands.noMatchBody")}
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
		</div>
	);
}

/** Says what the switches do wherever there are any, because a row of them with no explanation is a guess. */
function switchedOff(state: { disabled: string[] } | undefined, global: boolean, t: TFunction): string {
	if (state === undefined) return "";
	if (state.disabled.length === 0) return t(global ? "commands.availableEverywhere" : "commands.availableHere");

	return t(global ? "commands.switchedOffEverywhere" : "commands.switchedOffHere", {
		count: state.disabled.length,
	});
}

function subtitleFor(global: boolean, switchable: boolean, t: TFunction): string {
	if (global) return t("commands.subtitleGlobal");
	if (switchable) return t("commands.subtitleGuild");

	return t("commands.subtitlePlain");
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
