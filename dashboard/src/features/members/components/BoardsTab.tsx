import { BOARD_SCOPES, MEMBER_BOARDS, MONEY_SORTS } from "@testify/shared";
import { Crosshair } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Button, EmptyState, Pager, SegmentedControl, Skeleton, Summary } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { BoardTable } from "@/features/members/components/BoardTable";
import {
	BOARD_NAMES,
	boardFrom,
	emptyMessage,
	jumpTarget,
	SCOPE_NAMES,
	scopeFrom,
	SORT_NAMES,
	sortFrom,
	summarise,
} from "@/features/members/members.utils";
import { useBoard } from "@/features/members/useMembers";
import { pageFrom } from "@/lib/paging";

export function BoardsTab({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();

	const board = boardFrom(params.get("board"));
	const page = pageFrom(params.get("page"));
	const sort = board === "economy" ? sortFrom(params.get("sort")) : "total";
	const scope = board === "economy" ? scopeFrom(params.get("scope")) : "server";

	const me = useMe();
	const data = useBoard(guildId, board, page, sort, scope);

	// Merged rather than replaced, or switching board drops the rest of the address.
	function put(changes: Record<string, string>): void {
		setParams((current) => {
			const merged = new URLSearchParams(current);
			for (const [key, value] of Object.entries(changes)) merged.set(key, value);
			return merged;
		});
	}

	const jump = data.data === undefined ? null : jumpTarget(data.data);

	return (
		<div className="flex flex-col gap-4">
			{data.data !== undefined && data.data.total > 0 && (
				<div aria-live="polite">
					<Summary>{summarise(data.data, t)}</Summary>
				</div>
			)}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<SegmentedControl
						label={t("members.leaderboard")}
						value={board}
						segments={MEMBER_BOARDS.map((kind) => ({ value: kind, label: t(BOARD_NAMES[kind]) }))}
						onChange={(next) => {
							put({ board: next, page: "1" });
						}}
					/>

					{board === "economy" && (
						<>
							<SegmentedControl
								label={t("members.sortBy")}
								value={sort}
								segments={MONEY_SORTS.map((kind) => ({ value: kind, label: t(SORT_NAMES[kind]) }))}
								onChange={(next) => {
									put({ sort: next, page: "1" });
								}}
							/>
							<SegmentedControl
								label={t("members.scope")}
								value={scope}
								segments={BOARD_SCOPES.map((kind) => ({ value: kind, label: t(SCOPE_NAMES[kind]) }))}
								onChange={(next) => {
									put({ scope: next, page: "1" });
								}}
							/>
						</>
					)}
				</div>

				{jump !== null && (
					<Button
						variant="secondary"
						onClick={() => {
							put({ page: String(jump) });
						}}
					>
						<Crosshair size={16} aria-hidden="true" /> {t("members.findMe")}
					</Button>
				)}
			</div>

			{data.isError ? (
				<ErrorState as="h2" error={data.error} onRetry={() => void data.refetch()} />
			) : data.data === undefined ? (
				<Skeleton className="h-96 w-full" />
			) : data.data.total === 0 ? (
				<EmptyState
					icon={<Crosshair size={28} />}
					title={t("members.noRankings")}
					body={emptyMessage(board, t, scope)}
				/>
			) : (
				<>
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
		</div>
	);
}
