import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type TestPost } from "@testify/shared";
import { api } from "@/lib/api";

export function useSendTest(guildId: string): UseMutationResult<void, Error, TestPost> {
	return useMutation({ mutationFn: (test: TestPost) => api.post<void>(`/guilds/${guildId}/test-post`, test) });
}
