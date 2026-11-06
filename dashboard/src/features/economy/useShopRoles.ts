import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type ShopRoleList } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useShopRoles(guildId: string): UseQueryResult<ShopRoleList> {
	return useQuery({
		queryKey: keys.guild(guildId).shopRoles(),
		queryFn: () => api.get<ShopRoleList>(`/guilds/${guildId}/shop-roles`),
	});
}

/** Both answer with the whole list, so they share one key and only the last answer in flight is trusted. */
export function useSellShopRole(
	guildId: string,
): UseMutationResult<ShopRoleList, Error, { roleId: string; price: number }> {
	return useDocumentMutation(keys.guild(guildId).shopRoles(), ({ roleId, price }) =>
		api.put<ShopRoleList>(`/guilds/${guildId}/shop-roles/${roleId}`, { price }),
	);
}

export function useRemoveShopRole(guildId: string): UseMutationResult<ShopRoleList, Error, string> {
	return useDocumentMutation(keys.guild(guildId).shopRoles(), (roleId) =>
		api.delete<ShopRoleList>(`/guilds/${guildId}/shop-roles/${roleId}`),
	);
}
