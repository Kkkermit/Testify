import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type OwnerGuildRow, type OwnerStats, type Paged } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export const PER_PAGE = 25;

export function useOwnerStats(): UseQueryResult<OwnerStats> {
	return useQuery({
		queryKey: keys.owner.stats(),
		queryFn: () => api.get<OwnerStats>("/owner/stats"),
		staleTime: 15_000,
	});
}

export function useOwnerGuilds(page: number): UseQueryResult<Paged<OwnerGuildRow>> {
	return useQuery({
		queryKey: keys.owner.guilds(page),
		queryFn: () => api.get<Paged<OwnerGuildRow>>(`/owner/guilds?page=${String(page)}&perPage=${String(PER_PAGE)}`),
	});
}
