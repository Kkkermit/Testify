import { useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { type RoleMenuBody, type RoleMenuList } from "@testify/shared";
import { useDocumentMutation } from "@/hooks/useDocumentMutation";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useRoleMenus(guildId: string): UseQueryResult<RoleMenuList> {
	return useQuery({
		queryKey: keys.guild(guildId).roleMenus(),
		queryFn: () => api.get<RoleMenuList>(`/guilds/${guildId}/role-menus`),
	});
}

export function useCreateRoleMenu(guildId: string): UseMutationResult<RoleMenuList, Error, RoleMenuBody> {
	return useListMutation(guildId, (body) => api.post<RoleMenuList>(`/guilds/${guildId}/role-menus`, body));
}

export function useUpdateRoleMenu(
	guildId: string,
): UseMutationResult<RoleMenuList, Error, { menuId: string; body: RoleMenuBody }> {
	return useListMutation(guildId, ({ menuId, body }) =>
		api.put<RoleMenuList>(`/guilds/${guildId}/role-menus/${menuId}`, body),
	);
}

export function usePublishRoleMenu(guildId: string): UseMutationResult<RoleMenuList, Error, { menuId: string }> {
	return useListMutation(guildId, ({ menuId }) =>
		api.post<RoleMenuList>(`/guilds/${guildId}/role-menus/${menuId}/publish`, {}),
	);
}

export function useRemoveRoleMenu(guildId: string): UseMutationResult<RoleMenuList, Error, { menuId: string }> {
	return useListMutation(guildId, ({ menuId }) => api.delete<RoleMenuList>(`/guilds/${guildId}/role-menus/${menuId}`));
}

function useListMutation<Body>(
	guildId: string,
	send: (body: Body) => Promise<RoleMenuList>,
): UseMutationResult<RoleMenuList, Error, Body> {
	return useDocumentMutation(keys.guild(guildId).roleMenus(), send);
}
