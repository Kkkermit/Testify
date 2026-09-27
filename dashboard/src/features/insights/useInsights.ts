import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type InsightsReport, type InsightWindow } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useInsights(guildId: string, days: InsightWindow): UseQueryResult<InsightsReport> {
	return useQuery({
		queryKey: keys.guild(guildId).insights(days),
		queryFn: () => api.get<InsightsReport>(`/guilds/${guildId}/insights?days=${String(days)}`),
		placeholderData: keepPreviousData,
	});
}
