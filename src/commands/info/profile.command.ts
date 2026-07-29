import { MessageFlags } from "discord.js";
import { strings } from "@config/strings";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { deleteProfile, getProfile, saveProfile } from "@database/repositories/profileRepository";
import { containsProfanity } from "@lib/contentFilter.util";
import { embed, successEmbed } from "@lib/embeds.util";
import { discordTime } from "@lib/format.util";
import { reply } from "@lib/reply.util";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export default defineCommand({
	name: "profile",
	description: "Views and edits your public profile.",
	category: "info",
	subcommands: [
		{
			name: "view",
			description: "Look at a profile.",
			options: [{ name: "user", description: "Whose profile. Defaults to you.", type: "user" }],
			async run(interaction) {
				const target = interaction.options.getUser("user") ?? interaction.user;
				const profile = await getProfile(target.id);
				if (!profile) throw new UserFacingError(`${target.username} has not set up a profile yet.`);

				await reply(interaction, {
					embeds: [
						embed({
							category: "info",
							title: `${target.displayName}'s profile`,
							description: profile.about,
							fields: [
								{ name: "Favourite song", value: profile.favouriteSong, inline: true },
								{ name: "Favourite game", value: profile.favouriteGame ?? "Not set", inline: true },
								{ name: "Hobbies", value: profile.hobbies ?? "Not set", inline: true },
								{
									name: "Birthday",
									value: profile.birthday !== null ? discordTime(profile.birthday, "D") : "Not set",
									inline: true,
								},
								{ name: "Profile created", value: discordTime(profile.createdAt, "R"), inline: true },
							],
							thumbnail: target.displayAvatarURL({ size: 512 }),
						}),
					],
				});
			},
		},
		{
			name: "set",
			description: "Create or update your profile.",
			options: [
				{ name: "about", description: "A short bio.", type: "string", required: true, maxLength: 500 },
				{ name: "favourite-song", description: "Your favourite song.", type: "string", required: true, maxLength: 100 },
				{ name: "favourite-game", description: "Your favourite game.", type: "string", maxLength: 100 },
				{ name: "hobbies", description: "What you do for fun.", type: "string", maxLength: 200 },
				{ name: "birthday", description: "Your birthday, as YYYY-MM-DD.", type: "string" },
			],
			async run(interaction) {
				const about = interaction.options.getString("about", true);
				const song = interaction.options.getString("favourite-song", true);
				const game = interaction.options.getString("favourite-game");
				const hobbies = interaction.options.getString("hobbies");
				const rawBirthday = interaction.options.getString("birthday");

				for (const value of [about, song, game, hobbies]) {
					if (value !== null && containsProfanity(value)) throw new UserFacingError(strings.generic.profanity);
				}

				let birthday: Date | null = null;
				if (rawBirthday !== null) {
					if (!DATE_PATTERN.test(rawBirthday)) throw new UserFacingError("Write the birthday as `YYYY-MM-DD`.");
					birthday = new Date(`${rawBirthday}T00:00:00Z`);
					if (Number.isNaN(birthday.getTime())) throw new UserFacingError("That is not a real date.");
				}

				await saveProfile(interaction.user.id, {
					about,
					favouriteSong: song,
					favouriteGame: game,
					hobbies,
					birthday,
				});

				await reply(interaction, {
					embeds: [successEmbed("Your profile has been saved.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "delete",
			description: "Delete your profile.",
			async run(interaction) {
				const removed = await deleteProfile(interaction.user.id);
				if (!removed) throw new UserFacingError("You do not have a profile to delete.");

				await reply(interaction, {
					embeds: [successEmbed("Your profile has been deleted.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
