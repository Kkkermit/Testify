import { strings } from "@config/strings";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { deleteProfile, getProfile } from "@database/repositories/profileRepository";
import { embed, reply, successEmbed } from "@lib/discord";
import { discordTime } from "@lib/format";
import { type ProfileProblem, profileProblem, saveOwnProfile } from "@lib/info";
import { PROFILE_LIMITS, profileBody } from "@testify/shared";

const PROBLEM_TEXT: Record<ProfileProblem, string> = {
	profanity: strings.generic.profanity,
	birthday: "Write the birthday as a real date, `YYYY-MM-DD`, no later than today.",
};

export default defineCommand({
	name: "profile",
	description: "Views and edits your public profile.",
	category: "info",
	private: true,
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
				{
					name: "about",
					description: "A short bio.",
					type: "string",
					required: true,
					maxLength: PROFILE_LIMITS.about,
				},
				{
					name: "favourite-song",
					description: "Your favourite song.",
					type: "string",
					required: true,
					maxLength: PROFILE_LIMITS.favouriteSong,
				},
				{
					name: "favourite-game",
					description: "Your favourite game.",
					type: "string",
					maxLength: PROFILE_LIMITS.favouriteGame,
				},
				{ name: "hobbies", description: "What you do for fun.", type: "string", maxLength: PROFILE_LIMITS.hobbies },
				{ name: "birthday", description: "Your birthday, as YYYY-MM-DD.", type: "string" },
			],
			async run(interaction) {
				const parsed = profileBody.safeParse({
					about: interaction.options.getString("about", true),
					favouriteSong: interaction.options.getString("favourite-song", true),
					favouriteGame: interaction.options.getString("favourite-game"),
					hobbies: interaction.options.getString("hobbies"),
					birthday: interaction.options.getString("birthday"),
				});
				if (!parsed.success) throw new UserFacingError("Write a bio and a favourite song, each within its limit.");

				const problem = profileProblem(parsed.data);
				if (problem !== null) throw new UserFacingError(PROBLEM_TEXT[problem]);

				await saveOwnProfile(interaction.user.id, parsed.data);

				await reply(interaction, {
					embeds: [successEmbed("Your profile has been saved.")],
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
				});
			},
		},
	],
});
