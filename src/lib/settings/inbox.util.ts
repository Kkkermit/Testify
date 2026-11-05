import { type Guild, PermissionFlagsBits } from "discord.js";
import { type TestifyClient } from "@core/client";
import { listIdeas } from "@database/repositories/ideaRepository";
import { listOpenTickets } from "@database/repositories/ticketRepository";
import { canPostInChannel } from "@lib/discord/channels.util";
import { placesOf } from "@lib/settings/featureStatus.util";
import { nameOf } from "@lib/tickets/openTickets.util";
import {
	type FeaturePlaces,
	type GuildInbox,
	INBOX_LIMITS,
	type InboxChannelProblem,
	type PlaceRole,
	WATCHED_PERMISSIONS,
	type WatchedPermission,
} from "@testify/shared";

/** What needs a manager in one server, read from what each feature already stores; nothing new is kept. */

/** The places where the bot itself has to post; a lobby or a counter needs other permissions, named elsewhere. */
const POSTS: readonly PlaceRole[] = ["posts", "logs", "panel"];

/** Permissions Discord can revoke silently, named so a manager can act on them. */
export function missingPermissions(guild: Guild): WatchedPermission[] {
	const me = guild.members.me;
	if (me === null) return [];

	return WATCHED_PERMISSIONS.filter((flag) => !me.permissions.has(PermissionFlagsBits[flag]));
}

/** A switched-on feature pointing at a channel that is gone, or one the bot cannot post in, once per channel. */
export function channelProblems(guild: Guild, features: FeaturePlaces[]): InboxChannelProblem[] {
	return features
		.filter((feature) => feature.enabled)
		.flatMap((feature) => {
			const ids = new Set(feature.places.filter((place) => POSTS.includes(place.role)).map((place) => place.channelId));

			return [...ids].flatMap<InboxChannelProblem>((channelId) => {
				const channel = guild.channels.cache.get(channelId);
				const at = { feature: feature.key as InboxChannelProblem["feature"], label: feature.label, channelId };
				if (channel === undefined) return [{ ...at, problem: "missing" }];
				return canPostInChannel(guild, channel) ? [] : [{ ...at, problem: "cannotPost" }];
			});
		});
}

export async function readInbox(client: TestifyClient, guild: Guild): Promise<GuildInbox> {
	const [features, open, ideas] = await Promise.all([
		placesOf(guild),
		listOpenTickets(guild.id),
		listIdeas(guild.id, "open", { skip: 0, limit: INBOX_LIMITS.shown }),
	]);
	const waiting = open.filter((ticket) => ticket.claimedById === null);

	return {
		tickets: {
			total: waiting.length,
			items: await Promise.all(
				waiting.slice(0, INBOX_LIMITS.shown).map(async (ticket) => ({
					channelId: ticket.channelId,
					ticketId: ticket.ticketId,
					ownerName: await nameOf(client, guild, ticket.ownerId),
					openedAt: ticket.createdAt.toISOString(),
				})),
			),
		},
		ideas: {
			total: ideas.total,
			items: ideas.items.map((idea) => ({
				id: idea.id,
				number: idea.number,
				text: idea.text,
				authorName: idea.authorName,
				up: idea.upVoters.length,
				down: idea.downVoters.length,
				createdAt: idea.createdAt.toISOString(),
			})),
		},
		permissions: missingPermissions(guild),
		channels: channelProblems(guild, features),
	};
}
