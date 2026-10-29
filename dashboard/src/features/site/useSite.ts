import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type SiteInfo } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Whether this host has a dashboard at all, so the website never offers a sign-in that would be refused. */
export function useSite(): UseQueryResult<SiteInfo> {
	return useQuery({ queryKey: keys.site(), queryFn: () => api.get<SiteInfo>("/site"), staleTime: Infinity });
}
