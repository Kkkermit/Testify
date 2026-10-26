import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type AnnouncementBody, type AnnouncementSent } from "@testify/shared";
import { api } from "@/lib/api";

export function usePostAnnouncement(guildId: string): UseMutationResult<AnnouncementSent, Error, AnnouncementBody> {
	return useMutation({
		mutationFn: (body: AnnouncementBody) => api.post<AnnouncementSent>(`/guilds/${guildId}/announcements`, body),
	});
}
