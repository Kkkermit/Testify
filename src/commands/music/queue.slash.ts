import { defineCommand } from "@core/command";
import { requireQueue } from "@lib/musicGuards.util";
import { queuePage } from "@lib/musicPanel.util";
import { queueEntriesOf } from "@lib/musicQueue.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "queue",
	description: "Browses the queue.",
	category: "music",
	aliases: ["q"],
	guildOnly: true,

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);

		// The same browser the panel's Queue button opens, so the arrows and the Back
		// button are handled by the one place that knows how to page a queue.
		await reply(interaction, queuePage(queueEntriesOf(queue), 0));
	},
});
