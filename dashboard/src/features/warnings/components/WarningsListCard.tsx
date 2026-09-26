import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Warning } from "@/components/form";
import { Card, CARD_HEADING, DividedList, EmptyState, Pager, Skeleton } from "@/components/primitives";
import { WarningRow } from "@/features/warnings/components/WarningRow";
import { useEditWarning, useGuildWarnings, useRemoveWarning } from "@/features/warnings/useWarnings";
import { pageCountOf } from "@/features/warnings/warnings.utils";
import { ApiError } from "@/lib/api";

/** Every warning in the server, newest first, each with its own Edit and Remove. */
export function WarningsListCard({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const list = useGuildWarnings(guildId, page);
	const edit = useEditWarning(guildId);
	const remove = useRemoveWarning(guildId);
	const busy = edit.isPending || remove.isPending;
	const failure = edit.error ?? remove.error;

	if (list.isError) return <ErrorState as="h2" error={list.error} onRetry={() => void list.refetch()} />;
	if (list.isPending) return <Skeleton className="h-64 w-full" />;

	const { items, total, perPage } = list.data;

	if (total === 0) {
		return (
			<EmptyState icon={<ShieldCheck size={28} />} title={t("warnings.emptyTitle")} body={t("warnings.emptyBody")} />
		);
	}

	return (
		<Card className="flex flex-col gap-4">
			<div>
				<h2 className={CARD_HEADING}>{t("warnings.listTitle")}</h2>
				<p className="text-muted-foreground text-sm" aria-live="polite">
					{t("warnings.listCount", { count: total })}
				</p>
			</div>

			{failure !== null && (
				<Warning>{failure instanceof ApiError ? failure.message : t("common.couldNotSave")}</Warning>
			)}

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

			<Pager page={list.data.page} pages={pageCountOf(total, perPage)} onChange={setPage} />
		</Card>
	);
}
