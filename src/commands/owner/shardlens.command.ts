import { defineCommand } from "@core/command";
import { sendShardlensNow, shardlensStatus } from "@lib/bot";
import { embed, reply } from "@lib/discord";
import { discordTime, formatNumber } from "@lib/format";
import { type ShardlensFlush, type ShardlensState, type ShardlensStatus } from "@testify/shared";

const STATES: Record<ShardlensState, string> = {
	off: "Off. Nothing is attached and nothing is sent. Set `SHARDLENS_URL` and `SHARDLENS_INGEST_KEY` to send to a collector you run.",
	dryRun: "A dry run. What would be sent is written to the bot's log instead, and nothing leaves the bot.",
	waiting: "Waiting for the collector to answer. Events wait in memory and go once it does.",
	sending: "Sending every five seconds. User IDs are hashed inside the bot before anything leaves it.",
};

/** Never the key: the status carries none, and the collector is named by its origin. */
export function shardlensEmbed(status: ShardlensStatus, note?: string) {
	const lines = [STATES[status.state]];
	if (note !== undefined) lines.unshift(note, "");
	if (status.collector !== null) lines.push("", `Its dashboard: ${status.collector}`);

	const problem = status.lastProblem;
	return embed({
		category: "owner",
		title: "Shardlens analytics",
		description: lines.join("\n"),
		fields:
			status.state === "off"
				? []
				: [
						{ name: "Mode", value: status.mode ?? "Known once the collector answers", inline: true },
						{ name: "Waiting to send", value: formatNumber(status.queued), inline: true },
						{ name: "Still being answered", value: formatNumber(status.waitingForResponse), inline: true },
						{ name: "Dropped", value: formatNumber(status.dropped), inline: true },
						{ name: "Failed sends", value: formatNumber(status.failedSends), inline: true },
						{
							name: "Last problem",
							value:
								problem === null
									? "None since the bot started"
									: `\`${problem.name}\` ${discordTime(Date.parse(problem.at), "R")}`,
							inline: true,
						},
					],
	});
}

export function sendNote(flushed: ShardlensFlush): string {
	if (flushed.problem !== null) {
		return `Could not send (\`${flushed.problem}\`). It keeps the events and tries again on its own.`;
	}
	if (flushed.sent === 0) return "Nothing was waiting to send.";
	return flushed.status.state === "dryRun" ? "Written to the bot's log." : "Sent what was waiting.";
}

export default defineCommand({
	name: "shardlens",
	description: "Shows how the bot's Shardlens analytics are doing.",
	category: "owner",
	private: true,
	ownerOnly: true,
	subcommands: [
		{
			name: "status",
			description: "Shows whether analytics are on, where they go and what is waiting.",
			async run(interaction, client) {
				await reply(interaction, { embeds: [shardlensEmbed(shardlensStatus(client))] });
			},
		},
		{
			name: "send",
			description: "Sends what is waiting now rather than at the next five-second send.",
			async run(interaction, client) {
				await interaction.deferReply();
				const flushed = await sendShardlensNow(client);
				const status = flushed?.status ?? shardlensStatus(client);
				await reply(interaction, {
					embeds: [shardlensEmbed(status, flushed === null ? undefined : sendNote(flushed))],
				});
			},
		},
	],
});
