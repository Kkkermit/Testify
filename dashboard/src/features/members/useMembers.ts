import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type BoardPage, type MemberBoard } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useBoard(guildId: string, board: MemberBoard, page: number): UseQueryResult<BoardPage> {
	return useQuery({
		queryKey: keys.guild(guildId).board(board, page),
		queryFn: () => api.get<BoardPage>(`/guilds/${guildId}/members/leaderboard?board=${board}&page=${String(page)}`),
		// A leaderboard read a moment ago is still the answer; refetching on every tab focus is noise.
		staleTime: 30_000,
	});
}
