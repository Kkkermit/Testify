import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BoardPage, type BoardScope, type MemberBoard, type MoneySort } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBoard(
	guildId: string,
	board: MemberBoard,
	page: number,
	sort: MoneySort,
	scope: BoardScope,
): UseQueryResult<BoardPage> {
	const query = new URLSearchParams({ board, page: String(page), sort, scope });

	return useQuery({
		queryKey: keys.guild(guildId).board(board, page, sort, scope),
		queryFn: () => api.get<BoardPage>(`/guilds/${guildId}/members/leaderboard?${query.toString()}`),
		// A leaderboard read a moment ago is still the answer; refetching on every tab focus is noise.
		staleTime: 30_000,
	});
}
