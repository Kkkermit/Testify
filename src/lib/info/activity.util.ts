import { type ActivityBatch } from "@database/repositories/insightsRepository";
import { dayKey } from "@database/repositories/usageRepository";

/** Message counts held in memory and written in one batch, so a busy server costs no write per message. */
export class ActivityCounter {
	#servers = new Map<string, { guildId: string; day: string; messages: number; hours: Record<string, number> }>();
	#channels = new Map<string, { guildId: string; day: string; channelId: string; messages: number }>();
	#members = new Map<string, { guildId: string; day: string; userId: string; messages: number }>();

	count(message: { guildId: string; channelId: string; userId: string }, at: Date = new Date()): void {
		const { guildId, channelId, userId } = message;
		const day = dayKey(at);
		const hour = String(at.getUTCHours());

		const serverKey = `${guildId}:${day}`;
		const server = this.#servers.get(serverKey) ?? { guildId, day, messages: 0, hours: {} };
		server.messages += 1;
		server.hours[hour] = (server.hours[hour] ?? 0) + 1;
		this.#servers.set(serverKey, server);

		const channelKey = `${guildId}:${day}:${channelId}`;
		this.#channels.set(channelKey, {
			guildId,
			day,
			channelId,
			messages: (this.#channels.get(channelKey)?.messages ?? 0) + 1,
		});

		const memberKey = `${guildId}:${day}:${userId}`;
		this.#members.set(memberKey, {
			guildId,
			day,
			userId,
			messages: (this.#members.get(memberKey)?.messages ?? 0) + 1,
		});
	}

	/** Hands over everything counted so far and starts again from zero. */
	drain(): ActivityBatch {
		const batch = {
			servers: [...this.#servers.values()],
			channels: [...this.#channels.values()],
			members: [...this.#members.values()],
		};
		this.#servers = new Map();
		this.#channels = new Map();
		this.#members = new Map();
		return batch;
	}

	/** Puts a batch that failed to save back, so a database blip delays the counts rather than losing them. */
	restore(batch: ActivityBatch): void {
		for (const server of batch.servers) {
			const current = this.#servers.get(`${server.guildId}:${server.day}`);
			const hours = { ...server.hours };
			for (const [hour, count] of Object.entries(current?.hours ?? {})) hours[hour] = (hours[hour] ?? 0) + count;
			this.#servers.set(`${server.guildId}:${server.day}`, {
				...server,
				messages: server.messages + (current?.messages ?? 0),
				hours,
			});
		}
		for (const channel of batch.channels) {
			const key = `${channel.guildId}:${channel.day}:${channel.channelId}`;
			this.#channels.set(key, { ...channel, messages: channel.messages + (this.#channels.get(key)?.messages ?? 0) });
		}
		for (const member of batch.members) {
			const key = `${member.guildId}:${member.day}:${member.userId}`;
			this.#members.set(key, { ...member, messages: member.messages + (this.#members.get(key)?.messages ?? 0) });
		}
	}
}

export const activity = new ActivityCounter();
