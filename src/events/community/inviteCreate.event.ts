import { Events } from "discord.js";
import { defineEvent } from "@core/event";
import { rememberInvite } from "@lib/invites";

export default defineEvent({
	name: Events.InviteCreate,
	run(_client, invite) {
		rememberInvite(invite);
	},
});
