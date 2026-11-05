import { type PlaceRole } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

export const ROLE_LABELS: Record<PlaceRole, TranslationKey> = {
	posts: "channel.rolePosts",
	logs: "channel.roleLogs",
	panel: "channel.rolePanel",
	lobby: "channel.roleLobby",
	counter: "channel.roleCounter",
	listens: "channel.roleListens",
};
