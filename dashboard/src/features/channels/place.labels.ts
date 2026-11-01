import { type PlaceRole } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

/** What a feature does in the channel being looked at, in the reader's language. */
export const ROLE_LABELS: Record<PlaceRole, TranslationKey> = {
	posts: "channel.rolePosts",
	logs: "channel.roleLogs",
	panel: "channel.rolePanel",
	lobby: "channel.roleLobby",
	counter: "channel.roleCounter",
	listens: "channel.roleListens",
};
