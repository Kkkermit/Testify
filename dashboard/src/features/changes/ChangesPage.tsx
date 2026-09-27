import { CHANGE_LIMITS, CHANGE_SOURCES, CHANGE_WINDOWS, type ChangeSource, type ChangeWindow } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, Warning } from "@/components/form";
import { FIELD, SELECT } from "@/components/form/fieldStyles";
import { Card, DividedList, PageHeader, Pager, SegmentedControl, Skeleton } from "@/components/primitives";
import { SOURCE_LABELS, WINDOW_LABELS } from "@/features/changes/changes.utils";
import { ChangeRow } from "@/features/changes/components/ChangeRow";
import { useServerChanges } from "@/features/changes/useChanges";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { pageCountOf } from "@/features/warnings/warnings.utils";
import { useDebounced } from "@/hooks/useDebounced";
import { usePageTitle } from "@/hooks/usePageTitle";

export function ChangesPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const overview = useGuildOverview(guildId);
	const [days, setDays] = useState<ChangeWindow>(7);
	const [source, setSource] = useState<ChangeSource>("all");
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const searched = useDebounced(query).trim();
	const changes = useServerChanges(guildId, { days, source, query: searched, page });

	usePageTitle(t("changes.title"), overview.data?.name);

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("changes.title")} subtitle={t("changes.subtitle")} />

			<Card className="flex flex-col gap-4">
				<Field label={t("changes.searchLabel")} hint={t("changes.searchHint")} htmlFor="changes-search">
					<input
						id="changes-search"
						type="search"
						className={FIELD}
						value={query}
						maxLength={64}
						autoComplete="off"
						onChange={(event) => {
							setQuery(event.target.value);
							setPage(1);
						}}
					/>
				</Field>
				<div className="flex flex-wrap items-end gap-4">
					<SegmentedControl
						label={t("changes.sourceLabel")}
						segments={CHANGE_SOURCES.map((value) => ({ value, label: t(SOURCE_LABELS[value]) }))}
						value={source}
						onChange={(value) => {
							setSource(value);
							setPage(1);
						}}
					/>
					<Field label={t("changes.windowLabel")} htmlFor="changes-window">
						<select
							id="changes-window"
							className={SELECT}
							value={days}
							onChange={(event) => {
								setDays(Number(event.target.value) as ChangeWindow);
								setPage(1);
							}}
						>
							{CHANGE_WINDOWS.map((window) => (
								<option key={window} value={window}>
									{t(WINDOW_LABELS[window])}
								</option>
							))}
						</select>
					</Field>
				</div>
			</Card>

			{changes.isError ? (
				<ErrorState as="h2" error={changes.error} onRetry={() => void changes.refetch()} />
			) : changes.isPending ? (
				<Skeleton className="h-64 w-full" />
			) : (
				<>
					{!changes.data.discordReadable && <Warning>{t("changes.cannotReadDiscord")}</Warning>}
					<p className="text-muted-foreground text-sm" aria-live="polite">
						{t("changes.count", { count: changes.data.total })}
						{changes.data.truncated && ` ${t("changes.truncated", { max: CHANGE_LIMITS.maxDiscordEntries })}`}
					</p>
					{changes.data.items.length === 0 ? (
						<Card>
							<p className="text-sm">{searched === "" ? t("changes.none") : t("changes.noMatch")}</p>
						</Card>
					) : (
						<Card padding="none">
							<DividedList className="rounded-card border-0">
								{changes.data.items.map((change) => (
									<ChangeRow key={`${change.source}:${change.id}`} change={change} />
								))}
							</DividedList>
						</Card>
					)}
					<Pager
						page={changes.data.page}
						pages={pageCountOf(changes.data.total, changes.data.perPage)}
						onChange={setPage}
					/>
				</>
			)}
		</>
	);
}
