import { BOARD_LABELS, MEMBER_BOARDS } from "@testify/shared";
import { Crosshair } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Button, EmptyState, PageHeader, Pager, SegmentedControl, Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { BoardTable } from "@/features/members/components/BoardTable";
import { boardFrom, emptyMessage, jumpTarget, pageFrom, summarise } from "@/features/members/members.utils";
import { useBoard } from "@/features/members/useMembers";
import { usePageTitle } from "@/hooks/usePageTitle";

export function MembersPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();
	const [params, setParams] = useSearchParams();

	const board = boardFrom(params.get("board"));
	const page = pageFrom(params.get("page"));

	const overview = useGuildOverview(guildId);
	const me = useMe();
	const data = useBoard(guildId, board, page);

	usePageTitle("Members", overview.data?.name);

	// Merged rather than replaced, so switching board does not strip the page you came from.
	function put(changes: Record<string, string>): void {
		setParams((current) => {
			const merged = new URLSearchParams(current);
			for (const [key, value] of Object.entries(changes)) merged.set(key, value);
			return merged;
		});
	}

	const jump = data.data === undefined ? null : jumpTarget(data.data);

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("members.title")} subtitle={t("members.subtitle")} />

			<div className="flex flex-wrap items-center justify-between gap-3">
				<SegmentedControl
					label={t("members.leaderboard")}
					value={board}
					segments={MEMBER_BOARDS.map((kind) => ({ value: kind, label: BOARD_LABELS[kind].heading }))}
					onChange={(next) => {
						put({ board: next, page: "1" });
					}}
				/>

				{jump !== null && (
					<Button
						variant="secondary"
						onClick={() => {
							put({ page: String(jump) });
						}}
					>
						<Crosshair size={16} aria-hidden="true" /> Find me
					</Button>
				)}
			</div>

			{data.isError ? (
				<ErrorState as="h2" error={data.error} onRetry={() => void data.refetch()} />
			) : data.data === undefined ? (
				<Skeleton className="h-96 w-full" />
			) : data.data.total === 0 ? (
				<EmptyState icon={<Crosshair size={28} />} title={t("members.noRankings")} body={emptyMessage(board)} />
			) : (
				<>
					<p className="text-muted-foreground text-sm" aria-live="polite">
						{summarise(data.data)}
					</p>

					<BoardTable data={data.data} youId={me.data?.user.id ?? null} guildId={guildId} />

					<Pager
						page={data.data.page}
						pages={data.data.pages}
						onChange={(next) => {
							put({ page: String(next) });
						}}
					/>
				</>
			)}
		</>
	);
}
