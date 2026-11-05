import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type EraseAccountRequest } from "@testify/shared";
import { api } from "@/lib/api";

export function useEraseAccount(): UseMutationResult<void, Error, EraseAccountRequest> {
	return useMutation({ mutationFn: (body) => api.post<void>("/auth/erase", body) });
}
