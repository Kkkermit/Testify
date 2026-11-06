import { Events } from "discord.js";
import { defineEvent } from "@core/event";
import { forgetInvite } from "@lib/invites";

export default defineEvent({
	name: Events.InviteDelete,
	run(_client, invite) {
		forgetInvite(invite);
	},
});
