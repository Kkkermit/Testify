import { GiveawaysManager } from "discord-giveaways";
import { type TestifyClient } from "@core/client";
import { Giveaway, type GiveawayRecord } from "@database/models/giveaway.schema";

/** Mongo-backed persistence for `discord-giveaways`. */
class MongoGiveawaysManager extends GiveawaysManager {
	protected override async getAllGiveaways(): Promise<never[]> {
		return (await Giveaway.find().lean<GiveawayRecord[]>().exec()) as unknown as never[];
	}

	protected override async saveGiveaway(_messageId: string, data: unknown): Promise<boolean> {
		await Giveaway.create(data as GiveawayRecord);
		return true;
	}

	protected override async editGiveaway(messageId: string, data: unknown): Promise<boolean> {
		await Giveaway.updateOne({ messageId }, data as GiveawayRecord).exec();
		return true;
	}

	protected override async deleteGiveaway(messageId: string): Promise<boolean> {
		await Giveaway.deleteOne({ messageId }).exec();
		return true;
	}
}

let manager: GiveawaysManager | undefined;

export function giveaways(client: TestifyClient): GiveawaysManager {
	manager ??= new MongoGiveawaysManager(client, {
		default: { botsCanWin: false, embedColor: "#5865f2", embedColorEnd: "#2f3136", reaction: "🎉" },
	});
	return manager;
}
