import { WARN_LIMITS } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Card, CARD_HEADING, DividedList, Pager, Skeleton } from "@/components/primitives";
import { WarningRow } from "@/features/warnings/components/WarningRow";
import { useEditWarning, useGuildWarnings, useRemoveWarning } from "@/features/warnings/useWarnings";
import { pageCountOf } from "@/features/warnings/warnings.utils";
import { useDebounced } from "@/hooks/useDebounced";
import { ApiError } from "@/lib/api";

/** The most recent warnings, or every warning for whoever is searched for; absent while the server has none. */
export function WarningsListCard({ guildId }: { guildId: string }): React.JSX.Element | null {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const searched = useDebounced(query).trim();
	const searching = searched !== "";

	const list = useGuildWarnings(guildId, {
		page: searching ? page : 1,
		perPage: searching ? WARN_LIMITS.perPage : WARN_LIMITS.recent,
		query: searched,
	});
	const edit = useEditWarning(guildId);
	const remove = useRemoveWarning(guildId);
	const busy = edit.isPending || remove.isPending;
	const failure = edit.error ?? remove.error;

	if (list.isError) return <ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />;
	if (list.isPending) return <Skeleton className="h-64 w-full" />;

	const { items, total, perPage } = list.data;
	// Nothing to list and nothing being looked for: the card would only say so, which the page does not need.
	if (total === 0 && !searching && query.trim() === "") return null;

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{searching ? t("warnings.searchTitle") : t("warnings.recentTitle")}</h2>
				<p className="text-muted-foreground text-sm" aria-live="polite">
					{searching
						? t("warnings.searchCount", { count: total })
						: t("warnings.recentCount", { shown: items.length, count: total })}
				</p>
			</div>

			<Field label={t("warnings.searchLabel")} hint={t("warnings.searchHint")} htmlFor="warnings-search">
				<input
					id="warnings-search"
					type="search"
					className={FIELD}
					value={query}
					maxLength={32}
					autoComplete="off"
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
			</Field>

			{failure !== null && (
				<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
			)}

			{items.length === 0 ? (
				<p className="text-sm">{t("warnings.searchNone")}</p>
			) : (
				<DividedList>
					{items.map((warning) => (
						<WarningRow
							key={`${warning.userId}:${warning.id}`}
							warning={warning}
							member={{ name: warning.username, href: `/guilds/${guildId}/members/${warning.userId}` }}
							canChange
							busy={busy}
							onEdit={(reason, done) => {
								edit.mutate({ userId: warning.userId, warnId: warning.id, reason }, { onSuccess: done });
							}}
							onRemove={() => {
								remove.mutate({ userId: warning.userId, warnId: warning.id });
							}}
						/>
					))}
				</DividedList>
			)}

			{searching && <Pager page={list.data.page} pages={pageCountOf(total, perPage)} onChange={setPage} />}
		</Card>
	);
}
