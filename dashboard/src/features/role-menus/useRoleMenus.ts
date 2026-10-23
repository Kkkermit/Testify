import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { type RoleMenuBody, type RoleMenuList } from "@testify/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export function useRoleMenus(guildId: string): UseQueryResult<RoleMenuList> {
	return useQuery({
		queryKey: keys.guild(guildId).roleMenus(),
		queryFn: () => api.get<RoleMenuList>(`/guilds/${guildId}/role-menus`),
	});
}

/** Not optimistic: a menu is a message the bot posts, and every answer is the whole list. */
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
	const client = useQueryClient();
	const key = keys.guild(guildId).roleMenus();

	return useMutation({
		mutationKey: key,
		mutationFn: send,
		onSuccess: (list) => {
			if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, list);
		},
		// A refused change to a posted menu is still saved, so the list is read again whatever the answer.
		onSettled: () => {
			if (client.isMutating({ mutationKey: key }) !== 1) return;
			void client.invalidateQueries({ queryKey: key });
		},
	});
}
