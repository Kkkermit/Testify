import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

/** Only the server can say who owns the bot; `enabled` spares everybody else the request. */
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
