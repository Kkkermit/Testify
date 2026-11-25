import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { defineEvent } from "@core/event";
import { removeAccess } from "@database/repositories/dashboardAccessRepository";
import { forgetLeaver } from "@lib/birthdays";
import { countMove } from "@lib/info";
import { trackLeave } from "@lib/invites";
import { writeAuditLog } from "@lib/moderation";
import { syncVoiceCounters } from "@lib/settings";
import { sendGoodbye } from "@lib/welcome";

export default defineEvent({
	name: Events.GuildMemberRemove,
	async run(client: TestifyClient, member: GuildMember | PartialGuildMember) {
		countMove(client, member, "leave");

		// Each step stands alone, so a goodbye that fails cannot leave the member's birthday or dashboard access behind.
		const steps: Record<string, () => Promise<unknown>> = {
			auditLog: () =>
				writeAuditLog(client, member.guild, {
					event: "memberLeave",
					title: "Member left",
					tone: "left",
					fields: [
						{ name: "Member", value: `${member.user.username} (\`${member.id}\`)`, inline: true },
						{ name: "Member count", value: String(member.guild.memberCount), inline: true },
					],
					thumbnail: member.user.displayAvatarURL(),
				}),
			goodbye: () => sendGoodbye(client, member),
			birthday: () => forgetLeaver(member.guild.id, member.id),
			dashboardAccess: () => removeAccess(member.guild.id, member.id),
			...(client.featuresOff.has("invites") ? {} : { invites: () => trackLeave(member) }),
			counters: () => syncVoiceCounters(client, member.guild),
		};

		const names = Object.keys(steps);
		const outcomes = await Promise.allSettled(Object.values(steps).map(async (step) => step()));
		outcomes.forEach((outcome, index) => {
			if (outcome.status === "fulfilled") return;
			client.logger.error(
				{ err: toError(outcome.reason), step: names[index], guildId: member.guild.id },
				"[MEMBER_LEAVE] One step of handling a member leaving failed; the others still ran.",
			);
		});
	},
});
