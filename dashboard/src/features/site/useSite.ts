import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type SiteInfo } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useSite(): UseQueryResult<SiteInfo> {
	return useQuery({ queryKey: keys.site(), queryFn: () => api.get<SiteInfo>("/site"), staleTime: Infinity });
}
