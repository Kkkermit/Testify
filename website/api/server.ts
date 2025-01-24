import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

app.use(cors());
app.use(express.json());

let cachedStats = {
	servers: 0,
	users: 0,
	lastUpdated: Date.now(),
};

const updateCache = async () => {
	if (client.isReady()) {
		const guilds = await client.guilds.fetch();
		let totalUsers = 0;

		for (const guild of guilds.values()) {
			const fullGuild = await guild.fetch();
			totalUsers += fullGuild.memberCount;
		}

		cachedStats = {
			servers: guilds.size,
			users: totalUsers,
			lastUpdated: Date.now(),
		};
	}
};

app.get("/api/stats", async (_, res) => {
	res.json(cachedStats);
});

app.get("/api/bot", async (_, res) => {
	if (!client.user) return res.status(500).json({ error: "Bot not ready" });

	const commands = await client.application?.commands.fetch();

	res.json({
		name: client.user.username,
		tag: `${client.user.username}#${client.user.discriminator}`,
		avatar: client.user.displayAvatarURL(),
		verified: client.user.verified,
		createdAt: client.user.createdAt,
		commandCount: commands?.size || 0,
		clientId: client.user.id,
	});
});

client.once("ready", () => {
	console.log("Bot is ready!");
	client.user?.setStatus("dnd");
	updateCache();
	setInterval(updateCache, 300000);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
	console.log(`API running on port ${PORT}`);
	client.login(process.env.DISCORD_TOKEN);
});
