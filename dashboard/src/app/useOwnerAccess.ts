import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useOwnerAccess(enabled: boolean): UseQueryResult<null> {
	return useQuery({
		queryKey: keys.owner.access(),
		queryFn: async () => {
			await api.get<undefined>("/owner/access");
			return null;
		},
		enabled,
	});
}
