import { availabilityOf, countSubcommands, toggleName } from "@testify/shared";
import { type TFunction } from "i18next";
import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { SearchField, Warning } from "@/components/form";
import {
	Card,
	EmptyState,
	SectionHeading,
	PageHeader,
	SELECTED,
	Skeleton,
	StatTile,
	Summary,
	UNSELECTED,
} from "@/components/primitives";
import { categoryLabel } from "@/features/commands/categories.labels";
import { configurableAt, coverage, filterCommands, groupByCategory } from "@/features/commands/commands.utils";
import { CommandCard } from "@/features/commands/components/CommandCard";
import { useCommands } from "@/features/commands/useCommands";
import { useCommandToggles, useSaveCommandToggles } from "@/features/commands/useCommandToggles";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Not a permission: the API answers 404 or 403 regardless. */
export function CommandsPage({ scope }: { scope?: "global" } = {}): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("commands.title"));
	const { guildId = null } = useParams();

	const global = scope === "global";
	const toggleScope = global ? null : guildId;
	const toggles = useCommandToggles(toggleScope, global || guildId !== null);
	const saveToggles = useSaveCommandToggles(toggleScope);

	const catalogue = useCommands();
	const overview = useGuildOverview(guildId);
	const [params, setParams] = useSearchParams();
	const search = params.get("q") ?? "";
	const setSearch = (value: string): void => {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				if (value === "") next.delete("q");
				else next.set("q", value);
				return next;
			},
			{ replace: true },
		);
	};
	const [category, setCategory] = useState<string | null>(null);

	const commands = catalogue.data?.commands ?? [];
	const shown = useMemo(() => filterCommands(commands, { search, category }), [commands, search, category]);
	const groups = useMemo(() => groupByCategory(shown, catalogue.data?.categories ?? []), [shown, catalogue.data]);

	if (catalogue.isPending) return <Skeleton className="h-96 w-full" />;
	if (catalogue.isError)
		return <ErrorState as={global ? "h2" : "h1"} error={catalogue.error} onRetry={() => void catalogue.refetch()} />;

	const { covered, total } = coverage(commands);
	const state = toggles.data;

	function setDisabled(name: string): void {
		if (state === undefined) return;
		saveToggles.mutate({ disabled: toggleName(state.disabled, name) });
	}

	return (
		<div className="flex flex-col gap-6">
			{global ? (
				<p className="text-muted-foreground text-sm">{subtitleFor(global, state !== undefined, t)}</p>
			) : (
				<PageHeader
					server={overview.data}
					title={t("commands.title")}
					subtitle={subtitleFor(global, state !== undefined, t)}
				/>
			)}

			{state !== undefined && <Summary>{switchedOff(state, global, t)}</Summary>}

			<section aria-label={t("commands.surface")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatTile label={t("commands.commands")} value={total} />
				<StatTile label={t("commands.subcommands")} value={countSubcommands(commands)} />
				<StatTile label={t("commands.categories")} value={catalogue.data.categories.length} />
				<StatTile
					label={t("commands.onDashboard")}
					value={t("common.partOf", { part: covered, whole: total })}
					hint={t("commands.onDashboardHint")}
				/>
			</section>

			<div className="flex flex-col gap-3">
				<SearchField
					autoFocus
					label={t("commands.search")}
					placeholder={t("commands.searchPlaceholder")}
					value={search}
					onChange={setSearch}
				/>

				<div className="flex flex-wrap gap-2 py-1" role="group" aria-label={t("commands.filterByCategory")}>
					<CategoryChip label={t("commands.all")} active={category === null} onSelect={() => setCategory(null)} />
					{catalogue.data.categories.map((name) => (
						<CategoryChip
							key={name}
							label={categoryLabel(name, t)}
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
				<div className="flex flex-col gap-6">
					{groups.map(([name, group]) => (
						<section key={name} aria-labelledby={`category-${name}`} className="flex flex-col gap-3">
							<SectionHeading as="h2" id={`category-${name}`} count={group.length} className="capitalize">
								{categoryLabel(name, t)}
							</SectionHeading>
							<ul className="flex flex-col gap-3">
								{group.map((command) => (
									<li key={command.name}>
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
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</div>
	);
}

function switchedOff(state: { disabled: string[] }, global: boolean, t: TFunction): string {
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
				active ? SELECTED : cn(UNSELECTED, "hover:text-foreground"),
			)}
		>
			{label}
		</button>
	);
}
